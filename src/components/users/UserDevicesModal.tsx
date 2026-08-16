import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Apple,
  Globe,
  Clock,
  KeyRound,
  Copy,
  Check,
  Send,
  Loader2,
} from 'lucide-react';
import type { AppUser, UserDevice } from '../../types/users';
import { firestoreService } from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';

interface UserDevicesModalProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSendNotificationToUser: (user: AppUser) => void;
}

export const UserDevicesModal: React.FC<UserDevicesModalProps> = ({
  user,
  isOpen,
  onClose,
  onSendNotificationToUser,
}) => {
  const { showSuccess } = useToast();
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setIsLoading(true);
      firestoreService
        .getUserDevices(user.id)
        .then((devs) => {
          setDevices(devs);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn('Failed to load devices:', err);
          setIsLoading(false);
        });
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    showSuccess('Copied to Clipboard', 'FCM Device Token copied');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('ios') || p.includes('apple')) {
      return <Apple size={16} style={{ color: 'var(--text-primary)' }} />;
    }
    if (p.includes('android')) {
      return <Smartphone size={16} style={{ color: '#22c55e' }} />;
    }
    return <Globe size={16} style={{ color: '#3b82f6' }} />;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius-sm)', color: 'var(--status-success)' }}>
              <Smartphone size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Registered Devices for {user.name || user.firstName}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Subcollection: <code>USERS/{user.id}/DEVICES</code>
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm btn-icon-only" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Header Info */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Direct Target Channel: <code>/topics/user_{user.id}</code>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Auto-subscribed upon login in Client App <code>notification_repository.dart</code>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                onClose();
                onSendNotificationToUser(user);
              }}
            >
              <Send size={13} /> Send Push to User
            </button>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="spin-anim" style={{ margin: '0 auto 8px', color: 'var(--accent-primary)' }} />
              <div style={{ fontSize: '0.85rem' }}>Loading devices from Firestore subcollection...</div>
            </div>
          ) : devices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              <Smartphone size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No Active Devices Registered</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                This user has not synced a device token in <code>USERS/{user.id}/DEVICES</code> yet.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {devices.map((device, idx) => {
                const isCopied = copiedToken === device.fcmToken;
                return (
                  <div
                    key={device.fcmToken || idx}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getPlatformIcon(device.platform)}
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {device.deviceModel || (device.platform.toUpperCase() + ' Device')}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          {device.appVersion || 'v3.5.0'}
                        </span>
                        {device.osVersion && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ({device.osVersion})
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Clock size={12} />
                        <span>Last Active: {new Date(device.lastUpdated || '').toLocaleString()}</span>
                      </div>
                    </div>

                    {/* FCM Token Display */}
                    <div
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <KeyRound size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {device.fcmToken}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.72rem', gap: '4px', flexShrink: 0 }}
                        onClick={() => handleCopy(device.fcmToken)}
                      >
                        {isCopied ? <Check size={12} style={{ color: 'var(--status-success)' }} /> : <Copy size={12} />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-md" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
