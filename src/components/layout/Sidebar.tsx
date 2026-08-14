import React from 'react';
import {
  LayoutDashboard,
  Users,
  Send,
  Activity,
  ShieldCheck,
  FileText,
  Lock,
  Code2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AdminRole } from '../../types/auth';
import { ROLE_DEFINITIONS } from '../../types/auth';

export type NavView = 'dashboard' | 'users' | 'fcm' | 'crashlytics' | 'admins' | 'audit' | 'security';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
}

interface NavItemConfig {
  id: NavView;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  allowedRoles: AdminRole[];
  restrictedMessage?: string;
  section: 'main' | 'operations' | 'security';
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Overview & KPIs',
    icon: LayoutDashboard,
    allowedRoles: ['super_admin', 'app_manager', 'marketing_admin'],
    section: 'main',
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    allowedRoles: ['super_admin', 'app_manager'],
    restrictedMessage: 'Locked for Marketing Admin',
    section: 'main',
  },
  {
    id: 'fcm',
    label: 'FCM Push Center',
    icon: Send,
    allowedRoles: ['super_admin', 'marketing_admin'],
    restrictedMessage: 'Locked for App Manager',
    section: 'main',
  },
  {
    id: 'crashlytics',
    label: 'Crashlytics & Logs',
    icon: Activity,
    allowedRoles: ['super_admin', 'app_manager'],
    restrictedMessage: 'Locked for Marketing Admin',
    section: 'operations',
  },
  {
    id: 'admins',
    label: 'Admin RBAC Matrix',
    icon: ShieldCheck,
    allowedRoles: ['super_admin'],
    restrictedMessage: 'Super Admin Only',
    section: 'operations',
  },
  {
    id: 'audit',
    label: 'Audit Trail Logs',
    icon: FileText,
    allowedRoles: ['super_admin', 'app_manager', 'marketing_admin'],
    section: 'operations',
  },
  {
    id: 'security',
    label: 'Security Rules & Code',
    icon: Code2,
    allowedRoles: ['super_admin', 'app_manager', 'marketing_admin'],
    section: 'security',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { role } = useAuth();
  const currentRoleDef = role !== 'unauthorized' ? ROLE_DEFINITIONS[role] : null;

  const renderSection = (section: 'main' | 'operations' | 'security', title: string) => {
    const items = NAV_ITEMS.filter((item) => item.section === section);

    return (
      <div className="sidebar-nav-section" key={section}>
        <div className="sidebar-section-title">{title}</div>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isAllowed = role === 'super_admin' || (role !== 'unauthorized' && item.allowedRoles.includes(role));

          return (
            <button
              key={item.id}
              className={`nav-item-btn ${isActive ? 'active' : ''} ${!isAllowed ? 'restricted-nav' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={!isAllowed ? `Access Restricted: ${item.restrictedMessage}` : item.label}
            >
              <div className="nav-item-left">
                <Icon size={18} />
                <span>{item.label}</span>
              </div>
              {!isAllowed && (
                <div className="nav-lock-indicator">
                  <Lock size={12} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="brand-logo-container">
          <div className="brand-logo-icon">T</div>
          <div>
            <span style={{ fontWeight: 700 }}>Tijarah</span>
            <span style={{ color: 'var(--accent-primary)', marginLeft: '2px' }}>Admin</span>
          </div>
        </div>
        <span className="brand-badge">RBAC v2.4</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderSection('main', 'Core Platform')}
        {renderSection('operations', 'Operations & Governance')}
        {renderSection('security', 'Architecture')}
      </div>

      <div className="sidebar-footer">
        <div className="current-role-card">
          <div className="role-header-row">
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Current Clearance
            </span>
            <span className={`badge badge-${role === 'super_admin' ? 'super' : role === 'app_manager' ? 'manager' : 'marketing'}`}>
              {role === 'super_admin' ? 'Tier 1' : role === 'app_manager' ? 'Tier 2' : 'Tier 3'}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {currentRoleDef?.displayName || 'Unauthorized'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
            {currentRoleDef?.restrictedNotice}
          </div>
        </div>
      </div>
    </aside>
  );
};
