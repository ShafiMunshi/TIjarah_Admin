import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Edit2,
  ChevronLeft,
  ChevronRight,
  UserX,
  UserCheck,
  Download,
  Database,
  Flame,
  RefreshCw,
} from 'lucide-react';
import type { AppUser, SubscriptionTier, AccountStatus } from '../../types/users';
import { useAuth } from '../../context/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';
import { EditUserModal } from './EditUserModal';
import { FirebaseConfigModal } from '../firebase/FirebaseConfigModal';

export const UserManagementView: React.FC = () => {
  const { currentAdmin, role, hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();

  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveFirestore, setIsLiveFirestore] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | SubscriptionTier>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [sortField, setSortField] = useState<keyof AppUser>('joinedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AppUser | null>(null);

  const canEdit = hasPermission('users:edit');
  const canManageTier = hasPermission('users:manage_subscription');
  const canExport = hasPermission('users:export');

  // Load users from Firestore / Local
  const loadUsersData = async () => {
    setIsLoading(true);
    try {
      const result = await firestoreService.getUsers();
      setUsersList(result.users);
      setIsLiveFirestore(result.isLiveFirestore);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsersData();

    // Subscribe to live Firestore changes
    const unsubscribe = firestoreService.subscribeToUsers((updatedUsers) => {
      setUsersList(updatedUsers);
      setIsLiveFirestore(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter and Sort
  const filteredUsers = useMemo(() => {
    return usersList
      .filter((u) => {
        const matchesSearch =
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.id.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTier = tierFilter === 'all' || u.tier === tierFilter;
        const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

        return matchesSearch && matchesTier && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === 'string') valA = (valA as string).toLowerCase();
        if (typeof valB === 'string') valB = (valB as string).toLowerCase();

        if (valA! < valB!) return sortOrder === 'asc' ? -1 : 1;
        if (valA! > valB!) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [usersList, searchQuery, tierFilter, statusFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (field: keyof AppUser) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    if (!canEdit) {
      showError('Permission Denied', 'Your custom claims do not permit changing user status');
      return;
    }
    const newStatus: 'active' | 'suspended' = user.status === 'suspended' ? 'active' : 'suspended';

    try {
      await firestoreService.updateUser(
        user.id,
        { status: newStatus },
        {
          uid: currentAdmin?.uid || 'super_admin',
          displayName: currentAdmin?.displayName || 'Admin',
          email: currentAdmin?.email || 'admin@tijarah.app',
          role: role,
        }
      );
      loadUsersData();
      showSuccess(
        `User ${newStatus === 'active' ? 'Activated' : 'Suspended'}`,
        `${user.name} is now ${newStatus}`
      );
    } catch (err: any) {
      showError('Update failed', err.message);
    }
  };

  const handleQuickTierUpgrade = async (user: AppUser, newTier: SubscriptionTier) => {
    if (!canManageTier) {
      showError('Permission Denied', 'Your custom claims do not permit modifying subscription tiers');
      return;
    }
    try {
      const defaultExpire = newTier === 'free' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      await firestoreService.updateUser(
        user.id,
        {
          tier: newTier,
          tierExpiresAt: defaultExpire,
          expireAt: defaultExpire,
          expiresAt: defaultExpire,
        },
        {
          uid: currentAdmin?.uid || 'super_admin',
          displayName: currentAdmin?.displayName || 'Admin',
          email: currentAdmin?.email || 'admin@tijarah.app',
          role: role,
        }
      );
      loadUsersData();
      showSuccess('Tier Updated', `${user.name} set to ${newTier.toUpperCase()}`);
    } catch (err: any) {
      showError('Update failed', err.message);
    }
  };

  const handleExportCSV = () => {
    if (!canExport) {
      showError('Permission Denied', 'Your role cannot export user data records');
      return;
    }
    const headers = ['ID', 'Name', 'Email', 'Tier', 'Expires At', 'Status', 'Joined At', 'Total Spent', 'Country'];
    const rows = filteredUsers.map((u) => [
      u.id,
      u.name,
      u.email,
      u.tier,
      u.expireAt || u.tierExpiresAt || 'Lifetime',
      u.status,
      u.joinedAt,
      u.totalSpent,
      u.country,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tijarah_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('CSV Export Complete', `Exported ${filteredUsers.length} user records`);
  };

  // Helper for rendering remaining days for expireAt
  const renderExpireBadge = (user: AppUser) => {
    const rawExpire = user.expireAt || user.expiresAt || user.tierExpiresAt;
    if (!rawExpire) {
      return (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {user.tier === 'free' ? 'No Expiry (Free)' : 'Lifetime (No Expiry)'}
        </span>
      );
    }

    const expDate = new Date(rawExpire);
    const now = new Date();
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--status-danger)', fontWeight: 600 }}>Expired</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{expDate.toLocaleDateString()}</span>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.8rem', color: diffDays < 30 ? 'var(--status-warning)' : 'var(--text-primary)', fontWeight: 500 }}>
          {expDate.toLocaleDateString()}
        </span>
        <span style={{ fontSize: '0.7rem', color: diffDays < 30 ? '#fcd34d' : 'var(--text-muted)' }}>
          in {diffDays} days
        </span>
      </div>
    );
  };

  return (
    <div>
      <div className="user-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>User Management & Firestore Sync</h1>
            <span
              className={`badge ${isLiveFirestore ? 'badge-success' : 'badge-neutral'}`}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => setIsFirebaseModalOpen(true)}
              title="Click to configure Firebase credentials"
            >
              <Database size={12} />
              <span>{isLiveFirestore ? 'Live Firestore Sync' : 'Simulated / Local Mode'}</span>
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Inspect client accounts, modify tiers, edit the <code style={{ color: '#93c5fd' }}>expireAt</code> field, and manage quotas in Firestore
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsFirebaseModalOpen(true)}
          >
            <Flame size={15} style={{ color: '#f59e0b' }} /> Firebase Settings
          </button>

          <button
            className="btn btn-outline btn-sm btn-icon-only"
            onClick={loadUsersData}
            title="Refresh Users from Firestore"
          >
            <RefreshCw size={15} className={isLoading ? 'spin-anim' : ''} />
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
            disabled={!canExport}
            title={!canExport ? 'Export restricted for your role' : 'Export current filtered table to CSV'}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="filter-toolbar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            className="form-input search-input-field"
            placeholder="Search by name, email, country, or UID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tier:</span>
          <select
            className="form-select"
            style={{ width: '130px', padding: '7px 10px' }}
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Tiers</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
          <select
            className="form-select"
            style={{ width: '130px', padding: '7px 10px' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  User Account <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Subscription Tier</th>
              <th onClick={() => handleSort('tierExpiresAt')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Expires At (<code style={{ color: '#93c5fd' }}>expireAt</code>) <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Status</th>
              <th>Storage Used</th>
              <th onClick={() => handleSort('totalSpent')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Total Spent <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Country</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  {isLoading ? 'Fetching documents from Firestore...' : 'No user records matched your criteria.'}
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => {
                const storagePercent = Math.min(100, Math.round((user.usedStorageMb / user.storageQuotaMb) * 100));

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-identity-cell">
                        <img src={user.avatarUrl} alt={user.name} className="user-avatar-sm" />
                        <div>
                          <div className="user-name-text">{user.name}</div>
                          <div className="user-email-text">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          className={`badge ${
                            user.tier === 'enterprise' ? 'badge-super' : user.tier === 'pro' ? 'badge-manager' : 'badge-neutral'
                          }`}
                        >
                          {user.tier.toUpperCase()}
                        </span>

                        {canManageTier && (
                          <select
                            value={user.tier}
                            onChange={(e) => handleQuickTierUpgrade(user, e.target.value as SubscriptionTier)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                            title="Quick switch tier"
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        )}
                      </div>
                    </td>

                    <td>
                      {renderExpireBadge(user)}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          user.status === 'active'
                            ? 'badge-success'
                            : user.status === 'suspended'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td>
                      <div className="storage-bar-wrapper">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="storage-text">{user.usedStorageMb} MB</span>
                          <span className="storage-text">{storagePercent}%</span>
                        </div>
                        <div className="storage-bar-track">
                          <div
                            className="storage-bar-fill"
                            style={{
                              width: `${storagePercent}%`,
                              backgroundColor: storagePercent > 80 ? 'var(--status-danger)' : 'var(--accent-primary)',
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        ${user.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{user.country}</span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          className="btn btn-secondary btn-sm btn-icon-only"
                          onClick={() => setSelectedUserForEdit(user)}
                          disabled={!canEdit}
                          title={!canEdit ? 'Edit user restricted' : 'Edit profile and expireAt'}
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          className={`btn ${user.status === 'suspended' ? 'btn-primary' : 'btn-danger'} btn-sm btn-icon-only`}
                          onClick={() => handleToggleStatus(user)}
                          disabled={!canEdit}
                          title={user.status === 'suspended' ? 'Unsuspend account' : 'Suspend account'}
                        >
                          {user.status === 'suspended' ? <UserCheck size={14} /> : <UserX size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="pagination-footer">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
          </div>

          <div className="pagination-pages">
            <button
              className="btn btn-secondary btn-sm btn-icon-only"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                className={`page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}

            <button
              className="btn btn-secondary btn-sm btn-icon-only"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      <EditUserModal
        user={selectedUserForEdit}
        isOpen={!!selectedUserForEdit}
        onClose={() => setSelectedUserForEdit(null)}
        onUserUpdated={() => {
          loadUsersData();
        }}
      />

      {/* Firebase Config Modal */}
      <FirebaseConfigModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        onConfigChanged={() => {
          loadUsersData();
        }}
      />
    </div>
  );
};
