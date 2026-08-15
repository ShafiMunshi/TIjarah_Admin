export type TargetAudience = 
  | 'all_users' 
  | 'pro_subscribers' 
  | 'enterprise_accounts' 
  | 'inactive_7_days' 
  | 'ios_users' 
  | 'android_users'
  | 'high_value_spenders';

export type NotificationPriority = 'normal' | 'high';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';

export interface NotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  deepLink?: string;
  category?: string;
  priority: NotificationPriority;
  sound: 'default' | 'alert' | 'silent';
  badgeCount?: number;
  dataPayload?: Record<string, string>;
}

export interface NotificationCampaign {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  deepLink?: string;
  audience: TargetAudience;
  audienceEstimatedCount: number;
  status: CampaignStatus;
  priority: NotificationPriority;
  sound: 'default' | 'alert' | 'silent';
  createdAt: string;
  scheduledFor?: string;
  sentAt?: string;
  createdBy: {
    adminId: string;
    adminName: string;
    adminRole: string;
  };
  metrics: {
    totalSent: number;
    deliveredCount: number;
    openedCount: number;
    clickedCount: number;
    failedCount: number;
    deliveryRatePct: number;
    openRatePct: number;
  };
}

export interface AudienceSegmentOption {
  id: TargetAudience;
  name: string;
  label: string;
  description: string;
  estimatedCount: number;
}

export const AUDIENCE_SEGMENTS: AudienceSegmentOption[] = [
  {
    id: 'all_users',
    name: 'All Registered App Users',
    label: 'All Active Devices',
    description: 'Broadcast to all registered FCM device tokens in the system',
    estimatedCount: 142850,
  },
  {
    id: 'pro_subscribers',
    name: 'Pro Tier Subscribers',
    label: 'Pro & Growth Tier Users',
    description: 'Subscribed merchants with active recurring memberships',
    estimatedCount: 42300,
  },
  {
    id: 'enterprise_accounts',
    name: 'Enterprise VIP Accounts',
    label: 'Enterprise Key Accounts',
    description: 'Large vendor fleets & multi-store retail operators',
    estimatedCount: 5400,
  },
  {
    id: 'inactive_7_days',
    name: 'Dormant Accounts (7d+)',
    label: 'Inactive (7+ Days)',
    description: 'Re-engagement segment for users dormant over the past week',
    estimatedCount: 18900,
  },
  {
    id: 'ios_users',
    name: 'iOS APNs Clients',
    label: 'Apple iOS Devices (APNs)',
    description: 'Direct Apple Push Notification service token holders',
    estimatedCount: 88400,
  },
  {
    id: 'android_users',
    name: 'Android FCM Clients',
    label: 'Google Android Devices',
    description: 'Direct Google Play Services FCM channel devices',
    estimatedCount: 54450,
  },
];

export interface AudienceSegmentDefinition {
  id: TargetAudience;
  name: string;
  description: string;
  estimatedCount: number;
  icon: string;
  category: 'tier' | 'activity' | 'platform' | 'behavior';
}
