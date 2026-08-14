export type AuditActionType =
  | 'user_subscription_changed'
  | 'user_status_updated'
  | 'user_profile_edited'
  | 'user_deleted'
  | 'fcm_broadcast_dispatched'
  | 'fcm_campaign_created'
  | 'fcm_campaign_cancelled'
  | 'admin_role_assigned'
  | 'admin_custom_claims_updated'
  | 'admin_invited'
  | 'crash_issue_status_updated'
  | 'security_rules_simulated';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditActionType;
  actor: {
    uid: string;
    displayName: string;
    email: string;
    role: string;
  };
  targetResource: {
    type: 'user' | 'campaign' | 'admin' | 'crash_issue' | 'system';
    id: string;
    name?: string;
  };
  description: string;
  changes?: {
    before?: any;
    after?: any;
  };
  ipAddress: string;
  userAgent?: string;
}
