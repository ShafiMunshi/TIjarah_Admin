import React, { useState } from 'react';
import {
  X,
  Crown,
  Check,
  Calendar,
  HardDrive,
  Database,
  Plus,
} from 'lucide-react';
import type { AppUser, SubscriptionTier, AccountStatus } from '../../types/users';
import { useAuth } from '../../context/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { isFirebaseConfigured } from '../../services/firebaseClient';
import { useToast } from '../../context/ToastContext';

interface EditUserModalProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (updatedUser: AppUser) => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserUpdated,
}) => {
  const { currentAdmin, role, hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();

  if (!isOpen || !user) return null;

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber);
  const [tier, setTier] = useState<SubscriptionTier>(user.tier);
  const [status, setStatus] = useState<AccountStatus>(user.status);
  const [storageQuotaMb, setStorageQuotaMb] = useState<number>(user.storageQuotaMb);
  const [notes, setNotes] = useState<string>(user.notes || '');

  // expireAt / tierExpiresAt state
  const getInitialExpire = () => {
    const raw = user.expireAt || user.expiresAt || user.tierExpiresAt;
    if (!raw) return '';
    try {
      const d = new Date(raw);
      return d.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  const [expireAt, setExpireAt] = useState<string>(getInitialExpire());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEditUser = hasPermission('users:edit');
  const canManageTier = hasPermission('users:manage_subscription');
  const isLive = isFirebaseConfigured();

  const handleAddDays = (days: number) => {
    const baseDate = expireAt ? new Date(expireAt) : new Date();
    const targetDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    setExpireAt(targetDate.toISOString().slice(0, 16));
  };

  const handleSetLifetime = () => {
    setExpireAt('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditUser) {
      showError('Permission Denied', 'Your custom claims do not permit editing user data');
      return;
    }

    try {
      setIsSubmitting(true);

      const formattedExpireAt = expireAt ? new Date(expireAt).toISOString() : null;

      const updated = await firestoreService.updateUser(
        user.id,
        {
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          tier,
          status,
          storageQuotaMb: Number(storageQuotaMb),
          notes: notes.trim(),
          expireAt: formattedExpireAt,
          expiresAt: formattedExpireAt,
          tierExpiresAt: formattedExpireAt,
        },
        {
          uid: currentAdmin?.uid || 'super_admin',
          displayName: currentAdmin?.displayName || 'Admin',
          email: currentAdmin?.email || 'admin@tijarah.app',
          role: role,
        }
      );

      showSuccess(
        isLive ? 'Firestore Document Updated!' : 'User Profile Updated',
        `Committed changes to ${updated.name} (Tier: ${updated.tier.toUpperCase()}, expireAt: ${
          formattedExpireAt ? new Date(formattedExpireAt).toLocaleDateString() : 'Lifetime'
        })`
      );
      onUserUpdated(updated);
      onClose();
    } catch (err: any) {
      showError('Failed to update user in Firestore', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={user.avatarUrl}
              alt={user.name}
              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div className="modal-title">Edit User & Subscription Expiry</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Doc UID: <code style={{ fontFamily: 'var(--font-mono)' }}>{user.id}</code></span>
                {isLive && (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                    <Database size={10} /> Live Firestore
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="toast-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
            {/* Identity Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+966..."
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Account Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AccountStatus)}
                >
                  <option value="active">Active (Full Access)</option>
                  <option value="pending">Pending Verification</option>
                  <option value="suspended">Suspended (Blocked)</option>
                  <option value="flagged">Flagged for Review</option>
                </select>
              </div>
            </div>

            {/* EXPIRATION & SUBSCRIPTION TIER BOX (Firestore expireAt field) */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginTop: '18px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crown size={18} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Subscription Tier & Firestore <code style={{ color: '#93c5fd', fontSize: '0.85rem' }}>expireAt</code>
                  </span>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
                  Firestore Timestamp
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Subscription Tier</label>
                  <select
                    className="form-select"
                    value={tier}
                    onChange={(e) => {
                      const newTier = e.target.value as SubscriptionTier;
                      setTier(newTier);
                      if (newTier !== 'free' && !expireAt) {
                        const d = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
                        setExpireAt(d.toISOString().slice(0, 16));
                      }
                    }}
                    disabled={!canManageTier}
                  >
                    <option value="free">Free Tier</option>
                    <option value="pro">Pro Merchant Tier ($49/mo)</option>
                    <option value="enterprise">Enterprise Tier ($199/mo)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} /> Expiration Date & Time (<code style={{ color: '#93c5fd' }}>expireAt</code>)
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={expireAt}
                    onChange={(e) => setExpireAt(e.target.value)}
                    disabled={!canManageTier}
                  />
                </div>
              </div>

              {/* Quick Date Extension Presets */}
              {canManageTier && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Quick Expiration Adjustments:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleAddDays(30)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      <Plus size={12} /> +30 Days
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleAddDays(90)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      <Plus size={12} /> +3 Months
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleAddDays(180)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      <Plus size={12} /> +6 Months
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleAddDays(365)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      <Plus size={12} /> +1 Year
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleSetLifetime}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#93c5fd' }}
                    >
                      Clear (Lifetime)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Storage Quota */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <HardDrive size={13} /> Storage Quota (MB)
              </label>
              <input
                type="number"
                className="form-input"
                value={storageQuotaMb}
                onChange={(e) => setStorageQuotaMb(Number(e.target.value))}
                min={100}
                step={512}
              />
            </div>

            {/* Administrative Context Notes */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Internal Administrative & Audit Notes</label>
              <textarea
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for modifying customer record or extending subscription..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !canEditUser}>
              <Check size={16} />
              <span>{isSubmitting ? 'Saving to Firestore...' : 'Save to Firestore'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
