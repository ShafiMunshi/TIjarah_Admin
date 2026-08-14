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

export interface AudienceSegmentDefinition {
  id: TargetAudience;
  name: string;
  description: string;
  estimatedCount: number;
  icon: string;
  category: 'tier' | 'activity' | 'platform' | 'behavior';
}
