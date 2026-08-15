import React, { useState } from 'react';

interface MobilePreviewProps {
  title: string;
  body: string;
  imageUrl?: string;
  deepLink?: string;
  sound?: string;
  priority?: string;
}

export const MobilePreview: React.FC<MobilePreviewProps> = ({
  title,
  body,
  imageUrl,
  deepLink,
}) => {
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="device-preview-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Live Device Push Simulator
        </span>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '2px', borderRadius: 'var(--radius-xs)' }}>
          <button
            onClick={() => setPlatform('ios')}
            className={`btn btn-sm ${platform === 'ios' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
          >
            iOS APNs
          </button>
          <button
            onClick={() => setPlatform('android')}
            className={`btn btn-sm ${platform === 'android' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
          >
            Android
          </button>
        </div>
      </div>

      <div className="device-frame-ios">
        <div className="ios-notch" />
        <div className="ios-clock-time">{timeString}</div>
        <div className="ios-date-text">{dateString}</div>

        {/* Lockscreen Push Notification Card */}
        <div className="ios-push-card">
          <div className="ios-push-header">
            <div className="ios-push-app-info">
              <div className="ios-app-icon">T</div>
              <span className="ios-app-name">Tijarah</span>
            </div>
            <span className="ios-push-time">now</span>
          </div>

          <div className="ios-push-title">
            {title.trim() || 'Notification Title Preview'}
          </div>

          <div className="ios-push-body">
            {body.trim() || 'Your notification body preview will render here in real-time as you compose it.'}
          </div>

          {imageUrl && (
            <img
              src={imageUrl}
              alt="Push attachment"
              className="ios-push-image"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}

          {deepLink && (
            <div style={{ fontSize: '0.68rem', color: '#60a5fa', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              🔗 {deepLink}
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
          Swipe up to open app
        </div>
      </div>
    </div>
  );
};
