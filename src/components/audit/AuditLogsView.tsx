import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Database,
  Loader2,
} from 'lucide-react';
import type { AuditLogEntry } from '../../types/audit';
import { useAuth } from '../../context/AuthContext';
import { firestoreService } from '../../services/firestoreService';

export const AuditLogsView: React.FC = () => {
  const { role } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    firestoreService.getAuditLogs().then((res) => {
      setLogs(res.logs);
      setIsLive(res.isLive);
      setIsLoading(false);
    });

    const unsubscribe = firestoreService.subscribeToAuditLogs((updatedLogs) => {
      setLogs(updatedLogs);
      setIsLive(true);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Security Audit Trail</h1>
            <span className={`badge ${isLive ? 'badge-success' : 'badge-neutral'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Database size={12} />
              <span>{isLive ? `Live Firestore: AUDIT_LOGS (${logs.length} entries)` : 'Local Cache'}</span>
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Comprehensive log of all administrative actions, subscription changes, broadcasts, and role updates
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-toolbar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            className="form-input search-input-field"
            placeholder="Search by actor, description, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Action:</span>
          <select
            className="form-select"
            style={{ width: '220px', padding: '7px 10px' }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">All Action Types</option>
            <option value="user_subscription_changed">Subscription Tier Changed</option>
            <option value="user_status_updated">User Status Modified</option>
            <option value="fcm_broadcast_dispatched">FCM Broadcast Dispatched</option>
            <option value="admin_custom_claims_updated">Custom Claims Updated</option>
            <option value="admin_invited">Admin Invited</option>
            <option value="crash_issue_status_updated">Crash Issue Status Updated</option>
          </select>
        </div>
      </div>

      {/* Audit Log Timeline Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action Type</th>
              <th>Actor Profile</th>
              <th>Target Resource</th>
              <th>Description</th>
              {role === 'super_admin' && <th>Client IP</th>}
              <th style={{ textAlign: 'right' }}>Diff</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 size={18} className="spin" style={{ color: 'var(--accent-primary)' }} />
                    <span>Loading audit records from Firestore AUDIT_LOGS...</span>
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No audit trail records found in Firestore AUDIT_LOGS collection.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;

                return (
                  <React.Fragment key={log.id}>
                    <tr>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>

                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.actor.displayName}</div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{log.actor.role}</div>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                          {log.targetResource.name || log.targetResource.id}
                        </span>
                      </td>

                      <td style={{ maxWidth: '360px' }}>
                        <span style={{ fontSize: '0.825rem', color: 'var(--text-primary)' }}>{log.description}</span>
                      </td>

                      {role === 'super_admin' && (
                        <td style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {log.ipAddress}
                        </td>
                      )}

                      <td style={{ textAlign: 'right' }}>
                        {log.changes ? (
                          <button
                            className="btn btn-secondary btn-sm btn-icon-only"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            title="Inspect changes diff"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                    </tr>

                    {/* Diff Row */}
                    {isExpanded && log.changes && (
                      <tr>
                        <td colSpan={role === 'super_admin' ? 7 : 6} style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                            Payload Changes (Before / After Diff):
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: log.changes.before ? '1fr 1fr' : '1fr', gap: '16px' }}>
                            {log.changes.before && (
                              <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--status-danger)', fontWeight: 600, marginBottom: '4px' }}>Before:</div>
                                <pre className="code-block" style={{ fontSize: '0.75rem' }}>
                                  {JSON.stringify(log.changes.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.changes.after && (
                              <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--status-success)', fontWeight: 600, marginBottom: '4px' }}>After:</div>
                                <pre className="code-block" style={{ fontSize: '0.75rem' }}>
                                  {JSON.stringify(log.changes.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
