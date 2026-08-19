import React, { useState, useEffect } from 'react';
import {
  Send,
  Clock,
  Image as ImageIcon,
  Link2,
  Database,
  Loader2,
  Globe,
  Radio,
  Code,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { NotificationPriority, NotificationCampaign } from '../../types/notifications';
import { useAuth } from '../../context/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { fcmRestService } from '../../services/fcmRestService';
import { useToast } from '../../context/ToastContext';
import { MobilePreview } from './MobilePreview';

export const NotificationCenterView: React.FC = () => {
  const { currentAdmin, role, hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();

  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [activeTab, setActiveTab] = useState<'composer' | 'history'>('composer');

  // Form State
  const [title, setTitle] = useState('🔥 Flash Deal: 30% Off Your Favorite Boutiques!');
  const [body, setBody] = useState('Limited time weekend coupon available for local merchants. Tap to claim before midnight.');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80');
  const [route, setRoute] = useState('/products');
  const [customRoute, setCustomRoute] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [customArguments, setCustomArguments] = useState('');
  const [actionTag, setActionTag] = useState('promotion');
  const [priority, setPriority] = useState<NotificationPriority>('high');
  const [sound, setSound] = useState<'default' | 'alert' | 'silent'>('alert');
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Wire Preview Modal/Accordion
  const [showWirePreview, setShowWirePreview] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const canCompose = hasPermission('fcm:compose');
  const canBroadcast = hasPermission('fcm:broadcast');

  useEffect(() => {
    firestoreService.getCampaigns().then((res) => {
      setCampaigns(res.campaigns);
      setIsLive(res.isLive);
      setIsLoading(false);
    });

    const unsubscribe = firestoreService.subscribeToCampaigns((updatedCampaigns) => {
      setCampaigns(updatedCampaigns);
      setIsLive(true);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const effectiveRoute = route === 'custom' ? customRoute.trim() : route;

  // Real-time wire payload preview for topic 'all_users'
  const wirePreview = fcmRestService.buildV1WirePayload({
    title,
    body,
    imageUrl: imageUrl.trim() || undefined,
    route: effectiveRoute || undefined,
    url: externalUrl.trim() || undefined,
    arguments: customArguments.trim() ? customArguments.trim() : undefined,
    action: actionTag,
    priority,
    sound,
  });

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canBroadcast && !canCompose) {
      showError('Permission Denied', 'Your custom claims do not permit dispatching FCM broadcasts');
      return;
    }

    if (!title.trim() || !body.trim()) {
      showError('Incomplete Notification', 'Title and Body are required');
      return;
    }

    let parsedArgs: any = undefined;
    if (customArguments.trim()) {
      try {
        parsedArgs = JSON.parse(customArguments);
      } catch {
        showError('Invalid JSON Arguments', 'Please check the JSON syntax for Custom Arguments');
        return;
      }
    }

    setIsSending(true);

    try {
      const result = await fcmRestService.sendBroadcast(
        {
          title: title.trim(),
          body: body.trim(),
          imageUrl: imageUrl.trim() || undefined,
          route: effectiveRoute || undefined,
          url: externalUrl.trim() || undefined,
          arguments: parsedArgs || (customArguments.trim() ? customArguments.trim() : undefined),
          action: actionTag,
          priority,
          sound,
          scheduleLater,
          scheduledFor: scheduleLater ? scheduledDate : undefined,
        },
        {
          uid: currentAdmin?.uid || 'admin',
          displayName: currentAdmin?.displayName || 'Admin',
          email: currentAdmin?.email || 'admin@tijarah.app',
          role: role,
        }
      );

      console.log('RESPONSE:', result);
      setLastResponse(result);

      const latest = await firestoreService.getCampaigns();
      setCampaigns(latest.campaigns);

      if (scheduleLater) {
        showSuccess(
          'Notification Scheduled',
          `Broadcast to all APK users queued for ${scheduledDate}`
        );
      } else {
        showSuccess(
          'Notification Sent Successfully',
          `Audience: All Users | Topic: all_users | Message ID: ${result.messageId || 'Confirmed'}`
        );
      }

      // Reset form
      setTitle('');
      setBody('');
      setImageUrl('');
      setExternalUrl('');
      setCustomArguments('');
      setActiveTab('history');
    } catch (err: any) {
      console.error('RESPONSE ERROR:', err);
      showError('Notification Failed to Send', err.message || 'FCM rejected the message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>FCM Push Notification Center</h1>
            <span className={`badge ${isLive ? 'badge-success' : 'badge-neutral'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Database size={12} />
              <span>{isLive ? `Live Firestore: CAMPAIGNS (${campaigns.length})` : 'Local Mode'}</span>
            </span>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Radio size={12} />
              <span>Broadcast Mode: All APK Users (/topics/all_users)</span>
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Securely broadcast push notifications to all users who installed the APK via Firebase Cloud Functions and Firebase Admin SDK
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'composer' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('composer')}
          >
            <Send size={15} /> Compose Broadcast
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={15} /> History ({campaigns.length})
          </button>
          <button
            className={`btn btn-sm ${showWirePreview ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowWirePreview(!showWirePreview)}
            title="Inspect Wire Payload"
          >
            <Code size={15} /> Wire Payload
          </button>
        </div>
      </div>

      {/* Wire Payload Inspector (Toggleable) */}
      {showWirePreview && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            border: '1px solid var(--accent-primary)',
            background: 'var(--bg-surface)',
          }}
        >
          <div className="card-header" style={{ paddingBottom: '8px' }}>
            <div className="card-title" style={{ fontSize: '0.95rem' }}>
              <Code size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>FCM Admin SDK Message Payload (Topic: all_users)</span>
            </div>
            <span className="badge badge-success">Backend: sendBroadcastNotification</span>
          </div>

          <div style={{ padding: '0 20px 20px', fontSize: '0.85rem' }}>
            <pre
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                maxHeight: '220px',
                overflowY: 'auto',
                margin: 0,
              }}
            >
              {JSON.stringify(wirePreview, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Last Dispatched Response Viewer */}
      {lastResponse && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            border: `1px solid ${lastResponse.success ? 'var(--status-success)' : 'var(--status-error)'}`,
            background: lastResponse.success ? 'rgba(34, 197, 94, 0.04)' : 'rgba(239, 68, 68, 0.04)',
          }}
        >
          <div className="card-header" style={{ paddingBottom: '6px' }}>
            <div
              className="card-title"
              style={{
                fontSize: '0.9rem',
                color: lastResponse.success ? 'var(--status-success)' : 'var(--status-error)',
              }}
            >
              {lastResponse.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>
                RESPONSE: {lastResponse.success ? 'Broadcast Delivered to FCM' : 'Broadcast Failed'}
              </span>
            </div>
            <button
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
              onClick={() => setLastResponse(null)}
            >
              Dismiss
            </button>
          </div>
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target Topic:</span> <strong>all_users</strong>
              </div>
              <div style={{ fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span> <strong>{lastResponse.status}</strong>
              </div>
              {lastResponse.messageId && (
                <div style={{ fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>FCM Message ID:</span>{' '}
                  <code style={{ fontSize: '0.75rem' }}>{lastResponse.messageId}</code>
                </div>
              )}
            </div>
            <pre
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                maxHeight: '160px',
                overflowY: 'auto',
                margin: 0,
              }}
            >
              {JSON.stringify(lastResponse, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'composer' ? (
        <div className="fcm-grid-layout">
          {/* Form Left */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Send size={18} />
                <span>Compose Broadcast Notification</span>
              </div>
              <span className="badge badge-success">Target: All APK Users</span>
            </div>

            {/* Clean Broadcast Info Banner */}
            <div
              style={{
                margin: '0 20px 16px',
                padding: '12px 14px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.825rem',
              }}
            >
              <Globe size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Automatic Global Audience:</strong>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>
                  This notification will be broadcast to all users who installed the APK via topic{' '}
                  <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px' }}>/topics/all_users</code>.
                </span>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} style={{ padding: '0 20px 20px' }}>
              {/* Title & Body */}
              <div className="form-group">
                <label className="form-label">Notification Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 🔥 Weekend Super Sale!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message Body * (Lockscreen preview text)</label>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. Save 30% on selected boutique items this Friday only."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  rows={3}
                />
              </div>

              {/* Client App Route / Screen & Image */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Link2 size={14} /> App Screen / Route
                  </label>
                  <select
                    className="form-select"
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                  >
                    <option value="/products">📦 Products Catalog (/products)</option>
                    <option value="due-book">📒 Due Payment Book (due-book)</option>
                    <option value="/app-access">🔐 App Access / Login (/app-access)</option>
                    <option value="/orders">🛒 Orders View (/orders)</option>
                    <option value="/settings">⚙️ Settings Screen (/settings)</option>
                    <option value="custom">✏️ Custom Route URI...</option>
                  </select>
                  {route === 'custom' && (
                    <input
                      type="text"
                      className="form-input"
                      style={{ marginTop: '8px' }}
                      placeholder="e.g. /custom-path"
                      value={customRoute}
                      onChange={(e) => setCustomRoute(e.target.value)}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ImageIcon size={14} /> Image Attachment URL (Optional)
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Tag & External Web Link */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Action Type</label>
                  <select
                    className="form-select"
                    value={actionTag}
                    onChange={(e) => setActionTag(e.target.value)}
                  >
                    <option value="promotion">promotion</option>
                    <option value="announcement">announcement</option>
                    <option value="force_update">force_update</option>
                    <option value="due_reminder">due_reminder</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">External Web URL (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://tijarah.app/news"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Custom JSON Arguments */}
              <div className="form-group">
                <label className="form-label">Custom Arguments (Optional JSON, e.g. {`{"filter": "unpaid"}`})</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  placeholder='{"filter": "unpaid"}'
                  value={customArguments}
                  onChange={(e) => setCustomArguments(e.target.value)}
                />
              </div>

              {/* Delivery Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Delivery Priority</label>
                  <select
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as NotificationPriority)}
                  >
                    <option value="high">High (Immediate push delivery)</option>
                    <option value="normal">Normal (Power efficient)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Sound Profile</label>
                  <select
                    className="form-select"
                    value={sound}
                    onChange={(e) => setSound(e.target.value as any)}
                  >
                    <option value="alert">Alert Sound</option>
                    <option value="default">Default Sound</option>
                    <option value="silent">Silent</option>
                  </select>
                </div>
              </div>

              {/* Schedule Checkbox */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={scheduleLater}
                    onChange={(e) => setScheduleLater(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <span>Schedule this broadcast for a future date & time</span>
                </label>
                {scheduleLater && (
                  <input
                    type="datetime-local"
                    className="form-input"
                    style={{ marginTop: '8px' }}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required={scheduleLater}
                  />
                )}
              </div>

              {/* Send Button */}
              <div style={{ marginTop: '20px' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={isSending || (!canBroadcast && !canCompose)}
                  style={{ width: '100%' }}
                >
                  <Send size={18} />
                  <span>
                    {isSending
                      ? 'Broadcasting via Secure Cloud Function...'
                      : scheduleLater
                      ? 'Schedule Broadcast to All Users'
                      : 'Broadcast Push to All APK Users Now'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Device Preview Right */}
          <MobilePreview
            title={title}
            body={body}
            imageUrl={imageUrl}
            deepLink={effectiveRoute || externalUrl}
            sound={sound}
            priority={priority}
          />
        </div>
      ) : (
        /* Dispatched Campaigns Table */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign Title & Message</th>
                <th>Target Topic</th>
                <th>Status</th>
                <th>FCM Message ID</th>
                <th>Route / Action</th>
                <th>Sent At</th>
                <th>Dispatched By</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Loader2 size={18} className="spin-anim" style={{ color: 'var(--accent-primary)' }} />
                      <span>Loading push history from Firestore...</span>
                    </div>
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <Send size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No Broadcast Campaigns in Firestore</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                      Switch to the &ldquo;Compose Broadcast&rdquo; tab above to send push notifications to all users.
                    </div>
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{camp.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{camp.body}</div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary">
                        /topics/all_users
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          camp.status === 'sent_to_fcm' || camp.status === 'completed'
                            ? 'badge-success'
                            : camp.status === 'scheduled'
                            ? 'badge-warning'
                            : camp.status === 'failed'
                            ? 'badge-error'
                            : 'badge-neutral'
                        }`}
                      >
                        {camp.status === 'sent_to_fcm'
                          ? 'Sent to FCM'
                          : camp.status === 'completed'
                          ? 'Delivered'
                          : camp.status === 'failed'
                          ? 'Failed'
                          : camp.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {camp.fcmMessageId ? `${camp.fcmMessageId.substring(0, 24)}...` : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                        {camp.deepLink || '/'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {camp.sentAt
                          ? new Date(camp.sentAt).toLocaleString()
                          : camp.scheduledFor
                          ? `Scheduled: ${new Date(camp.scheduledFor).toLocaleString()}`
                          : 'Queued'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {camp.createdBy?.adminName || 'Admin'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
