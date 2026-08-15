import React, { useState, useEffect } from 'react';
import {
  X,
  Crown,
  Check,
  Calendar,
  MessageSquare,
  Database,
  Plus,
  KeyRound,
} from 'lucide-react';
import type { AppUser, AccountStatus } from '../../types/users';
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

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isPremium, setIsPremium] = useState<number>(0);
  const [expireDate, setExpireDate] = useState<string>('');
  const [messageRemaining, setMessageRemaining] = useState<number>(75);
  const [pinCode, setPinCode] = useState<string>('1111');
  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [status, setStatus] = useState<AccountStatus>('active');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || user.name.split(' ')[0] || '');
      setLastName(user.lastName || user.name.split(' ').slice(1).join(' ') || '');
      setEmail(user.email || '');
      setPhone(user.phone || user.phoneNumber || '');
      setIsPremium(user.is_premium ?? (user.tier === 'pro' || user.tier === 'enterprise' ? 1 : 0));
      setExpireDate(user.expire_date || (user.tierExpiresAt ? user.tierExpiresAt.split('T')[0] : ''));
      setMessageRemaining(user.messageRemaining ?? 75);
      setPinCode(user.pinCode || '1111');
      setIsVerified(user.isVerified ?? true);
      setStatus(user.status || 'active');
      setNotes(user.notes || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const canEditUser = hasPermission('users:edit');
  const canManageTier = hasPermission('users:manage_subscription');
  const isLive = isFirebaseConfigured();

  // Helper for quick date extension
  const handleAddDaysToExpire = (days: number) => {
    const baseDate = expireDate ? new Date(expireDate) : new Date();
    const targetDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    setExpireDate(targetDate.toISOString().split('T')[0]);
  };

  // Helper for message quota adjustment
  const handleAddMessages = (amount: number) => {
    setMessageRemaining((prev) => Math.max(0, prev + amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditUser) {
      showError('Permission Denied', 'Your custom claims do not permit editing user data');
      return;
    }

    try {
      setIsSubmitting(true);
      const computedName = `${firstName.trim()} ${lastName.trim()}`.trim();

      const updated = await firestoreService.updateUser(
        user.id,
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: computedName,
          email: email.trim(),
          phone: phone.trim(),
          phoneNumber: phone.trim(),
          is_premium: Number(isPremium),
          tier: isPremium === 1 ? 'pro' : 'free',
          expire_date: expireDate,
          tierExpiresAt: expireDate ? `${expireDate}T23:59:59Z` : null,
          expireAt: expireDate ? `${expireDate}T23:59:59Z` : null,
          expiresAt: expireDate ? `${expireDate}T23:59:59Z` : null,
          messageRemaining: Number(messageRemaining),
          pinCode: pinCode.trim(),
          isVerified: Boolean(isVerified),
          status,
          notes: notes.trim(),
        },
        {
          uid: currentAdmin?.uid || 'admin',
          displayName: currentAdmin?.displayName || 'Admin',
          email: currentAdmin?.email || 'admin@tijarah.app',
          role: role,
        }
      );

      showSuccess(
        isLive ? 'USERS Document Updated in Firestore!' : 'User Profile Updated',
        `Committed changes to ${computedName} (messageRemaining: ${messageRemaining}, expire_date: ${expireDate || 'None'})`
      );
      onUserUpdated(updated);
      onClose();
    } catch (err: any) {
      showError('Failed to update USERS document', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={user.avatarUrl}
              alt={user.name}
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div className="modal-title">Edit User Record (USERS Collection)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Document ID: <code style={{ fontFamily: 'var(--font-mono)' }}>{user.id}</code></span>
                {isLive && (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                    <Database size={10} /> Live Firestore USERS
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
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* First Name and Last Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">First Name (firstName) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. shafi"
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Last Name (lastName) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. munshi"
                  required
                />
              </div>
            </div>

            {/* Email and Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email (email) *</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. test@mail.com"
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Phone Number (phone)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 01300100574"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* MESSAGE REMAINING QUOTA (messageRemaining) */}
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginTop: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={18} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Message Credits & Quota (<code style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>messageRemaining</code>)
                  </span>
                </div>
                <span className="badge badge-manager">SMS / Messaging</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ width: '160px' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={messageRemaining}
                    onChange={(e) => setMessageRemaining(Number(e.target.value))}
                    min={0}
                    style={{ fontSize: '1.1rem', fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddMessages(25)}
                  >
                    <Plus size={12} /> +25
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddMessages(50)}
                  >
                    <Plus size={12} /> +50
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddMessages(100)}
                  >
                    <Plus size={12} /> +100
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddMessages(500)}
                  >
                    <Plus size={12} /> +500
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setMessageRemaining(0)}
                    style={{ color: 'var(--status-danger)' }}
                  >
                    Reset (0)
                  </button>
                </div>
              </div>
            </div>

            {/* SUBSCRIPTION & EXPIRE DATE (expire_date & is_premium) */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginTop: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crown size={18} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Membership (<code style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>is_premium</code>) & Expiry (<code style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>expire_date</code>)
                  </span>
                </div>
                <span className={`badge ${isPremium === 1 ? 'badge-super' : 'badge-neutral'}`}>
                  {isPremium === 1 ? 'is_premium: 1' : 'is_premium: 0'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Premium Tier (is_premium)</label>
                  <select
                    className="form-select"
                    value={isPremium}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setIsPremium(val);
                      if (val === 1 && !expireDate) {
                        const d = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
                        setExpireDate(d.toISOString().split('T')[0]);
                      }
                    }}
                    disabled={!canManageTier}
                  >
                    <option value={0}>0 — Free Tier (is_premium = 0)</option>
                    <option value={1}>1 — Premium / Pro Merchant (is_premium = 1)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} /> Expiration Date (expire_date)
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={expireDate}
                    onChange={(e) => setExpireDate(e.target.value)}
                    disabled={!canManageTier}
                  />
                </div>
              </div>

              {/* Quick Date Presets */}
              {canManageTier && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Quick expire_date Adjustments:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleAddDaysToExpire(30)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      <Plus size={12} /> +30 Days
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleAddDaysToExpire(90)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      <Plus size={12} /> +3 Months
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleAddDaysToExpire(365)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      <Plus size={12} /> +1 Year
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setExpireDate('')}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                    >
                      Clear Date
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PIN CODE & VERIFICATION (pinCode & isVerified) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <KeyRound size={13} /> Security PIN Code (pinCode)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 1111"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Verification (isVerified)</label>
                <select
                  className="form-select"
                  value={isVerified ? 'true' : 'false'}
                  onChange={(e) => setIsVerified(e.target.value === 'true')}
                >
                  <option value="true">Verified (isVerified = true)</option>
                  <option value="false">Unverified (isVerified = false)</option>
                </select>
              </div>
            </div>

            {/* Status */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Account Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as AccountStatus)}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
              <label className="form-label">Admin Notes</label>
              <textarea
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this user or credit adjustment..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !canEditUser}>
              <Check size={16} />
              <span>{isSubmitting ? 'Updating USERS Document...' : 'Save to USERS Collection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
