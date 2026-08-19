export type TargetAudience = 
  | 'all_users' 
  | 'announcements'
  | 'role_owner'
  | 'role_cashier'
  | 'pro_subscribers' 
  | 'enterprise_accounts' 
  | 'inactive_7_days' 
  | 'ios_users' 
  | 'android_users'
  | 'high_value_spenders'
  | 'user_direct'
  | 'business_direct';

export type NotificationPriority = 'normal' | 'high';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent_to_fcm' | 'completed' | 'failed' | 'cancelled';

export interface NotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  deepLink?: string;
  route?: string; // e.g. "/products", "due-book", "/app-access"
  url?: string; // e.g. "https://tijarah.app/news"
  arguments?: string | Record<string, any>; // JSON string e.g. '{"filter": "unpaid"}'
  action?: string; // e.g. "force_update", "promotion", "announcement"
  targetTopicOrToken?: string; // e.g. "/topics/all_users"
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
  audienceEstimatedCount?: number;
  status: CampaignStatus;
  priority: NotificationPriority;
  sound: 'default' | 'alert' | 'silent';
  createdAt: string;
  scheduledFor?: string;
  sentAt?: string;
  fcmAccepted?: boolean;
  fcmMessageId?: string;
  fcmError?: string;
  createdBy: {
    adminId: string;
    adminName: string;
    adminRole: string;
  };
  metrics?: {
    totalSent: number;
    fcmAcceptedCount?: number;
    deliveredCount?: number;
    openedCount?: number;
    clickedCount?: number;
    failedCount: number;
    deliveryRatePct?: number;
    openRatePct?: number;
  };
}

/**
 * Google FCM v1 Wire Format
 */
export interface FcmV1MessagePayload {
  message: {
    topic?: string;
    token?: string;
    condition?: string;
    notification?: {
      title?: string;
      body?: string;
      image?: string;
    };
    data?: Record<string, string>;
    android?: {
      collapse_key?: string;
      priority?: 'NORMAL' | 'HIGH' | 'normal' | 'high';
      ttl?: string;
      notification?: {
        title?: string;
        body?: string;
        icon?: string;
        color?: string;
        sound?: string;
        tag?: string;
        click_action?: string;
        clickAction?: string;
        channel_id?: string;
        channelId?: string;
        image?: string;
        imageUrl?: string;
      };
    };
    apns?: {
      headers?: Record<string, string>;
      payload?: {
        aps?: {
          alert?: {
            title?: string;
            body?: string;
          };
          badge?: number;
          sound?: string;
          content_available?: number;
          category?: string;
        };
      };
      fcm_options?: {
        image?: string;
      };
      fcmOptions?: {
        imageUrl?: string;
      };
    };
    webpush?: {
      headers?: Record<string, string>;
      data?: Record<string, string>;
      notification?: Record<string, any>;
    };
    fcm_options?: {
      analytics_label?: string;
    };
  };
  validate_only?: boolean;
}
