import React, { useState, useEffect } from 'react';
import {
  Bug,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Database,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { CrashIssue, CrashStatus } from '../../types/crashlytics';
import { useAuth } from '../../context/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';

export const CrashlyticsView: React.FC = () => {
  const { currentAdmin, role, hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();

  const [issues, setIssues] = useState<CrashIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [copiedTraceId, setCopiedTraceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | CrashStatus>('all');

  const canManageIssues = hasPermission('crashlytics:manage_issues');

  useEffect(() => {
    firestoreService.getCrashIssues().then((res) => {
      setIssues(res.issues);
      if (res.issues.length > 0 && !expandedIssueId) {
        setExpandedIssueId(res.issues[0].id);
      }
      setIsLive(res.isLive);
      setIsLoading(false);
    });

    const unsubscribe = firestoreService.subscribeToCrashIssues((updatedIssues) => {
      setIssues(updatedIssues);
      setIsLive(true);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [expandedIssueId]);

  const filteredIssues = issues.filter((i) => statusFilter === 'all' || i.status === statusFilter);
  const openCount = issues.filter((i) => i.status === 'open' || i.status === 'investigating').length;
  const fatalCount = issues.filter((i) => i.severity === 'fatal').length;

  const handleUpdateStatus = async (issueId: string, newStatus: CrashStatus) => {
    if (!canManageIssues) {
      showError('Permission Denied', 'Your custom claims do not permit updating crash issue statuses');
      return;
    }
    try {
      await firestoreService.updateCrashStatus(
        issueId,
        newStatus,
        undefined,
        {
          uid: currentAdmin?.uid || 'pm_admin',
          displayName: currentAdmin?.displayName || 'App Manager',
          email: currentAdmin?.email || 'pm@tijarah.app',
          role: role,
        }
      );
      const latest = await firestoreService.getCrashIssues();
      setIssues(latest.issues);
      showSuccess('Issue Status Updated in Firestore', `Crash issue marked as ${newStatus}`);
    } catch (err: any) {
      showError('Update failed', err.message);
    }
  };

  const handleCopyStackTrace = (issue: CrashIssue) => {
    navigator.clipboard.writeText(issue.stackTrace.join('\n'));
    setCopiedTraceId(issue.id);
    showSuccess('Stack trace copied to clipboard');
    setTimeout(() => setCopiedTraceId(null), 2000);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Firebase Crashlytics & App Health</h1>
            <span className={`badge ${isLive ? 'badge-success' : 'badge-neutral'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Database size={12} />
              <span>{isLive ? `Live Firestore: CRASH_ISSUES (${issues.length} tracked)` : 'Local Cache'}</span>
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Real-time native crash reports, ANRs, stack trace debugging, and regression monitoring
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
          <select
            className="form-select"
            style={{ width: '140px', padding: '7px 10px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Issues</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>
        </div>
      </div>

      {/* Crashlytics Metrics Ribbon */}
      <div className="metrics-summary-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-stat-card">
          <span className="metric-stat-title">Crash-Free Users</span>
          <div className="metric-stat-value" style={{ color: 'var(--status-success)' }}>
            {openCount === 0 ? '100%' : '99.78%'}
          </div>
          <div className="metric-stat-sub">Target SLA: &gt;99.5%</div>
        </div>

        <div className="metric-stat-card">
          <span className="metric-stat-title">Open Crash Issues</span>
          <div className="metric-stat-value">
            {openCount}
          </div>
          <div className="metric-stat-sub">
            {openCount === 0 ? 'All issues resolved in Firestore' : `${openCount} active regressions`}
          </div>
        </div>

        <div className="metric-stat-card">
          <span className="metric-stat-title">Fatal Crashes (Tracked)</span>
          <div className="metric-stat-value" style={{ color: fatalCount > 0 ? 'var(--status-warning)' : 'var(--text-primary)' }}>
            {fatalCount}
          </div>
          <div className="metric-stat-sub">{issues.length} total signatures in Firestore</div>
        </div>

        <div className="metric-stat-card">
          <span className="metric-stat-title">App Version Stream</span>
          <div className="metric-stat-value" style={{ fontSize: '1.25rem' }}>
            v2.4.1 (Live)
          </div>
          <div className="metric-stat-sub">Production Android & iOS release</div>
        </div>
      </div>

      {/* Issues Breakdown */}
      {isLoading ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Loader2 size={18} className="spin" style={{ color: 'var(--accent-primary)' }} />
            <span>Loading crash reports from Firestore CRASH_ISSUES...</span>
          </div>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <CheckCircle2 size={32} style={{ color: 'var(--status-success)', margin: '0 auto 10px' }} />
          <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            No Crash Issues in Firestore Collection
          </div>
          <div style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
            No fatal exceptions or ANRs found in CRASH_ISSUES. Your application builds are running cleanly.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredIssues.map((issue) => {
            const isExpanded = expandedIssueId === issue.id;

            return (
              <div key={issue.id} className="card" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                    <div
                      style={{
                        padding: '8px',
                        background: issue.severity === 'fatal' ? 'var(--status-danger-bg)' : 'var(--status-warning-bg)',
                        borderRadius: 'var(--radius-sm)',
                        color: issue.severity === 'fatal' ? 'var(--status-danger)' : 'var(--status-warning)',
                      }}
                    >
                      <Bug size={20} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {issue.title}
                        </span>
                        <span
                          className={`badge ${
                            issue.severity === 'fatal'
                              ? 'badge-danger'
                              : issue.severity === 'anr'
                              ? 'badge-warning'
                              : 'badge-neutral'
                          }`}
                        >
                          {issue.severity.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                        {issue.subtitle}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span><strong>{issue.totalEvents}</strong> crashes</span>
                        <span><strong>{issue.impactedUsersCount}</strong> users impacted</span>
                        <span>Versions: {issue.affectedVersions.join(', ')}</span>
                        {issue.assignedTo && <span>Assigned: {issue.assignedTo}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select
                    className="form-select"
                    style={{ width: '140px', padding: '6px 10px', fontSize: '0.8rem' }}
                    value={issue.status}
                    onChange={(e) => handleUpdateStatus(issue.id, e.target.value as CrashStatus)}
                    disabled={!canManageIssues}
                  >
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="ignored">Ignored</option>
                  </select>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <span>{isExpanded ? 'Hide Trace' : 'Inspect Trace'}</span>
                  </button>
                </div>
              </div>

              {/* Expanded Stack Trace Details */}
              {isExpanded && (
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  {issue.rootCauseNotes && (
                    <div style={{ background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontSize: '0.825rem', color: 'var(--accent-primary)', borderLeft: '3px solid var(--accent-primary)' }}>
                      <strong>Root Cause Note:</strong> {issue.rootCauseNotes}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      De-obfuscated Symbolicated Stack Trace:
                    </span>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleCopyStackTrace(issue)}
                    >
                      {copiedTraceId === issue.id ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedTraceId === issue.id ? 'Copied' : 'Copy Trace'}</span>
                    </button>
                  </div>

                  <div className="stack-trace-container">
                    {issue.stackTrace.map((line, idx) => (
                      <div key={idx} style={{ color: idx === 0 ? '#b91c1c' : '#475569', fontWeight: idx === 0 ? 600 : 400 }}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);
};
