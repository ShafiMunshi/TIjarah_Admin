import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Download,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MessageSquare,
  EyeOff,
  Mail,
  User,
  Calendar,
  Crown,
  RotateCcw,
  Filter,
} from 'lucide-react';
import type { AppUser } from '../../types/users';
import { useAuth } from '../../context/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';
import { EditUserModal } from './EditUserModal';

export const UserManagementView: React.FC = () => {
  const { role, hasPermission } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();

  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveFirestore, setIsLiveFirestore] = useState(false);
  const [connectedCollection, setConnectedCollection] = useState('USERS');
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Dedicated Filter & Search States
  const [nameSearch, setNameSearch] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [datePreset, setDatePreset] = useState<'all' | '7d' | '30d' | '90d' | 'this_year'>('all');
  const [premiumFilter, setPremiumFilter] = useState<'all' | 'premium' | 'free'>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  // Sorting & Pagination
  const [sortField, setSortField] = useState<keyof AppUser>('joinedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AppUser | null>(null);

  const canEdit = hasPermission('users:edit');
  const canViewEmail = hasPermission('users:view_email') || role === 'super_admin';
  const canExport = hasPermission('users:export');

  // Load users from Firestore / Local
  const loadUsersData = async () => {
    setIsLoading(true);
    try {
      const result = await firestoreService.getUsers();
      setUsersList(result.users);
      setIsLiveFirestore(result.isLiveFirestore);
      setConnectedCollection(result.collectionName);
      setFirestoreError(result.error || null);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setFirestoreError(err?.message || 'Error fetching users from Firestore');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsersData();

    // Real-time Firestore subscription to 'USERS'
    const unsubscribe = firestoreService.subscribeToUsers((res) => {
      if (res.isLive) {
        setUsersList(res.users);
        setIsLiveFirestore(true);
        setFirestoreError(null);
      } else if (res.error) {
        setFirestoreError(res.error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Quick Date Range Preset Handler
  const handleSelectDatePreset = (preset: 'all' | '7d' | '30d' | '90d' | 'this_year') => {
    setDatePreset(preset);
    const now = new Date();
    const toDateStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setCreatedFrom('');
      setCreatedTo('');
    } else if (preset === '7d') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setCreatedFrom(past.toISOString().split('T')[0]);
      setCreatedTo(toDateStr);
    } else if (preset === '30d') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setCreatedFrom(past.toISOString().split('T')[0]);
      setCreatedTo(toDateStr);
    } else if (preset === '90d') {
      const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      setCreatedFrom(past.toISOString().split('T')[0]);
      setCreatedTo(toDateStr);
    } else if (preset === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      setCreatedFrom(startOfYear.toISOString().split('T')[0]);
      setCreatedTo(toDateStr);
    }
    setCurrentPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setNameSearch('');
    setEmailSearch('');
    setCreatedFrom('');
    setCreatedTo('');
    setDatePreset('all');
    setPremiumFilter('all');
    setVerifiedFilter('all');
    setCurrentPage(1);
    showInfo('Filters Cleared', 'Displaying all records');
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (nameSearch.trim()) count++;
    if (emailSearch.trim()) count++;
    if (createdFrom || createdTo) count++;
    if (premiumFilter !== 'all') count++;
    if (verifiedFilter !== 'all') count++;
    return count;
  }, [nameSearch, emailSearch, createdFrom, createdTo, premiumFilter, verifiedFilter]);

  // Main Filtering and Sorting Logic
  const filteredUsers = useMemo(() => {
    return usersList
      .filter((u) => {
        // 1. Name Searching (firstName, lastName, or name)
        if (nameSearch.trim()) {
          const query = nameSearch.toLowerCase();
          const first = (u.firstName || '').toLowerCase();
          const last = (u.lastName || '').toLowerCase();
          const full = (u.name || `${first} ${last}`).toLowerCase();
          if (!first.includes(query) && !last.includes(query) && !full.includes(query)) {
            return false;
          }
        }

        // 2. Email Searching
        if (emailSearch.trim()) {
          const query = emailSearch.toLowerCase();
          const email = (u.email || '').toLowerCase();
          if (!email.includes(query)) {
            return false;
          }
        }

        // 3. Premium User Searching (is_premium: 1 vs 0)
        if (premiumFilter === 'premium' && u.is_premium !== 1) return false;
        if (premiumFilter === 'free' && u.is_premium === 1) return false;

        // 4. Verification Filtering
        if (verifiedFilter === 'verified' && !u.isVerified) return false;
        if (verifiedFilter === 'unverified' && u.isVerified) return false;

        // 5. Created At Date Range Searching
        if (createdFrom || createdTo) {
          const userJoinedDate = u.joinedAt ? new Date(u.joinedAt).toISOString().split('T')[0] : '';
          if (createdFrom && userJoinedDate < createdFrom) return false;
          if (createdTo && userJoinedDate > createdTo) return false;
        }

        return true;
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
  }, [usersList, nameSearch, emailSearch, premiumFilter, verifiedFilter, createdFrom, createdTo, sortField, sortOrder]);

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

  const handleExportCSV = () => {
    if (!canExport) {
      showError('Permission Denied', 'Your role cannot export user data records');
      return;
    }
    const headers = ['UID', 'First Name', 'Last Name', 'Email', 'Phone', 'Is Premium', 'Expire Date', 'Message Remaining', 'Created At', 'Is Verified'];
    const rows = filteredUsers.map((u) => [
      u.id,
      u.firstName || '',
      u.lastName || '',
      canViewEmail ? u.email : '***@***.com',
      u.phone || '',
      u.is_premium === 1 ? '1 (Premium)' : '0 (Free)',
      u.expire_date || 'None',
      u.messageRemaining || 0,
      u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : '',
      u.isVerified ? 'Yes' : 'No',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tijarah_users_collection_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('CSV Export Complete', `Exported ${filteredUsers.length} user records from USERS collection`);
  };

  // Helper for masking email if userEmailView permission is missing
  const formatEmail = (rawEmail: string) => {
    if (canViewEmail) return rawEmail;
    if (!rawEmail) return 'No email';
    const parts = rawEmail.split('@');
    if (parts.length < 2) return '***';
    return `${parts[0].slice(0, 2)}***@***.${parts[1].split('.').pop() || 'com'}`;
  };

  // Helper for rendering expire_date with remaining days badge
  const renderExpireBadge = (user: AppUser) => {
    const rawDate = user.expire_date || user.expireAt || user.expiresAt;
    if (!rawDate) {
      return (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {user.is_premium === 1 ? 'Lifetime' : 'None (Free)'}
        </span>
      );
    }

    try {
      const expDate = new Date(rawDate);
      const now = new Date();
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--status-danger)', fontWeight: 600 }}>Expired</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{rawDate}</span>
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', color: diffDays < 30 ? '#fcd34d' : 'var(--text-primary)', fontWeight: 500 }}>
            {rawDate}
          </span>
          <span style={{ fontSize: '0.7rem', color: diffDays < 30 ? 'var(--status-warning)' : 'var(--text-muted)' }}>
            in {diffDays} days
          </span>
        </div>
      );
    } catch {
      return <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{rawDate}</span>;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="user-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>USERS Collection Data Table</h1>
            <span
              className={`badge ${isLiveFirestore ? 'badge-success' : 'badge-neutral'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Database size={12} />
              <span>
                {isLiveFirestore ? `Live Firestore: ${connectedCollection} (${usersList.length} docs)` : 'Local Mode / Firestore Notice'}
              </span>
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Synchronized with <code style={{ color: '#93c5fd' }}>{connectedCollection}</code> collection. Filter by name, email, created range, and premium tier. Manage <code style={{ color: '#93c5fd' }}>messageRemaining</code> and <code style={{ color: '#93c5fd' }}>expire_date</code>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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

      {/* Firestore Diagnostic / Error Banner if connection or permission failed */}
      {firestoreError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <XCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fca5a5' }}>
                Firestore Connection Notice
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                {firestoreError}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED MULTI-FIELD SEARCH & FILTER TOOLBAR */}
      <div className="filter-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Advanced Search & Range Filter
            </span>
            {activeFiltersCount > 0 && (
              <span className="badge badge-manager" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                {activeFiltersCount} Active {activeFiltersCount === 1 ? 'Filter' : 'Filters'}
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              className="btn btn-outline btn-sm"
              onClick={handleResetFilters}
              style={{ padding: '3px 10px', fontSize: '0.75rem', gap: '5px' }}
            >
              <RotateCcw size={12} /> Clear All Filters
            </button>
          )}
        </div>

        {/* Search Row: Name, Email, Premium, Created At Range */}
        <div className="filter-grid-row">
          {/* 1. Name Searching Box */}
          <div className="filter-item-group">
            <label className="filter-item-label">
              <User size={13} /> Name Search
            </label>
            <div className="search-input-wrapper">
              <Search size={15} className="search-icon-inside" />
              <input
                type="text"
                className="form-input search-input-field"
                placeholder="Search by first / last name..."
                value={nameSearch}
                onChange={(e) => {
                  setNameSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* 2. Email Searching Box (Placed prominently right above email field) */}
          <div className="filter-item-group">
            <label className="filter-item-label">
              <Mail size={13} /> Email Search
            </label>
            <div className="search-input-wrapper">
              <Mail size={15} className="search-icon-inside" />
              <input
                type="text"
                className="form-input search-input-field"
                placeholder="Search email (e.g. @mail.com)..."
                value={emailSearch}
                onChange={(e) => {
                  setEmailSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* 3. Premium Status Filter Box */}
          <div className="filter-item-group">
            <label className="filter-item-label">
              <Crown size={13} /> Premium Membership
            </label>
            <select
              className="form-select"
              value={premiumFilter}
              onChange={(e) => {
                setPremiumFilter(e.target.value as any);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Memberships</option>
              <option value="premium">⭐ Premium (is_premium = 1)</option>
              <option value="free">Free Tier (is_premium = 0)</option>
            </select>
          </div>

          {/* 4. Verification Filter */}
          <div className="filter-item-group">
            <label className="filter-item-label">
              <CheckCircle2 size={13} /> Verification
            </label>
            <select
              className="form-select"
              value={verifiedFilter}
              onChange={(e) => {
                setVerifiedFilter(e.target.value as any);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Accounts</option>
              <option value="verified">Verified (isVerified = true)</option>
              <option value="unverified">Unverified (isVerified = false)</option>
            </select>
          </div>
        </div>

        {/* 5. Created At Date Range Filter Row */}
        <div style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span className="filter-item-label" style={{ margin: 0 }}>
              <Calendar size={13} /> Created At Range:
            </span>

            <div className="date-range-container">
              <input
                type="date"
                className="form-input"
                style={{ width: '145px', padding: '5px 8px', fontSize: '0.8rem' }}
                value={createdFrom}
                onChange={(e) => {
                  setCreatedFrom(e.target.value);
                  setDatePreset('all');
                  setCurrentPage(1);
                }}
                title="From Date"
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                className="form-input"
                style={{ width: '145px', padding: '5px 8px', fontSize: '0.8rem' }}
                value={createdTo}
                onChange={(e) => {
                  setCreatedTo(e.target.value);
                  setDatePreset('all');
                  setCurrentPage(1);
                }}
                title="To Date"
              />
            </div>

            {/* Quick Range Preset Pills */}
            <div className="date-preset-pills">
              <button
                type="button"
                className={`preset-pill-btn ${datePreset === 'all' && !createdFrom ? 'active' : ''}`}
                onClick={() => handleSelectDatePreset('all')}
              >
                All Time
              </button>
              <button
                type="button"
                className={`preset-pill-btn ${datePreset === '7d' ? 'active' : ''}`}
                onClick={() => handleSelectDatePreset('7d')}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                className={`preset-pill-btn ${datePreset === '30d' ? 'active' : ''}`}
                onClick={() => handleSelectDatePreset('30d')}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                className={`preset-pill-btn ${datePreset === '90d' ? 'active' : ''}`}
                onClick={() => handleSelectDatePreset('90d')}
              >
                Last 90 Days
              </button>
              <button
                type="button"
                className={`preset-pill-btn ${datePreset === 'this_year' ? 'active' : ''}`}
                onClick={() => handleSelectDatePreset('this_year')}
              >
                This Year
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Found <strong style={{ color: 'var(--text-primary)' }}>{filteredUsers.length}</strong> matching users
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', width: '22%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  User Account <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('email')} style={{ cursor: 'pointer', width: '20%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Email Address <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Phone</th>
              <th onClick={() => handleSort('is_premium')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Membership <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('messageRemaining')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Messages Left <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('expire_date')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Expire Date <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('joinedAt')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Created At <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Verified</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <Search size={28} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {isLoading ? 'Fetching documents from USERS collection in Firestore...' : 'No users match your search criteria'}
                    </div>
                    {activeFiltersCount > 0 && (
                      <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
                        Clear Search Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => {
                const isPrem = user.is_premium === 1;

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-identity-cell">
                        <img src={user.avatarUrl} alt={user.name} className="user-avatar-sm" />
                        <div>
                          <div className="user-name-text">
                            {user.firstName || user.lastName ? `${user.firstName} ${user.lastName}`.trim() : user.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ID: {user.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="user-email-text" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 500, color: canViewEmail ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {formatEmail(user.email)}
                        </span>
                        {!canViewEmail && (
                          <span title="Email masked by role policy">
                            <EyeOff size={11} style={{ color: 'var(--text-muted)' }} />
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {user.phone || '-'}
                      </span>
                    </td>

                    <td>
                      <span className={`badge ${isPrem ? 'badge-super' : 'badge-neutral'}`}>
                        {isPrem ? 'PREMIUM (1)' : 'FREE (0)'}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '4px 8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <MessageSquare size={13} style={{ color: 'var(--accent-primary)' }} />
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                            {user.messageRemaining ?? 0}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {renderExpireBadge(user)}
                    </td>

                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '-'}
                      </span>
                    </td>

                    <td>
                      {user.isVerified ? (
                        <span style={{ color: 'var(--status-success)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                          <CheckCircle2 size={15} /> Verified
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                          <XCircle size={15} /> Unverified
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedUserForEdit(user)}
                        disabled={!canEdit}
                        style={{ padding: '6px 10px', gap: '6px' }}
                        title={!canEdit ? 'Edit user restricted' : 'Edit profile, messageRemaining & expire_date'}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination & Rows Selector */}
        <div className="pagination-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              <span>Rows per page:</span>
              <select
                className="form-select"
                style={{ width: '65px', padding: '3px 6px', fontSize: '0.775rem' }}
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
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
    </div>
  );
};
