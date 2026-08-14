import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from './firebaseClient';
import type { AppUser, SubscriptionTier } from '../types/users';
import { mockService } from './mockService';

export class FirestoreService {
  /**
   * Helper to normalize Firestore document data into standard AppUser
   */
  private normalizeUserDoc(id: string, data: any): AppUser {
    // Helper to format timestamps to ISO strings
    const parseDate = (val: any): string | null => {
      if (!val) return null;
      if (typeof val === 'string') return val;
      if (val instanceof Timestamp) return val.toDate().toISOString();
      if (val.toDate && typeof val.toDate === 'function') return val.toDate().toISOString();
      if (val.seconds) return new Date(val.seconds * 1000).toISOString();
      return new Date(val).toISOString();
    };

    // Check expireAt, expiresAt, or tierExpiresAt
    const rawExpire = data.expireAt || data.expiresAt || data.tierExpiresAt || null;
    const formattedExpire = parseDate(rawExpire);

    return {
      id: id,
      name: data.name || data.displayName || 'Unnamed User',
      email: data.email || 'no-email@tijarah.app',
      phoneNumber: data.phoneNumber || data.phone || '',
      avatarUrl:
        data.avatarUrl ||
        data.photoURL ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name || id)}`,
      tier: (data.tier || data.subscriptionTier || 'free').toLowerCase() as SubscriptionTier,
      tierExpiresAt: formattedExpire,
      expireAt: formattedExpire,
      expiresAt: formattedExpire,
      autoRenew: Boolean(data.autoRenew),
      status: data.status || 'active',
      joinedAt: parseDate(data.joinedAt || data.createdAt) || new Date().toISOString(),
      lastActiveAt: parseDate(data.lastActiveAt || data.updatedAt) || new Date().toISOString(),
      devicesCount: Number(data.devicesCount || 1),
      ordersCount: Number(data.ordersCount || 0),
      totalSpent: Number(data.totalSpent || 0),
      fcmTokenCount: Number(data.fcmTokenCount || 0),
      country: data.country || 'Global',
      notes: data.notes || '',
      storageQuotaMb: Number(data.storageQuotaMb || 1024),
      usedStorageMb: Number(data.usedStorageMb || 0),
    };
  }

  /**
   * Fetch all users from Firestore (or fallback to mockService if offline)
   */
  public async getUsers(): Promise<{ users: AppUser[]; isLiveFirestore: boolean }> {
    const db = getDb();
    if (!db || !isFirebaseConfigured()) {
      return {
        users: mockService.getUsers(),
        isLiveFirestore: false,
      };
    }

    try {
      const usersCol = collection(db, 'users');
      const snapshot = await getDocs(usersCol);

      if (snapshot.empty) {
        return {
          users: mockService.getUsers(),
          isLiveFirestore: true,
        };
      }

      const users: AppUser[] = [];
      snapshot.forEach((docSnap) => {
        users.push(this.normalizeUserDoc(docSnap.id, docSnap.data()));
      });

      return {
        users,
        isLiveFirestore: true,
      };
    } catch (err) {
      console.warn('Firestore fetch failed, falling back to local service:', err);
      return {
        users: mockService.getUsers(),
        isLiveFirestore: false,
      };
    }
  }

  /**
   * Update a user document in Firestore, explicitly updating expireAt / tierExpiresAt
   */
  public async updateUser(
    userId: string,
    updates: Partial<AppUser>,
    actor: { uid: string; displayName: string; email: string; role: string }
  ): Promise<AppUser> {
    const db = getDb();

    // Prepare clean payload for Firestore
    const payload: any = {
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    };

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.phoneNumber !== undefined) payload.phoneNumber = updates.phoneNumber;
    if (updates.tier !== undefined) payload.tier = updates.tier;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.storageQuotaMb !== undefined) payload.storageQuotaMb = updates.storageQuotaMb;

    // Handle expireAt / tierExpiresAt
    if (updates.tierExpiresAt !== undefined || updates.expireAt !== undefined) {
      const expireVal = updates.tierExpiresAt || updates.expireAt;
      if (expireVal) {
        const dateObj = new Date(expireVal);
        payload.expireAt = Timestamp.fromDate(dateObj);
        payload.expiresAt = Timestamp.fromDate(dateObj);
        payload.tierExpiresAt = Timestamp.fromDate(dateObj);
      } else {
        payload.expireAt = null;
        payload.expiresAt = null;
        payload.tierExpiresAt = null;
      }
    }

    if (db && isFirebaseConfigured()) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, payload);

        // Also log to audit collection in Firestore
        try {
          const auditRef = collection(db, 'audit_logs');
          await setDoc(doc(auditRef), {
            action: 'user_profile_edited',
            timestamp: serverTimestamp(),
            actor,
            targetResource: { type: 'user', id: userId, name: updates.name },
            description: `Updated user profile and expireAt in Firestore for ${updates.name || userId}`,
            changes: { after: updates },
          });
        } catch (auditErr) {
          console.warn('Audit log write failed in Firestore:', auditErr);
        }
      } catch (err) {
        console.error('Error writing to Firestore user document:', err);
        throw err;
      }
    }

    // Also update local mock state for synchronization
    return mockService.updateUser(userId, updates, actor);
  }

  /**
   * Subscribe to real-time updates from Firestore 'users' collection
   */
  public subscribeToUsers(onUpdate: (users: AppUser[]) => void): () => void {
    const db = getDb();
    if (!db || !isFirebaseConfigured()) {
      return () => {};
    }

    try {
      const usersCol = collection(db, 'users');
      const unsubscribe = onSnapshot(
        usersCol,
        (snapshot) => {
          const users: AppUser[] = [];
          snapshot.forEach((docSnap) => {
            users.push(this.normalizeUserDoc(docSnap.id, docSnap.data()));
          });
          if (users.length > 0) {
            onUpdate(users);
          }
        },
        (error) => {
          console.error('Firestore onSnapshot error on users:', error);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn('Failed to attach onSnapshot listener:', e);
      return () => {};
    }
  }

  /**
   * Seed connected Firestore project with initial users data
   */
  public async seedFirestoreWithInitialUsers(): Promise<{ count: number }> {
    const db = getDb();
    if (!db || !isFirebaseConfigured()) {
      throw new Error('Firebase is not configured. Please enter your Firebase configuration keys.');
    }

    const batch = writeBatch(db);
    const usersToSeed = mockService.getUsers();

    for (const u of usersToSeed) {
      const userRef = doc(db, 'users', u.id);
      batch.set(userRef, {
        name: u.name,
        email: u.email,
        phoneNumber: u.phoneNumber,
        avatarUrl: u.avatarUrl,
        tier: u.tier,
        expireAt: u.tierExpiresAt ? Timestamp.fromDate(new Date(u.tierExpiresAt)) : null,
        expiresAt: u.tierExpiresAt ? Timestamp.fromDate(new Date(u.tierExpiresAt)) : null,
        tierExpiresAt: u.tierExpiresAt ? Timestamp.fromDate(new Date(u.tierExpiresAt)) : null,
        autoRenew: u.autoRenew,
        status: u.status,
        joinedAt: Timestamp.fromDate(new Date(u.joinedAt)),
        lastActiveAt: Timestamp.fromDate(new Date(u.lastActiveAt)),
        devicesCount: u.devicesCount,
        ordersCount: u.ordersCount,
        totalSpent: u.totalSpent,
        fcmTokenCount: u.fcmTokenCount,
        country: u.country,
        notes: u.notes || '',
        storageQuotaMb: u.storageQuotaMb,
        usedStorageMb: u.usedStorageMb,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return { count: usersToSeed.length };
  }
}

export const firestoreService = new FirestoreService();
