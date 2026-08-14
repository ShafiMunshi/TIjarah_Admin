import React from 'react';
import {
  Users,
  DollarSign,
  Send,
  Activity,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_DEFINITIONS } from '../../types/auth';
import { mockService } from '../../services/mockService';
import type { NavView } from '../layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (view: NavView) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { role, currentAdmin } = useAuth();
  const roleDef = role !== 'unauthorized' ? ROLE_DEFINITIONS[role] : null;

  const users = mockService.getUsers();
  const campaigns = mockService.getCampaigns();
  const crashes = mockService.getCrashIssues();
  const auditLogs = mockService.getAuditLogs();

  const proCount = users.filter((u) => u.tier === 'pro' || u.tier === 'enterprise').length;

  return (
    <div>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              Welcome back, {currentAdmin?.displayName || 'Admin'}
            </h1>
            <span className={`badge badge-${role === 'super_admin' ? 'super' : role === 'app_manager' ? 'manager' : 'marketing'}`}>
              {roleDef?.displayName || 'Admin'}
            </span>
          </div>
          <p style={{ marginTop: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {role === 'super_admin' && 'You have unrestricted access to all platform systems, user records, FCM broadcasts, and financial metrics.'}
            {role === 'app_manager' && 'You have operational management over users, premium subscriptions, and application stability.'}
            {role === 'marketing_admin' && 'You can compose, preview, and broadcast FCM push notification campaigns to targeted user segments.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {role !== 'marketing_admin' && (
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('users')}>
              <Users size={15} /> Manage Users
            </button>
          )}
          {role !== 'app_manager' && (
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('fcm')}>
              <Send size={15} /> New FCM Campaign
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Grid (Role Filtered) */}
      <div className="metrics-summary-grid">
        {/* KPI 1: User Base (Restricted for Marketing Admin) */}
        <div className="metric-stat-card">
          <div className="card-header" style={{ margin: 0, padding: 0, border: 'none' }}>
            <span className="metric-stat-title">Registered Users</span>
            <div style={{ padding: '6px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)', color: 'var(--accent-primary)' }}>
              <Users size={16} />
            </div>
          </div>
          {role === 'marketing_admin' ? (
            <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Lock size={16} />
              <span style={{ fontSize: '0.85rem' }}>Restricted from Marketing Role</span>
            </div>
          ) : (
            <>
              <div className="metric-stat-value">184,520</div>
              <div className="metric-stat-sub" style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={13} /> +12.4% this month ({proCount} Premium in sample)
              </div>
            </>
          )}
        </div>

        {/* KPI 2: Financial MRR (Super Admin Only) */}
        <div className="metric-stat-card">
          <div className="card-header" style={{ margin: 0, padding: 0, border: 'none' }}>
            <span className="metric-stat-title">Monthly Recurring Revenue</span>
            <div style={{ padding: '6px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)', color: '#10b981' }}>
              <DollarSign size={16} />
            </div>
          </div>
          {role === 'super_admin' ? (
            <>
              <div className="metric-stat-value">$142,850</div>
              <div className="metric-stat-sub" style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={13} /> +8.1% vs last month ($18.4k Pro Tier)
              </div>
            </>
          ) : (
            <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Lock size={16} />
              <span style={{ fontSize: '0.85rem' }}>Confidential (Super Admin Only)</span>
            </div>
          )}
        </div>

        {/* KPI 3: FCM Delivery Rate (Restricted for App Manager) */}
        <div className="metric-stat-card">
          <div className="card-header" style={{ margin: 0, padding: 0, border: 'none' }}>
            <span className="metric-stat-title">FCM Delivery Success</span>
            <div style={{ padding: '6px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)', color: '#f59e0b' }}>
              <Send size={16} />
            </div>
          </div>
          {role === 'app_manager' ? (
            <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Lock size={16} />
              <span style={{ fontSize: '0.85rem' }}>Restricted from App Manager</span>
            </div>
          ) : (
            <>
              <div className="metric-stat-value">97.8%</div>
              <div className="metric-stat-sub" style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} /> 212.9k push messages delivered
              </div>
            </>
          )}
        </div>

        {/* KPI 4: Crash-Free Rate (Restricted for Marketing Admin) */}
        <div className="metric-stat-card">
          <div className="card-header" style={{ margin: 0, padding: 0, border: 'none' }}>
            <span className="metric-stat-title">Crash-Free Users</span>
            <div style={{ padding: '6px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)', color: '#06b6d4' }}>
              <Activity size={16} />
            </div>
          </div>
          {role === 'marketing_admin' ? (
            <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Lock size={16} />
              <span style={{ fontSize: '0.85rem' }}>Restricted from Marketing Role</span>
            </div>
          ) : (
            <>
              <div className="metric-stat-value">99.78%</div>
              <div className="metric-stat-sub" style={{ color: '#93c5fd' }}>
                2 open issues ({crashes.length} tracked total)
              </div>
            </>
          )}
        </div>
      </div>

      {/* Two Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Card Left: Role-Specific Operational Stream */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                {role === 'marketing_admin' ? <Send size={18} /> : <Users size={18} />}
                <span>{role === 'marketing_admin' ? 'Recent FCM Broadcasts' : 'Active User Directory'}</span>
              </div>
              <div className="card-subtitle">
                {role === 'marketing_admin'
                  ? 'Campaigns delivered across iOS APNs & Android FCM channels'
                  : 'Live overview of registered merchants & premium subscribers'}
              </div>
            </div>
            {role !== 'marketing_admin' ? (
              <button className="btn btn-outline btn-sm" onClick={() => onNavigate('users')}>
                View Table <ArrowUpRight size={14} />
              </button>
            ) : (
              <button className="btn btn-outline btn-sm" onClick={() => onNavigate('fcm')}>
                View Campaigns <ArrowUpRight size={14} />
              </button>
            )}
          </div>

          {role === 'marketing_admin' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {campaigns.slice(0, 3).map((camp) => (
                <div
                  key={camp.id}
                  style={{
                    padding: '12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{camp.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Audience: {camp.audience.replace('_', ' ').toUpperCase()} • {camp.metrics.deliveredCount.toLocaleString()} delivered
                    </div>
                  </div>
                  <span className={`badge ${camp.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                    {camp.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.slice(0, 4).map((user) => (
                <div
                  key={user.id}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={user.avatarUrl} alt={user.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${user.tier === 'enterprise' ? 'badge-super' : user.tier === 'pro' ? 'badge-manager' : 'badge-neutral'}`}>
                      {user.tier.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card Right: Security & Audit Trail */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <ShieldCheck size={18} />
                <span>Security & Admin Governance</span>
              </div>
              <div className="card-subtitle">
                Immutable audit trail of administrative modifications
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('audit')}>
              View Logs <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {auditLogs.slice(0, 3).map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{log.description}</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Actor: <strong>{log.actor.displayName}</strong> ({log.actor.role})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
