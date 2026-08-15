import React, { useState } from 'react';
import { X, Key, Copy, Check, Sliders, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Permission } from '../../types/auth';
import { ROLE_DEFINITIONS } from '../../types/auth';
import { useToast } from '../../context/ToastContext';

interface TokenClaimsInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_POSSIBLE_PERMISSIONS: { id: Permission; label: string; category: string }[] = [
  { id: 'users:view', label: 'View User Table & Details', category: 'User Management' },
  { id: 'users:edit', label: 'Edit User Profile Data', category: 'User Management' },
  { id: 'users:manage_subscription', label: 'Toggle/Manage Premium Subscriptions', category: 'User Management' },
  { id: 'users:delete', label: 'Delete User Records', category: 'User Management' },
  { id: 'users:export', label: 'Export User Data (CSV/JSON)', category: 'User Management' },
  { id: 'fcm:compose', label: 'Draft Push Notifications', category: 'FCM Push' },
  { id: 'fcm:broadcast', label: 'Dispatch Push Broadcasts', category: 'FCM Push' },
  { id: 'fcm:view_campaigns', label: 'View FCM Campaign History & CTR', category: 'FCM Push' },
  { id: 'fcm:manage_segments', label: 'Manage Audience Segments', category: 'FCM Push' },
  { id: 'crashlytics:view', label: 'View Crashlytics & Error Traces', category: 'Crashlytics' },
  { id: 'crashlytics:manage_issues', label: 'Change Issue Status / Assignee', category: 'Crashlytics' },
  { id: 'analytics:app_health', label: 'View App Health Metrics', category: 'Analytics' },
  { id: 'analytics:financial', label: 'View Financial & Revenue Metrics (MRR)', category: 'Analytics' },
  { id: 'admins:view', label: 'View Admin Accounts', category: 'Admin Control' },
  { id: 'admins:manage_roles', label: 'Assign Admin Roles', category: 'Admin Control' },
  { id: 'admins:set_claims', label: 'Directly Set Firebase Custom Claims', category: 'Admin Control' },
  { id: 'audit:view_full', label: 'View Full Audit Logs (Actors & IPs)', category: 'Audit' },
  { id: 'audit:view_limited', label: 'View Limited Audit Logs', category: 'Audit' },
];

export const TokenClaimsInspectorModal: React.FC<TokenClaimsInspectorModalProps> = ({ isOpen, onClose }) => {
  const { currentAdmin, role, claims, permissions, simulateCustomClaims, refreshClaims, isRefreshingClaims } = useAuth();
  const { showSuccess } = useToast();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'claims_view' | 'claims_sandbox'>('claims_view');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(permissions);

  if (!isOpen) return null;

  const roleDef = role !== 'unauthorized' ? ROLE_DEFINITIONS[role] : null;

  const simulatedJwtPayload = {
    iss: 'https://securetoken.google.com/tijarah-commerce-prod',
    aud: 'tijarah-commerce-prod',
    auth_time: Math.floor(Date.now() / 1000) - 3600,
    user_id: currentAdmin?.uid || 'anonymous',
    sub: currentAdmin?.uid || 'anonymous',
    iat: Math.floor(Date.now() / 1000) - 3600,
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: currentAdmin?.email || 'unauthenticated@guest.local',
    email_verified: true,
    firebase: {
      identities: {
        email: [currentAdmin?.email || 'unauthenticated@guest.local'],
      },
      sign_in_provider: 'password',
    },
    // Custom Claims
    role: role,
    permissions: permissions,
    department: claims?.department || (roleDef ? roleDef.displayName : 'Guest'),
    securityClearance: claims?.securityClearance || (role === 'super_admin' ? 'tier_1' : 'tier_2'),
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(simulatedJwtPayload, null, 2));
    setCopied(true);
    showSuccess('Token payload copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSandboxPermission = (perm: Permission) => {
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== perm));
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  const handleApplySandbox = () => {
    simulateCustomClaims({
      permissions: selectedPermissions,
    });
    showSuccess('Custom claims sandbox applied', 'UI permissions re-evaluated immediately');
    onClose();
  };

  const handleResetSandbox = async () => {
    await refreshClaims();
    setSelectedPermissions(permissions);
    showSuccess('Custom claims reset from server authority');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'var(--accent-primary-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-primary)' }}>
              <Key size={20} />
            </div>
            <div>
              <div className="modal-title">Firebase Custom Claims & Token Inspector</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Inspect decoded JWT claims, Firestore security context, and permission grants
              </div>
            </div>
          </div>
          <button className="toast-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '16px', background: 'var(--bg-surface)' }}>
          <button
            onClick={() => setActiveTab('claims_view')}
            className={`btn btn-sm ${activeTab === 'claims_view' ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: '0', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottomWidth: '2px', padding: '12px 14px' }}
          >
            Decoded Token & Claims
          </button>
          <button
            onClick={() => {
              setSelectedPermissions(permissions);
              setActiveTab('claims_sandbox');
            }}
            className={`btn btn-sm ${activeTab === 'claims_sandbox' ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: '0', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottomWidth: '2px', padding: '12px 14px' }}
          >
            <Sliders size={14} /> Claims Sandbox & Override
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {activeTab === 'claims_view' ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Role Claim</div>
                  <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`badge badge-${role === 'super_admin' ? 'super' : role === 'app_manager' ? 'manager' : 'marketing'}`}>
                      {roleDef?.displayName || role}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Granted Permissions</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {role === 'super_admin' ? 'All (Root)' : `${permissions.length} Claims`}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Token Issuer (iss)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                    securetoken.google.com
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Decoded Firebase ID Token Payload (JSON):
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleCopyJson}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy Claims'}
                </button>
              </div>

              <pre className="code-block" style={{ fontSize: '0.775rem', maxHeight: '280px' }}>
                {JSON.stringify(simulatedJwtPayload, null, 2)}
              </pre>

              <div style={{ marginTop: '16px', padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong>Firestore Security Rule Context:</strong> Inside security rules, these claims are accessed via <code style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>request.auth.token.role</code> and <code style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>request.auth.token.permissions</code>.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Toggle individual permissions in this live sandbox to simulate custom granular role variations on the fly.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {ALL_POSSIBLE_PERMISSIONS.map((p) => {
                  const isChecked = selectedPermissions.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: isChecked ? 'var(--accent-primary-subtle)' : 'var(--bg-secondary)',
                        border: `1px solid ${isChecked ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{p.label}</span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{p.id}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSandboxPermission(p.id)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {activeTab === 'claims_sandbox' ? (
            <>
              <button className="btn btn-outline btn-sm" onClick={handleResetSandbox} disabled={isRefreshingClaims}>
                <RefreshCw size={14} className={isRefreshingClaims ? 'spin-anim' : ''} /> Reset to Role Defaults
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleApplySandbox}>
                Apply Simulated Claims
              </button>
            </>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Close Inspector
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
