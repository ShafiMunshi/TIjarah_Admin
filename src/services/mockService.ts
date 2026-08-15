import type { AdminUser, AdminRole, Permission } from '../types/auth';
import { ROLE_DEFINITIONS } from '../types/auth';
import type { AppUser } from '../types/users';
import type { NotificationCampaign, TargetAudience, NotificationPriority } from '../types/notifications';
import type { CrashIssue, CrashStatus } from '../types/crashlytics';
import type { AuditLogEntry, AuditActionType } from '../types/audit';
import {
  INITIAL_ADMINS,
  INITIAL_USERS,
  INITIAL_CAMPAIGNS,
  INITIAL_CRASH_ISSUES,
  INITIAL_AUDIT_LOGS,
} from './mockData';

class MockService {
  private adminsKey = 'tijarah_admins_v1';
  private usersKey = 'tijarah_users_v1';
  private campaignsKey = 'tijarah_campaigns_v1';
  private crashesKey = 'tijarah_crashes_v1';
  private auditKey = 'tijarah_audit_v1';

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    if (!localStorage.getItem(this.adminsKey)) {
      localStorage.setItem(this.adminsKey, JSON.stringify(INITIAL_ADMINS));
    }
    if (!localStorage.getItem(this.usersKey)) {
      localStorage.setItem(this.usersKey, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(this.campaignsKey)) {
      localStorage.setItem(this.campaignsKey, JSON.stringify(INITIAL_CAMPAIGNS));
    }
    if (!localStorage.getItem(this.crashesKey)) {
      localStorage.setItem(this.crashesKey, JSON.stringify(INITIAL_CRASH_ISSUES));
    }
    if (!localStorage.getItem(this.auditKey)) {
      localStorage.setItem(this.auditKey, JSON.stringify(INITIAL_AUDIT_LOGS));
    }
  }

