import React, { useState, useEffect } from 'react';
import {
  X,
  Flame,
  Check,
  UploadCloud,
} from 'lucide-react';
import {
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  initFirebase,
} from '../../services/firebaseClient';
import type { FirebaseConfigOptions } from '../../services/firebaseClient';
import { firestoreService } from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged?: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const { showSuccess, showError, showInfo } = useToast();

  const [config, setConfig] = useState<FirebaseConfigOptions>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });

  const [rawJson, setRawJson] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredFirebaseConfig();
      if (stored) {
        setConfig(stored);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleParseJson = () => {
    try {
      let clean = rawJson.trim();
      if (clean.includes('=')) {
        clean = clean.substring(clean.indexOf('=') + 1).trim();
      }
      if (clean.endsWith(';')) {
        clean = clean.substring(0, clean.length - 1).trim();
      }

      const formattedJson = clean.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":').replace(/'/g, '"');
      const parsed = JSON.parse(formattedJson);

      if (parsed.apiKey && parsed.projectId) {
        setConfig({
          apiKey: parsed.apiKey || '',
          authDomain: parsed.authDomain || `${parsed.projectId}.firebaseapp.com`,
          projectId: parsed.projectId || '',
          storageBucket: parsed.storageBucket || `${parsed.projectId}.appspot.com`,
          messagingSenderId: parsed.messagingSenderId || '',
          appId: parsed.appId || '',
        });
        showSuccess('Firebase Config Parsed', `Target Project: ${parsed.projectId}`);
      } else {
        showError('Invalid Config JSON', 'JSON must include at least apiKey and projectId');
      }
    } catch (e: any) {
      showError('Parse Error', 'Could not parse JSON format. Please verify standard key-value pairs.');
    }
  };

  const handleSaveAndConnect = () => {
    if (!config.apiKey.trim() || !config.projectId.trim()) {
      showError('Incomplete Configuration', 'API Key and Project ID are required');
      return;
    }

    try {
      saveStoredFirebaseConfig(config);
      initFirebase(config);
      setIsConnected(true);
      showSuccess('Firebase Connected', `Connected to project: ${config.projectId}`);
      if (onConfigChanged) onConfigChanged();
      onClose();
    } catch (err: any) {
      showError('Connection Failed', err.message);
    }
  };

  const handleDisconnect = () => {
    saveStoredFirebaseConfig(null);
    setConfig({
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
    });
    setIsConnected(false);
    showInfo('Disconnected from Firebase', 'Reverted to local simulation mode');
    if (onConfigChanged) onConfigChanged();
  };

  const handleSeedFirestore = async () => {
    setIsSeeding(true);
    try {
      const result = await firestoreService.seedFirestoreWithInitialUsers();
      showSuccess('Firestore Populated!', `Created ${result.count} user documents in collection "users"`);
      if (onConfigChanged) onConfigChanged();
    } catch (err: any) {
      showError('Seed Failed', err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.12)', borderRadius: 'var(--radius-sm)', color: '#f59e0b' }}>
              <Flame size={22} />
            </div>
            <div>
              <div className="modal-title">Firebase & Firestore Integration</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Connect your real Firebase project to fetch and edit live Firestore collections
              </div>
            </div>
          </div>
          <button className="toast-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {/* Status Indicator */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              background: isConnected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface)',
              border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#10b981' : '#f59e0b',
                  boxShadow: `0 0 8px ${isConnected ? '#10b981' : '#f59e0b'}`,
                }}
              />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isConnected ? `Connected: ${config.projectId}` : 'Running in Local Cache / Simulation Mode'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {isConnected
                    ? 'Reads and writes are synchronized with your live Firestore database.'
                    : 'Provide Firebase keys below to fetch real data from your cloud database.'}
                </div>
              </div>
            </div>

            {isConnected && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleSeedFirestore}
                  disabled={isSeeding}
                  title="Upload initial user schemas to your Firestore collection"
                >
                  <UploadCloud size={14} />
                  <span>{isSeeding ? 'Writing to Firestore...' : 'Seed Firestore Users'}</span>
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Quick Paste JSON */}
          <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Paste Firebase Web SDK Config Snippet</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleParseJson}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              >
                Auto-Fill Fields
              </button>
            </label>
            <textarea
              className="form-textarea"
              style={{ minHeight: '70px', fontSize: '0.775rem', fontFamily: 'var(--font-mono)' }}
              placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "tijarah-app.firebaseapp.com",\n  projectId: "tijarah-app",\n  storageBucket: "tijarah-app.appspot.com",\n  messagingSenderId: "123456",\n  appId: "1:123456:web:abcd"\n};`}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
            />
          </div>

          {/* Explicit Input Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Project ID *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. tijarah-commerce-prod"
                value={config.projectId}
                onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">API Key (apiKey) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="AIzaSy..."
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Auth Domain (authDomain)</label>
              <input
                type="text"
                className="form-input"
                placeholder="your-project.firebaseapp.com"
                value={config.authDomain}
                onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">App ID (appId)</label>
              <input
                type="text"
                className="form-input"
                placeholder="1:123456:web:abcdef"
                value={config.appId}
                onChange={(e) => setConfig({ ...config, appId: e.target.value })}
              />
            </div>
          </div>

          {/* Firestore Schema Guide */}
          <div style={{ marginTop: '20px', padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #3b82f6', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Firestore `users` Collection Schema:</strong>
            <div style={{ marginTop: '4px' }}>
              Documents inside <code style={{ color: '#93c5fd' }}>/users/{'{userId}'}</code> can contain fields:
              <ul style={{ paddingLeft: '18px', marginTop: '4px' }}>
                <li><code>name</code> (string), <code>email</code> (string), <code>phoneNumber</code> (string)</li>
                <li><code>tier</code> ('free' | 'pro' | 'enterprise')</li>
                <li><strong style={{ color: '#fcd34d' }}><code>expireAt</code> or <code>tierExpiresAt</code></strong> (Firestore Timestamp or ISO Date)</li>
                <li><code>status</code> ('active' | 'suspended' | 'pending')</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSaveAndConnect}>
            <Check size={16} /> Save & Connect Live Database
          </button>
        </div>
      </div>
    </div>
  );
};
