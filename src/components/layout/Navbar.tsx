import React, { useState, useRef, useEffect } from 'react';
import {
  Key,
  ChevronDown,
  RefreshCw,
  UserCheck,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_DEFINITIONS } from '../../types/auth';
import { useToast } from '../../context/ToastContext';
import { isFirebaseConfigured } from '../../services/firebaseClient';
import { TokenClaimsInspectorModal } from '../auth/TokenClaimsInspectorModal';

export const Navbar: React.FC = () => {
  const { currentAdmin, isSuperAdmin, allAdmins, switchAdmin, refreshClaims, isRefreshingClaims, logout } = useAuth();
  const { showSuccess, showInfo } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isClaimsModalOpen, setIsClaimsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLiveFirebase = isFirebaseConfigured();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleSelect = (uid: string) => {
    switchAdmin(uid);
    setIsDropdownOpen(false);
    const target = allAdmins.find((a) => a.uid === uid);
    if (target) {
      showSuccess(`Active session switched to ${target.displayName}`, `Role: ${ROLE_DEFINITIONS[target.role].displayName}`);
    }
  };

  const handleManualRefresh = async () => {
    await refreshClaims();
    showInfo('Custom Claims token re-verified with auth authority');
  };

  const handleLogout = () => {
    logout();
    showInfo('Logged out', 'You have been signed out of the admin console');
  };

  return (
    <>
      <header className="app-navbar">
        <div className="navbar-left">
          <div className="role-simulator-banner">
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isSuperAdmin ? '#a855f7' : '#38bdf8',
                boxShadow: '0 0 8px currentColor',
              }}
            />
            <span className="simulator-label">Active Admin:</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentAdmin?.email || 'test@admin.com'}
            </span>
            <span className={`badge ${isSuperAdmin ? 'badge-super' : 'badge-manager'}`}>
              {isSuperAdmin ? 'Super Admin' : 'Staff Admin'}
            </span>
          </div>
        </div>

        <div className="navbar-right">
          {/* Firestore Connection Indicator (Safe Status, No Sensitive Credentials Exposed) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '6px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isLiveFirebase ? '#10b981' : '#f59e0b',
                boxShadow: isLiveFirebase ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none',
              }}
            />
            <span style={{ fontWeight: 500 }}>
              {isLiveFirebase ? 'Firestore Online' : 'Firestore Offline'}
            </span>
          </div>

          {/* Quick Custom Claims Inspector Button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsClaimsModalOpen(true)}
            title="Inspect decoded JWT Token Claims & Security Rules Context"
          >
            <Key size={15} style={{ color: 'var(--accent-primary)' }} />
            <span>Claims & JWT</span>
          </button>

          {/* Refresh Token Button */}
          <button
            className="btn btn-outline btn-sm btn-icon-only"
            onClick={handleManualRefresh}
            disabled={isRefreshingClaims}
            title="Simulate token refresh with ADMINS collection"
          >
            <RefreshCw size={15} className={isRefreshingClaims ? 'spin-anim' : ''} />
          </button>

          {/* Admin User / Role Switcher Dropdown */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              className="admin-profile-menu"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
            >
              <img
                src={currentAdmin?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'}
                alt={currentAdmin?.displayName || 'Admin'}
                className="admin-avatar"
              />
              <div className="admin-info-inline">
                <span className="admin-name-inline">{currentAdmin?.displayName || currentAdmin?.email || 'Admin'}</span>
                <span className="admin-role-inline">{isSuperAdmin ? 'Super Admin' : 'Staff Admin'}</span>
              </div>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)', marginLeft: '4px' }} />
            </button>

            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '320px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-dropdown)',
                  padding: '8px',
                  zIndex: 100,
                  animation: 'scaleUp 150ms ease-out',
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ADMINS Collection Accounts
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {allAdmins.map((admin) => {
                    const isSelected = currentAdmin?.uid === admin.uid;
                    const rDef = ROLE_DEFINITIONS[admin.role];

                    return (
                      <button
                        key={admin.uid}
                        onClick={() => handleRoleSelect(admin.uid)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          width: '100%',
                          background: isSelected ? 'var(--bg-surface-active)' : 'transparent',
                          border: isSelected ? '1px solid var(--border-medium)' : '1px solid transparent',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <img
                          src={admin.avatarUrl}
                          alt={admin.displayName}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{admin.displayName}</span>
                            {isSelected && <UserCheck size={14} style={{ color: 'var(--status-success)', flexShrink: 0 }} />}
                          </div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: rDef.colorScheme === 'purple' ? '#c4b5fd' : rDef.colorScheme === 'blue' ? '#7dd3fc' : '#fcd34d' }}>
                              {admin.isSuperAdmin ? 'Super Admin' : 'Staff Admin (ADMINS)'}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '8px', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsClaimsModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    <Sparkles size={14} /> Open Custom Claims Sandbox
                  </button>

                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      color: '#f87171',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    <LogOut size={14} /> Sign Out (Lock Console)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <TokenClaimsInspectorModal
        isOpen={isClaimsModalOpen}
        onClose={() => setIsClaimsModalOpen(false)}
      />
    </>
  );
};