  // --- Audit Logger ---
  public logAudit(
    action: AuditActionType,
    actor: { uid: string; displayName: string; email: string; role: string },
    target: { type: 'user' | 'campaign' | 'admin' | 'crash_issue' | 'system'; id: string; name?: string },
    description: string,
    changes?: { before?: any; after?: any }
  ) {
    const logs = this.getAuditLogs();
    const newEntry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      actor,
      targetResource: target,
      description,
      changes,
      ipAddress: '192.168.1.' + Math.floor(Math.random() * 200 + 10),
    };
    logs.unshift(newEntry);
    localStorage.setItem(this.auditKey, JSON.stringify(logs.slice(0, 100)));
    return newEntry;
  }

  public getAuditLogs(): AuditLogEntry[] {
    try {
      const data = localStorage.getItem(this.auditKey);
      return data ? JSON.parse(data) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  // --- Admins & Custom Claims ---
  public getAdmins(): AdminUser[] {
    try {
      const data = localStorage.getItem(this.adminsKey);
      return data ? JSON.parse(data) : INITIAL_ADMINS;
    } catch {
      return INITIAL_ADMINS;
    }
  }

  public getAdminById(uid: string): AdminUser | undefined {
    return this.getAdmins().find((a) => a.uid === uid);
  }

  public updateAdminRoleAndClaims(
    targetUid: string,
    newRole: AdminRole,
    customPermissions: Permission[],
    actor: { uid: string; displayName: string; email: string; role: string }
  ): AdminUser {
    const admins = this.getAdmins();
    const idx = admins.findIndex((a) => a.uid === targetUid);
    if (idx === -1) throw new Error('Admin user not found');

    const before = { role: admins[idx].role, permissions: admins[idx].customClaims.permissions };
    const roleDef = ROLE_DEFINITIONS[newRole];

    admins[idx].role = newRole;
    admins[idx].customClaims = {
      ...admins[idx].customClaims,
      role: newRole,
      permissions: customPermissions.length > 0 ? customPermissions : [...roleDef.permissions],
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(this.adminsKey, JSON.stringify(admins));

    this.logAudit(
      'admin_custom_claims_updated',
      actor,
      { type: 'admin', id: targetUid, name: admins[idx].displayName },
      `Updated role & custom claims for ${admins[idx].displayName} to ${newRole}`,
      { before, after: { role: newRole, permissions: admins[idx].customClaims.permissions } }
    );

    return admins[idx];
  }

  public createAdmin(
    email: string,
    displayName: string,
    role: AdminRole,
    department: string,
    actor: { uid: string; displayName: string; email: string; role: string }
  ): AdminUser {
    const admins = this.getAdmins();
    const roleDef = ROLE_DEFINITIONS[role];
    const newAdmin: AdminUser = {
      uid: `admin_${Math.random().toString(36).substring(2, 9)}`,
      email,
      displayName,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
      role,
      isSuperAdmin: role === 'super_admin',
      firestorePermissions: {
        sendNotifications: role === 'super_admin' || role === 'marketing_admin',
        userEdit: role === 'super_admin' || role === 'app_manager',
        userEmailView: role === 'super_admin' || role === 'app_manager',
        userView: role !== 'marketing_admin',
      },
      customClaims: {
        role,
        isSuperAdmin: role === 'super_admin',
        permissions: [...roleDef.permissions],
        department,
        securityClearance: role === 'super_admin' ? 'tier_1' : role === 'app_manager' ? 'tier_2' : 'tier_3',
        adminSince: new Date().toISOString(),
      },
      status: 'active',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    admins.push(newAdmin);
    localStorage.setItem(this.adminsKey, JSON.stringify(admins));

    this.logAudit(
      'admin_invited',
      actor,
      { type: 'admin', id: newAdmin.uid, name: displayName },
      `Invited new admin ${displayName} with role ${roleDef.displayName}`,
      { after: { email, role, department } }
    );

    return newAdmin;
  }

  // --- Users Management ---
  public getUsers(): AppUser[] {
    try {
      const data = localStorage.getItem(this.usersKey);
      return data ? JSON.parse(data) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  public getUserById(id: string): AppUser | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  public updateUser(
    userId: string,
    updates: Partial<AppUser>,
    actor: { uid: string; displayName: string; email: string; role: string }
  ): AppUser {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    const before = { ...users[idx] };
    const updatedUser = { ...users[idx], ...updates };
    users[idx] = updatedUser;

    localStorage.setItem(this.usersKey, JSON.stringify(users));

    if (updates.tier && updates.tier !== before.tier) {
      this.logAudit(
        'user_subscription_changed',
        actor,
        { type: 'user', id: userId, name: updatedUser.name },
        `Changed subscription tier for ${updatedUser.name} from ${before.tier.toUpperCase()} to ${updates.tier.toUpperCase()}`,
        { before: { tier: before.tier, expiresAt: before.tierExpiresAt }, after: { tier: updates.tier, expiresAt: updates.tierExpiresAt } }
      );
    } else {
      this.logAudit(
        'user_profile_edited',
        actor,
        { type: 'user', id: userId, name: updatedUser.name },
        `Edited profile details for ${updatedUser.name}`,
        { before, after: updates }
      );
    }

    return updatedUser;
  }

  public toggleUserStatus(
    userId: string,
    status: 'active' | 'suspended',
    actor: { uid: string; displayName: string; email: string; role: string }
  ): AppUser {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    const beforeStatus = users[idx].status;
    users[idx].status = status;
    localStorage.setItem(this.usersKey, JSON.stringify(users));

    this.logAudit(
      'user_status_updated',
      actor,
      { type: 'user', id: userId, name: users[idx].name },
      `Changed user status for ${users[idx].name} from ${beforeStatus} to ${status}`,
      { before: { status: beforeStatus }, after: { status } }
    );

    return users[idx];
  }

  // --- FCM Notifications & Campaigns ---
  public getCampaigns(): NotificationCampaign[] {
    try {
      const data = localStorage.getItem(this.campaignsKey);
      return data ? JSON.parse(data) : INITIAL_CAMPAIGNS;
    } catch {
      return INITIAL_CAMPAIGNS;
    }
  }

  public createCampaign(
    data: {
      title: string;
      body: string;
      imageUrl?: string;
      deepLink?: string;
      audience: TargetAudience;
      audienceEstimatedCount: number;
      priority: NotificationPriority;
      sound: 'default' | 'alert' | 'silent';
      scheduleLater?: boolean;
      scheduledFor?: string;
    },
    actor: { uid: string; displayName: string; email: string; role: string }
  ): NotificationCampaign {
    const campaigns = this.getCampaigns();
    const isScheduled = data.scheduleLater && data.scheduledFor;
    const count = data.audienceEstimatedCount || 10000;

    const newCampaign: NotificationCampaign = {
      id: `camp_${Date.now().toString().slice(-4)}_${Math.random().toString(36).substring(2, 6)}`,
      title: data.title,
      body: data.body,
      imageUrl: data.imageUrl,
      deepLink: data.deepLink,
      audience: data.audience,
      audienceEstimatedCount: count,
      status: isScheduled ? 'scheduled' : 'completed',
      priority: data.priority,
      sound: data.sound,
      createdAt: new Date().toISOString(),
      scheduledFor: isScheduled ? data.scheduledFor : undefined,
      sentAt: isScheduled ? undefined : new Date().toISOString(),
      createdBy: {
        adminId: actor.uid,
        adminName: actor.displayName,
        adminRole: actor.role,
      },
      metrics: isScheduled
        ? {
            totalSent: 0,
            deliveredCount: 0,
            openedCount: 0,
            clickedCount: 0,
            failedCount: 0,
            deliveryRatePct: 0,
            openRatePct: 0,
          }
        : {
            totalSent: count,
            deliveredCount: Math.round(count * 0.975),
            openedCount: Math.round(count * 0.28),
            clickedCount: Math.round(count * 0.16),
            failedCount: Math.round(count * 0.025),
            deliveryRatePct: 97.5,
            openRatePct: 28.0,
          },
    };

    campaigns.unshift(newCampaign);
    localStorage.setItem(this.campaignsKey, JSON.stringify(campaigns));

    this.logAudit(
      isScheduled ? 'fcm_campaign_created' : 'fcm_broadcast_dispatched',
      actor,
      { type: 'campaign', id: newCampaign.id, name: newCampaign.title },
      isScheduled
        ? `Scheduled FCM notification campaign "${newCampaign.title}" for ${data.scheduledFor}`
        : `Dispatched instant FCM push broadcast "${newCampaign.title}" to ${count.toLocaleString()} target tokens`,
      { after: newCampaign }
    );

    return newCampaign;
  }

  // --- Crashlytics ---
  public getCrashIssues(): CrashIssue[] {
    try {
      const data = localStorage.getItem(this.crashesKey);
      return data ? JSON.parse(data) : INITIAL_CRASH_ISSUES;
    } catch {
      return INITIAL_CRASH_ISSUES;
    }
  }

  public updateCrashStatus(
    issueId: string,
    status: CrashStatus,
    notes?: string,
    actor?: { uid: string; displayName: string; email: string; role: string }
  ): CrashIssue {
    const issues = this.getCrashIssues();
    const idx = issues.findIndex((c) => c.id === issueId);
    if (idx === -1) throw new Error('Crash issue not found');

    const beforeStatus = issues[idx].status;
    issues[idx].status = status;
    if (notes !== undefined) {
      issues[idx].rootCauseNotes = notes;
    }
    localStorage.setItem(this.crashesKey, JSON.stringify(issues));

    if (actor) {
      this.logAudit(
        'crash_issue_status_updated',
        actor,
        { type: 'crash_issue', id: issueId, name: issues[idx].title },
        `Updated crash issue status to "${status}"`,
        { before: { status: beforeStatus }, after: { status, notes } }
      );
    }

    return issues[idx];
  }

  public resetToDefaults() {
    localStorage.setItem(this.adminsKey, JSON.stringify(INITIAL_ADMINS));
    localStorage.setItem(this.usersKey, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(this.campaignsKey, JSON.stringify(INITIAL_CAMPAIGNS));
    localStorage.setItem(this.crashesKey, JSON.stringify(INITIAL_CRASH_ISSUES));
    localStorage.setItem(this.auditKey, JSON.stringify(INITIAL_AUDIT_LOGS));
  }
}

export const mockService = new MockService();
