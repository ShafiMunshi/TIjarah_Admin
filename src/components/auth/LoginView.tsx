import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  Flame,
  Shield,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getStoredFirebaseConfig } from '../../services/firebaseClient';
import { FirebaseConfigModal } from '../firebase/FirebaseConfigModal';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { loginWithCredentials, loginAnonymously } = useAuth();
  const { showSuccess, showError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);

  const storedConfig = getStoredFirebaseConfig();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email.trim() || !password) {
      setAuthError('Please enter both your administrator work email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const admin = await loginWithCredentials(email.trim(), password);
      showSuccess('Authenticated Successfully', `Welcome back, ${admin.displayName || admin.email}`);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      const msg = err.message || 'Firebase Authentication failed.';
      setAuthError(msg);
      showError('Authentication Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousAuth = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await loginAnonymously();
      showSuccess('Anonymous Auth Successful', 'Authenticated with Firebase Auth token');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      const msg = err.message || 'Anonymous sign-in failed. Please verify Anonymous Auth is enabled in Firebase Console.';
      setAuthError(msg);
      showError('Anonymous Auth Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        padding: '24px',
        position: 'relative',
        background: 'radial-gradient(ellipse at top, rgba(30, 41, 59, 0.45) 0%, rgba(11, 15, 23, 1) 75%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header with Project info */}
        <div
          style={{
            padding: '30px 32px 22px',
            textAlign: 'center',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 14px',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1.4rem',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
            }}
          >
            T
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Tijarah Admin Portal
          </h1>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Administrator Access Only
          </p>

          {/* Firebase Connection Status Banner */}
          <div
            style={{
              marginTop: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
            }}
            onClick={() => setIsFirebaseModalOpen(true)}
            title="Click to view or edit Firebase configuration"
          >
            <Flame size={14} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Project: <strong style={{ color: 'var(--text-primary)' }}>{storedConfig?.projectId || 'Not Configured'}</strong>
            </span>
          </div>
        </div>

        {/* Error Notice if Firebase Auth rejected */}
        {authError && (
          <div
            style={{
              margin: '18px 24px 0',
              padding: '12px 14px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <AlertCircle size={17} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.4 }}>
              <strong>Authentication Notice:</strong> {authError}
            </div>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSignIn} style={{ padding: '24px 28px 20px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={13} /> Admin Work Email
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. admin@tijarah.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={13} /> Password
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', gap: '10px' }}
            disabled={isLoading}
          >
            <span>{isLoading ? 'Authenticating with Firebase...' : 'Sign In to Admin Console'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Notice for new admins */}
        <div
          style={{
            padding: '16px 28px 20px',
            background: 'rgba(0, 0, 0, 0.22)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '14px' }}>
            <Shield size={14} style={{ color: '#38bdf8', marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              Public registration is disabled. Administrator accounts and role permissions can only be created by an authorized <strong>Super Admin</strong>.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAnonymousAuth}
            disabled={isLoading}
            style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '8px 12px' }}
            title="Sign in with an anonymous Firebase Auth token (passes Firestore request.auth != null rule)"
          >
            <Zap size={14} style={{ color: '#f59e0b' }} />
            <span>Sign In Anonymously (Quick Rules Check)</span>
          </button>
        </div>
      </div>

      <FirebaseConfigModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />
    </div>
  );
};
