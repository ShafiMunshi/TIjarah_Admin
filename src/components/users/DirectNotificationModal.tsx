import React, { useState } from 'react';
import {
  X,
  Send,
  Smartphone,
  ExternalLink,
  Layers,
  Code,
  Shield,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import type { AppUser } from '../../types/users';
import type { NotificationPriority } from '../../types/notifications';
import { useAuth } from '../../context/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';

interface DirectNotificationModalProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DirectNotificationModal: React.FC<DirectNotificationModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const { currentAdmin, role, hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();

  const [title, setTitle] = useState('Account Update');
  const [body, setBody] = useState('Important information regarding your merchant account.');
  const [imageUrl, setImageUrl] = useState('');
  const [targetType, setTargetType] = useState<'user_topic' | 'business_topic' | 'device_token'>('user_topic');
  const [route, setRoute] = useState('/products');
  const [customRoute, setCustomRoute] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [customArgs, setCustomArgs] = useState('{\n  "source": "admin_console"\n}');
  const [action, setAction] = useState('promotion');
  const [priority, setPriority] = useState<NotificationPriority>('high');
  const [sound, setSound] = useState<'default' | 'alert' | 'silent'>('alert');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen || !user) return null;

  const canBroadcast = hasPermission('fcm:broadcast') || hasPermission('fcm:compose') || role === 'super_admin' || role === 'app_manager';

  const effectiveRoute = route === 'custom' ? customRoute.trim() : route;

  // Build client app compliant JSON payload preview
  const payloadPreview = {
    to: targetType === 'user_topic' 
      ? `/topics/user_${user.id}` 
      : targetType === 'business_topic' 
      ? `/topics/business_${user.id}` 
      : user.phone || `DEVICE_TOKEN_${user.id}`,
    notification: {
      title,
      body,
      ...(imageUrl.trim() ? { image: imageUrl.trim() } : {}),
    },
    data: {
      ...(effectiveRoute ? { route: effectiveRoute } : {}),
      ...(externalUrl.trim() ? { url: externalUrl.trim() } : {}),
      ...(customArgs.trim() ? { arguments: customArgs.trim() } : {}),
      ...(action ? { action } : {}),
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canBroadcast) {
      showError('Permission Denied', 'Your role cannot send direct notifications');
      return;
    }

    if (!title.trim() || !body.trim()) {
      showError('Required Fields', 'Title and Body are required');
      return;
    }

    let parsedArgs: any = undefined;
    if (customArgs.trim()) {
      try {
        parsedArgs = JSON.parse(customArgs);
      } catch (_jsonErr) {
        showError('Invalid JSON Arguments', 'Please fix the Custom Arguments JSON syntax');
        return;
      }
    }

    setIsSending(true);
    try {
      await firestoreService.sendDirectNotification(
        {
          targetType,
          targetId: user.id,
          userId: user.id,
          userName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        },
        {
          title: title.trim(),
          body: body.trim(),
          imageUrl: imageUrl.trim() || undefined,
          route: effectiveRoute || undefined,
          url: externalUrl.trim() || undefined,
          arguments: parsedArgs,
          action: action || undefined,
          priority,
          sound,
        },
        {
          uid: currentAdmin?.uid || 'admin',
          displayName: currentAdmin?.displayName || 'Admin',
          email: currentAdmin?.email || 'admin@tijarah.app',
          role: role,
        }
      );

      showSuccess(
        'Direct Notification Dispatched',
        `Sent push message to ${payloadPreview.to}`
      );
      onClose();
    } catch (err: any) {
      showError('Dispatch Failed', err.message || 'Error sending direct notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-primary)' }}>
              <Send size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Targeted Push to User: {user.name || user.firstName || user.id}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Direct targeting schema with Client App FCM Navigation pipeline
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm btn-icon-only" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSend} style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px', padding: '20px' }}>
          {/* Left Column: Form Controls */}
          <div>
            {/* Target Topic Selection */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={14} /> 1. Target Topic Channel
              </label>
              <select
                className="form-select"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as any)}
              >
                <option value="user_topic">
                  Direct User Channel: /topics/user_{user.id}
                </option>
                <option value="business_topic">
                  Store Wide Broadcast: /topics/business_{user.id}
                </option>
                <option value="device_token">
                  Registered Device Token
                </option>
              </select>
            </div>

            {/* Title & Body */}
            <div className="form-group">
              <label className="form-label">2. Notification Title</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Due Payment Reminder"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">3. Message Body</label>
              <textarea
                className="form-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="e.g. Customer Karim has a pending invoice."
                rows={3}
                required
              />
            </div>

            {/* Deep Linking Route */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} /> 4. Client App Screen / Target Route
              </label>
              <select
                className="form-select"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
              >
                <option value="/products">📦 Products Catalog (/products)</option>
                <option value="due-book">📒 Due Payment Book (due-book)</option>
                <option value="/app-access">🔐 App Access / Auth (/app-access)</option>
                <option value="/orders">🛒 Orders Management (/orders)</option>
                <option value="/settings">⚙️ Store Settings (/settings)</option>
                <option value="custom">✏️ Custom Route URI...</option>
              </select>
              {route === 'custom' && (
                <input
                  type="text"
                  className="form-input"
                  style={{ marginTop: '8px' }}
                  placeholder="e.g. /custom-screen"
                  value={customRoute}
                  onChange={(e) => setCustomRoute(e.target.value)}
                />
              )}
            </div>

            {/* Image Attachment URL */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

            {/* External URL */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ExternalLink size={14} /> 5. External Web Link (Optional)
              </label>
              <input
                type="url"
                className="form-input"
                placeholder="https://tijarah.app/news"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
              />
            </div>

            {/* Custom Arguments JSON */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code size={14} /> 6. Custom Payload Arguments (JSON)
              </label>
              <textarea
                className="form-textarea"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
                rows={3}
                placeholder='{"filter": "unpaid"}'
              />
            </div>

            {/* Priority, Action & Sound */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Action Tag</label>
                <select
                  className="form-select"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  <option value="promotion">promotion</option>
                  <option value="force_update">force_update</option>
                  <option value="due_reminder">due_reminder</option>
                  <option value="system_alert">system_alert</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                >
                  <option value="high">High (Wake)</option>
                  <option value="normal">Normal</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sound</label>
                <select
                  className="form-select"
                  value={sound}
                  onChange={(e) => setSound(e.target.value as any)}
                >
                  <option value="alert">Alert</option>
                  <option value="default">Default</option>
                  <option value="silent">Silent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column: Live Client App JSON Payload Spec */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Code size={14} style={{ color: 'var(--accent-primary)' }} />
                  FCM v1 Wire Payload Preview
                </div>
                <span className="badge badge-manager" style={{ fontSize: '0.7rem' }}>Client App Compatible</span>
              </div>

              <pre
                style={{
                  background: '#0d1117',
                  color: '#58a6ff',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  overflowX: 'auto',
                  lineHeight: '1.45',
                  flex: 1,
                  margin: 0,
                }}
              >
                {JSON.stringify(payloadPreview, null, 2)}
              </pre>

              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '10px 12px',
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.75rem',
                  color: 'var(--status-success)',
                }}
              >
                <Shield size={14} style={{ flexShrink: 0 }} />
                <span>
                  Delivers to foreground heads-up banner & cold-start navigator in Flutter client.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={onClose}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-md"
                disabled={isSending || !canBroadcast}
                style={{ flex: 1.5 }}
              >
                {isSending ? (
                  <>
                    <Loader2 size={16} className="spin-anim" /> Dispatching...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send Push to User
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
