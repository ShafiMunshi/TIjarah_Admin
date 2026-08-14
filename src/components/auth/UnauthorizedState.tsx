import React from 'react';
import { ShieldAlert, ArrowLeft, RefreshCw, Check } from 'lucide-react';
import type { AdminRole, Permission } from '../../types/auth';
import { ROLE_DEFINITIONS } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface UnauthorizedStateProps {
  requiredRoles?: AdminRole[];
  requiredPermissions?: Permission[];
  featureName?: string;
  onNavigateHome?: () => void;
}

export const UnauthorizedState: React.FC<UnauthorizedStateProps> = ({
  requiredRoles = [],
  requiredPermissions = [],
  featureName = 'this section',
  onNavigateHome,
}) => {
  const { role, switchRoleDirectly, refreshClaims, isRefreshingClaims } = useAuth();
  const { showSuccess } = useToast();

  const currentRoleDef = role !== 'unauthorized' ? ROLE_DEFINITIONS[role] : null;

  return (
    <div className="unauthorized-card">
      <div className="unauthorized-icon-wrap">
        <ShieldAlert size={36} />
      </div>

      <div>
        <h2 className="unauthorized-title">403 Forbidden: Access Restricted</h2>
        <p className="unauthorized-desc" style={{ marginTop: '8px' }}>
          Your current administrative profile (<strong>{currentRoleDef?.displayName || 'Unauthorized / Anonymous'}</strong>) does not have the required role or custom claims to access {featureName}.
        </p>
      </div>

      {currentRoleDef && (
        <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', width: '100%', textAlign: 'left', borderLeft: '3px solid var(--status-warning)' }}>
          <strong>Role Restriction Policy:</strong> {currentRoleDef.restrictedNotice}
        </div>
      )}

      {(requiredRoles.length > 0 || requiredPermissions.length > 0) && (
        <div className="permissions-needed-box">
          <div className="permissions-needed-header">Required Permissions / Custom Claims:</div>
          <div className="permissions-chip-grid">
            {requiredRoles.map((r) => (
              <span key={r} className="perm-chip">
                Role: {ROLE_DEFINITIONS[r]?.displayName || r}
              </span>
            ))}
            {requiredPermissions.map((p) => (
              <span key={p} className="perm-chip">
                claim: {p}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', paddingTop: '18px', textAlign: 'left' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
          Quick Persona Switcher for Evaluation:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          {(['super_admin', 'app_manager', 'marketing_admin'] as AdminRole[]).map((r) => {
            const def = ROLE_DEFINITIONS[r];
            const isCurrent = role === r;
            const qualifies = requiredRoles.length === 0 || requiredRoles.includes(r);

            return (
              <button
                key={r}
                onClick={() => {
                  switchRoleDirectly(r);
                  showSuccess(`Switched to ${def.displayName}`);
                }}
                className={`btn ${isCurrent ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                style={{ justifyContent: 'space-between' }}
              >
                <span>{def.displayName.split(' ')[0]}</span>
                {qualifies ? (
                  <span style={{ fontSize: '0.68rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Check size={12} /> Granted
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: '#fca5a5' }}>Restricted</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="unauthorized-actions">
        {onNavigateHome && (
          <button className="btn btn-secondary" onClick={onNavigateHome}>
            <ArrowLeft size={16} /> Return to Dashboard
          </button>
        )}
        <button
          className="btn btn-outline"
          onClick={() => refreshClaims()}
          disabled={isRefreshingClaims}
        >
          <RefreshCw size={16} className={isRefreshingClaims ? 'spin-anim' : ''} /> Force Token Refresh
        </button>
      </div>
    </div>
  );
};
