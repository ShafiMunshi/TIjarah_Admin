export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type AccountStatus = 'active' | 'pending' | 'suspended' | 'flagged';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  tier: SubscriptionTier;
  // Supports both ISO string or Timestamp representation
  tierExpiresAt: string | null;
  expireAt?: string | null; // Firestore field alias
  expiresAt?: string | null; // Firestore field alias
  autoRenew: boolean;
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
  tier: 'all' | SubscriptionTier;
  status: 'all' | AccountStatus;
  sortBy: 'joinedAt' | 'lastActiveAt' | 'totalSpent' | 'name' | 'tierExpiresAt';
  sortOrder: 'asc' | 'desc';
  page: number;
  perPage: number;
}

export interface UserStats {
  totalUsers: number;
  activeProUsers: number;
  activeEnterpriseUsers: number;
  freeUsers: number;
  suspendedUsers: number;
  churnRatePct: number;
}
