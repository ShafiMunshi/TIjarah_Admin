export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type AccountStatus = 'active' | 'pending' | 'suspended' | 'flagged';

export interface AppUser {
  id: string;
  // Exact Firestore fields from 'USERS' collection
  firstName: string;
  lastName: string;
  name: string; // computed helper (firstName + lastName)
  email: string;
  phone: string;
  phoneNumber?: string; // alias
  avatarUrl: string;
  
  // Premium & Subscription
  is_premium: number; // 1 = premium, 0 = free
  tier: SubscriptionTier; // mapped helper
  expire_date: string; // exact Firestore field e.g. "2027-11-12"
  tierExpiresAt: string | null; // normalized ISO string
  expireAt?: string | null;
  expiresAt?: string | null;
  autoRenew?: boolean;
  
  // Quotas & Verification
  messageRemaining: number; // exact Firestore field
  pinCode?: string; // exact Firestore field
  isVerified: boolean; // exact Firestore field
  role: number; // exact Firestore field (e.g. 0)
  
  // Secondary metadata
  status: AccountStatus;
  joinedAt: string;
  lastActiveAt: string;
  devicesCount: number;
  ordersCount: number;
  totalSpent: number;
  fcmTokenCount: number;
  country: string;
  notes?: string;
  storageQuotaMb: number;
  usedStorageMb: number;
}

export interface UserFilters {
  searchQuery: string;
  tier: 'all' | 'premium' | 'free';
  status: 'all' | AccountStatus;
  sortBy: 'joinedAt' | 'lastActiveAt' | 'messageRemaining' | 'name' | 'expire_date';
  sortOrder: 'asc' | 'desc';
  page: number;
  perPage: number;
}
