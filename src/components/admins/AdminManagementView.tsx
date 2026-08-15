import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Check,
  X,
  Edit,
  Database,
  Loader2,
} from 'lucide-react';
import type { AdminUser, AdminRole, Permission } from '../../types/auth';
import { ROLE_DEFINITIONS } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';

export const AdminManagementView: React.FC = () => {
  const { currentAdmin, role, refreshAdminsList } = useAuth();
  const { showSuccess, showError } = useToast();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedAdminForEdit, setSelectedAdminForEdit] = useState<AdminUser | null>(null);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('app_manager');
  const [inviteDepartment, setInviteDepartment] = useState('Operations');

  // Edit Role Form
  const [editRole, setEditRole] = useState<AdminRole>('app_manager');
  const [editPermissions, setEditPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    firestoreService.getAdmins().then((res) => {
      setAdmins(res.admins);
      setIsLive(res.isLive);
      setIsLoading(false);
    });

    const unsubscribe = firestoreService.subscribeToAdmins((updatedAdmins) => {
      setAdmins(updatedAdmins);
      setIsLive(true);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleOpenEdit = (admin: AdminUser) => {
    setSelectedAdminForEdit(admin);
    setEditRole(admin.role);
    setEditPermissions(admin.customClaims.permissions || ROLE_DEFINITIONS[admin.role].permissions);
  };

  const handleSaveRoleAndClaims = async () => {
    if (!selectedAdminForEdit) return;

    try {
      await firestoreService.updateAdminRoleAndClaims(
        selectedAdminForEdit.uid,
        editRole,
        editPermissions,
        {
          uid: currentAdmin?.uid || 'super_admin',
          displayName: currentAdmin?.displayName || 'Super Admin',
          email: currentAdmin?.email || 'admin@tijarah.app',
          role: role,
        }
      );

      const latest = await firestoreService.getAdmins();
      setAdmins(latest.admins);
      refreshAdminsList();
      showSuccess(
        'Admin Role & Claims Committed to Firestore',
        `Updated ${selectedAdminForEdit.displayName} to ${ROLE_DEFINITIONS[editRole].displayName}`
      );
      setSelectedAdminForEdit(null);
    } catch (err: any) {
      showError('Failed to update admin', err.message);
    }
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) {
      showError('Incomplete fields', 'Email and Name are required');
      return;
    }

    try {
      await firestoreService.createAdmin(
        inviteEmail.trim(),
        inviteName.trim(),
        inviteRole,
        inviteDepartment.trim(),
        {
          uid: currentAdmin?.uid || 'super_admin',
          displayName: currentAdmin?.displayName || 'Super Admin',
          email: currentAdmin?.email || 'admin@tijarah.app',
          role: role,
        }
      );

      const latest = await firestoreService.getAdmins();
      setAdmins(latest.admins);
      refreshAdminsList();
      showSuccess('Admin Added to ADMINS Collection', `Created ${inviteRole} claim for ${inviteEmail}`);
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
    } catch (err: any) {
      showError('Failed to invite admin', err.message);
    }
  };

  const PERMISSION_MATRIX_ROWS: {
    permission: Permission;
    label: string;
    superAdmin: boolean;
    appManager: boolean;
    marketingAdmin: boolean;
  }[] = [
    { permission: 'users:view', label: 'View user accounts directory & search', superAdmin: true, appManager: true, marketingAdmin: false },
    { permission: 'users:edit', label: 'Edit user profile data & status', superAdmin: true, appManager: true, marketingAdmin: false },
    { permission: 'users:manage_subscription', label: 'Toggle Pro / Enterprise subscription tiers', superAdmin: true, appManager: true, marketingAdmin: false },
    { permission: 'users:export', label: 'Export customer data table to CSV', superAdmin: true, appManager: false, marketingAdmin: false },
    { permission: 'fcm:compose', label: 'Compose & preview rich push notifications', superAdmin: true, appManager: false, marketingAdmin: true },
    { permission: 'fcm:broadcast', label: 'Dispatch broadcast to all device push tokens', superAdmin: true, appManager: false, marketingAdmin: true },
    { permission: 'fcm:view_campaigns', label: 'Inspect push delivery rates & CTR metrics', superAdmin: true, appManager: false, marketingAdmin: true },
    { permission: 'crashlytics:view', label: 'Inspect native crash reports & stack traces', superAdmin: true, appManager: true, marketingAdmin: false },
    { permission: 'crashlytics:manage_issues', label: 'Change crash issue status & root causes', superAdmin: true, appManager: true, marketingAdmin: false },
    { permission: 'analytics:financial', label: 'View financial revenue & MRR metrics', superAdmin: true, appManager: false, marketingAdmin: false },
    { permission: 'admins:manage_roles', label: 'Assign roles & update Firebase custom claims', superAdmin: true, appManager: false, marketingAdmin: false },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Admin Role-Based Access Control (RBAC)</h1>
            <span className={`badge ${isLive ? 'badge-success' : 'badge-neutral'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Database size={12} />
              <span>{isLive ? `Live Firestore: ADMINS (${admins.length} accounts)` : 'Local Cache'}</span>
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Manage staff clearance levels, grant custom token claims, and audit role definitions
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setIsInviteModalOpen(true)}>
          <UserPlus size={16} /> Invite Admin
        </button>
      </div>

      {/* Admin Accounts Table */}
      <div className="table-container" style={{ marginBottom: '32px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Admin Profile</th>
              <th>Assigned Role</th>
              <th>Custom Claims Clearance</th>
              <th>Department</th>
              <th>Last Active</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 size={18} className="spin" style={{ color: 'var(--accent-primary)' }} />
                    <span>Loading administrator accounts from Firestore...</span>
                  </div>
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No Administrator Records in Firestore</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    Click &ldquo;Invite Admin&rdquo; above to provision the first administrator account in the ADMINS collection.
                  </div>
                </td>
              </tr>
            ) : (
              admins.map((adm) => {
                const rDef = ROLE_DEFINITIONS[adm.role];

                return (
                  <tr key={adm.uid}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={adm.avatarUrl} alt={adm.displayName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{adm.displayName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{adm.email}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className={`badge badge-${rDef.colorScheme === 'purple' ? 'super' : rDef.colorScheme === 'blue' ? 'manager' : 'marketing'}`}>
                      {rDef.displayName}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {adm.customClaims.permissions?.length || rDef.permissions.length} claims granted
                    </span>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {adm.customClaims.department || 'Staff'}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(adm.lastLogin).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenEdit(adm)}
                    >
                      <Edit size={14} /> Edit Role & Claims
                    </button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Role Permission Matrix Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ShieldCheck size={18} />
            <span>Role-Based Permission Matrix</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enforced at Firestore Security Rules & Client Routes</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="permissions-matrix-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Capability & Granular Claim</th>
                <th style={{ textAlign: 'center', color: '#c4b5fd' }}>Super Admin</th>
                <th style={{ textAlign: 'center', color: '#7dd3fc' }}>App / Product Manager</th>
                <th style={{ textAlign: 'center', color: '#fcd34d' }}>Marketing Admin</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX_ROWS.map((row) => (
                <tr key={row.permission}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.label}</div>
                    <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      claim: {row.permission}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.superAdmin ? <span className="matrix-check"><Check size={18} /></span> : <span className="matrix-cross"><X size={18} /></span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.appManager ? <span className="matrix-check"><Check size={18} /></span> : <span className="matrix-cross"><X size={18} /></span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.marketingAdmin ? <span className="matrix-check"><Check size={18} /></span> : <span className="matrix-cross"><X size={18} /></span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role & Claims Modal */}
      {selectedAdminForEdit && (
        <div className="modal-overlay" onClick={() => setSelectedAdminForEdit(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Modify Admin Role & Token Claims</div>
              <button className="toast-close-btn" onClick={() => setSelectedAdminForEdit(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedAdminForEdit.displayName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedAdminForEdit.email}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Administrative Role</label>
                <select
                  className="form-select"
                  value={editRole}
                  onChange={(e) => {
                    const nextRole = e.target.value as AdminRole;
                    setEditRole(nextRole);
                    setEditPermissions(ROLE_DEFINITIONS[nextRole].permissions);
                  }}
                >
                  <option value="super_admin">Super Admin (Full Root Access)</option>
                  <option value="app_manager">App Manager / Product Manager (User & Crashlytics)</option>
                  <option value="marketing_admin">Marketing Admin (FCM Push Broadcasts)</option>
                </select>
              </div>

              <div style={{ marginTop: '16px', background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Custom Claim Payload to be injected via Firebase Admin SDK:
                </div>
                <pre className="code-block" style={{ fontSize: '0.75rem' }}>
                  {JSON.stringify(
                    {
                      role: editRole,
                      permissions: editPermissions,
                      updated_at: new Date().toISOString(),
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedAdminForEdit(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveRoleAndClaims}>
                <Check size={16} /> Apply Claims & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Admin Modal */}
      {isInviteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsInviteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Invite New Administrator</div>
              <button className="toast-close-btn" onClick={() => setIsInviteModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInviteAdmin}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Layla Mansoor"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Work Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. layla@tijarah.app"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Role</label>
                  <select
                    className="form-select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                  >
                    <option value="app_manager">App Manager / Product Manager</option>
                    <option value="marketing_admin">Marketing Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Department / Unit</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Product Engineering"
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <UserPlus size={16} /> Send Invite & Mint Claims
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
