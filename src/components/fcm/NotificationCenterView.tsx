import React, { useState, useEffect } from 'react';
import {
  Send,
  Clock,
  Image as ImageIcon,
  Link2,
  Crown,
  TrendingUp,
  Shield,
  Database,
  Loader2,
} from 'lucide-react';
import type { TargetAudience, NotificationPriority, NotificationCampaign } from '../../types/notifications';
import { AUDIENCE_SEGMENTS } from '../../types/notifications';
import { useAuth } from '../../context/AuthContext';
import { firestoreService } from '../../services/firestoreService';
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
  const [deepLink, setDeepLink] = useState('tijarah://promotions/flash_30');
  const [selectedAudience, setSelectedAudience] = useState<TargetAudience>('all_users');
  const [priority, setPriority] = useState<NotificationPriority>('high');
  const [sound, setSound] = useState<'default' | 'alert' | 'silent'>('alert');
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [isSending, setIsSending] = useState(false);

  const canCompose = hasPermission('fcm:compose');
  const canBroadcast = hasPermission('fcm:broadcast');

  const activeSegmentDef = AUDIENCE_SEGMENTS.find((s) => s.id === selectedAudience) || AUDIENCE_SEGMENTS[0];

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

    setIsSending(true);

    try {
      await firestoreService.createCampaign(
        {
          title,
          body,
          imageUrl: imageUrl.trim() || undefined,
          deepLink: deepLink.trim() || undefined,
          audience: selectedAudience,
          audienceEstimatedCount: activeSegmentDef.estimatedCount,
          priority,
          sound,
          scheduleLater,
          scheduledFor: scheduleLater ? scheduledDate : undefined,
        },
        {
          uid: currentAdmin?.uid || 'mkt_admin',
          displayName: currentAdmin?.displayName || 'Marketing Admin',
          email: currentAdmin?.email || 'mkt@tijarah.app',
          role: role,
        }
      );

      const latest = await firestoreService.getCampaigns();
      setCampaigns(latest.campaigns);
      showSuccess(
        scheduleLater ? 'Notification Scheduled in Firestore' : 'FCM Push Broadcast Dispatched & Saved in CAMPAIGNS Collection!',
        `Targeted ${activeSegmentDef.estimatedCount.toLocaleString()} active mobile tokens`
      );

      // Reset form
      setTitle('');
      setBody('');
      setImageUrl('');
      setDeepLink('');
      setActiveTab('history');
    } catch (err: any) {
      showError('Broadcast failed', err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>FCM Push Notification Center</h1>
            <span className={`badge ${isLive ? 'badge-success' : 'badge-neutral'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Database size={12} />
              <span>{isLive ? `Live Firestore: CAMPAIGNS (${campaigns.length} campaigns)` : 'Local Cache'}</span>
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Compose and broadcast high-priority push campaigns to iOS APNs and Android FCM tokens without exposing individual PII
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'composer' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('composer')}
          >
            <Send size={15} /> Compose Campaign
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={15} /> Dispatched History ({campaigns.length})
          </button>
        </div>
      </div>

      {activeTab === 'composer' ? (
        <div className="fcm-grid-layout">
          {/* Form Left */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Send size={18} />
                <span>Compose Push Notification Payload</span>
              </div>
              <span className="badge badge-success">FCM v1 Protocol</span>
            </div>

            <form onSubmit={handleSendBroadcast}>
              {/* Audience Targeting Grid */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>1. Select Target Audience Segment</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                    Estimated Reach: {activeSegmentDef.estimatedCount.toLocaleString()} devices
                  </span>
                </label>

                <div className="audience-segment-grid">
                  {AUDIENCE_SEGMENTS.map((seg) => {
                    const isSelected = selectedAudience === seg.id;
                    return (
                      <div
                        key={seg.id}
                        className={`audience-card-selectable ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedAudience(seg.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {seg.name}
                          </span>
                          {seg.id === 'pro_subscribers' && <Crown size={14} style={{ color: '#f59e0b' }} />}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {seg.description}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', marginTop: '6px' }}>
                          {seg.estimatedCount.toLocaleString()} Tokens
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Title & Body */}
              <div className="form-group" style={{ marginTop: '18px' }}>
                <label className="form-label">2. Notification Title</label>
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
                <label className="form-label">3. Message Body (Lockscreen preview text)</label>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. Save 30% on selected boutique items this Friday only."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>

              {/* Rich Media & Deep Link */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ImageIcon size={14} /> Image Attachment URL (Optional)
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Link2 size={14} /> In-App Deep Link URI (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="tijarah://catalogs/..."
                    value={deepLink}
                    onChange={(e) => setDeepLink(e.target.value)}
                  />
                </div>
              </div>

              {/* Advanced Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Delivery Priority</label>
                  <select
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as NotificationPriority)}
                  >
                    <option value="high">High (Wake device / immediate APNs)</option>
                    <option value="normal">Normal (Power-efficient battery friendly)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Sound Profile</label>
                  <select
                    className="form-select"
                    value={sound}
                    onChange={(e) => setSound(e.target.value as any)}
                  >
                    <option value="alert">Default Alert Sound</option>
                    <option value="default">System Default</option>
                    <option value="silent">Silent (Badge only)</option>
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
                  <span>Schedule this notification for a future date & time</span>
                </label>
                {scheduleLater && (
                  <input
                    type="datetime-local"
                    className="form-input"
                    style={{ marginTop: '8px' }}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                )}
              </div>

              {/* Privacy Guarantee Note */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <Shield size={18} style={{ color: 'var(--status-success)', flexShrink: 0 }} />
                <span>
                  <strong>RBAC Privacy Guarantee:</strong> Broadcast targets topic subscription tokens. Individual customer email addresses, phone records, and billing details are masked from Marketing Admin credentials.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={isSending || (!canBroadcast && !canCompose)}
                  style={{ width: '100%' }}
                >
                  <Send size={18} />
                  <span>
                    {isSending
                      ? 'Dispatching FCM Push...'
                      : scheduleLater
                      ? 'Schedule Notification Broadcast'
                      : `Broadcast to ${activeSegmentDef.estimatedCount.toLocaleString()} Users Now`}
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
            deepLink={deepLink}
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
                <th>Campaign Title & Payload</th>
                <th>Target Segment</th>
                <th>Status</th>
                <th>Delivered / Reach</th>
                <th>Open Rate (CTR)</th>
                <th>Sent At</th>
                <th>Dispatched By</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Loader2 size={18} className="spin" style={{ color: 'var(--accent-primary)' }} />
                      <span>Loading push campaigns from Firestore...</span>
                    </div>
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <Send size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No Broadcast Campaigns in Firestore</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                      Switch to the &ldquo;Campaign Composer&rdquo; tab above to broadcast push notifications to user devices.
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
                    <span className="badge badge-neutral">
                      {camp.audience.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${camp.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                      {camp.status}
                    </span>
                  </td>
                  <td>
                    <div>
                      <span style={{ fontWeight: 600 }}>{camp.metrics.deliveredCount.toLocaleString()}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {' '}/ {camp.audienceEstimatedCount.toLocaleString()} ({camp.metrics.deliveryRatePct}%)
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-success)', fontWeight: 600 }}>
                      <TrendingUp size={14} />
                      <span>{camp.metrics.openRatePct}%</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {camp.sentAt ? new Date(camp.sentAt).toLocaleDateString() : 'Scheduled'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {camp.createdBy.adminName}
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
