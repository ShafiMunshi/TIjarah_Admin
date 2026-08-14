export type AdminRole = 'super_admin' | 'app_manager' | 'marketing_admin';

export type Permission =
  // User Management Permissions
  | 'users:view'
  | 'users:edit'
  | 'users:manage_subscription'
  | 'users:delete'
  | 'users:export'
  
  // Marketing & Push Notification Permissions
  | 'fcm:compose'
  | 'fcm:broadcast'
  | 'fcm:view_campaigns'
  | 'fcm:manage_segments'
  
  // Crashlytics & Operational Metrics
  | 'crashlytics:view'
  | 'crashlytics:manage_issues'
  | 'analytics:app_health'
  | 'analytics:financial'
  
  // Admin & System Permissions
  | 'admins:view'
  | 'admins:manage_roles'
  | 'admins:set_claims'
  | 'audit:view_full'
  | 'audit:view_limited'
  | 'settings:manage';

export interface RoleDefinition {
  id: AdminRole;
  displayName: string;
  badgeLabel: string;
  colorScheme: 'purple' | 'blue' | 'amber';
  description: string;
  permissions: Permission[];
  restrictedNotice: string;
}

export const ROLE_DEFINITIONS: Record<AdminRole, RoleDefinition> = {
  super_admin: {
    id: 'super_admin',
    displayName: 'Super Admin',
    badgeLabel: 'Full System Access',
    colorScheme: 'purple',
    description: 'Unrestricted access to all admin console features, user management, financial KPIs, marketing broadcasts, and role delegation.',
    permissions: [
      'users:view',
      'users:edit',
      'users:manage_subscription',
      'users:delete',
      'users:export',
      'fcm:compose',
      'fcm:broadcast',
      'fcm:view_campaigns',
      'fcm:manage_segments',
      'crashlytics:view',
      'crashlytics:manage_issues',
      'analytics:app_health',
      'analytics:financial',
      'admins:view',
      'admins:manage_roles',
      'admins:set_claims',
      'audit:view_full',
      'settings:manage',
    ],
    restrictedNotice: 'No restrictions. You hold root administrative privileges.',
  },
  app_manager: {
    id: 'app_manager',
    displayName: 'App Manager / Product Manager',
    badgeLabel: 'User & App Operations',
    colorScheme: 'blue',
    description: 'Inspect and manage user profiles, upgrade premium subscriptions, monitor Crashlytics & app health. Restricted from marketing broadcasts and financial revenue.',
    permissions: [
      'users:view',
      'users:edit',
      'users:manage_subscription',
      'crashlytics:view',
      'crashlytics:manage_issues',
      'analytics:app_health',
      'audit:view_limited',
    ],
    restrictedNotice: 'Restricted from FCM marketing push notifications, financial revenue metrics, and admin role assignments.',
  },
  marketing_admin: {
    id: 'marketing_admin',
    displayName: 'Marketing Admin',
    badgeLabel: 'FCM & Growth Campaigns',
    colorScheme: 'amber',
    description: 'Create, schedule, and broadcast FCM push notifications to segmented audiences. Restricted from sensitive user profile data, user lists, and premium subscription metrics.',
    permissions: [
      'fcm:compose',
      'fcm:broadcast',
      'fcm:view_campaigns',
      'fcm:manage_segments',
      'audit:view_limited',
    ],
    restrictedNotice: 'Restricted from viewing user lists, email addresses, subscription records, and crashlytics.',
  },
};

export interface DecodedCustomClaims {
  role: AdminRole;
  permissions?: Permission[];
  adminSince?: string;
  department?: string;
  securityClearance?: 'tier_1' | 'tier_2' | 'tier_3';
  [key: string]: any;
}

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: AdminRole;
  customClaims: DecodedCustomClaims;
  status: 'active' | 'suspended';
  lastLogin: string;
  createdAt: string;
}
