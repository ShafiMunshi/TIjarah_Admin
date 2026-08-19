import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Calendar,
  Crown,
  RotateCcw,
  Filter,
  Smartphone,
  Zap,
  Loader2,
} from 'lucide-react';
import type { AppUser, UserQueryOptions, PaginatedUsersResult } from '../../types/users';
import { useAuth } from '../../context/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';
import { EditUserModal } from './EditUserModal';
import { UserDevicesModal } from './UserDevicesModal';

export const UserManagementView: React.FC = () => {
  const { role, hasPermission } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();

  // Paginated Server State
  const [users, setUsers] = useState<AppUser[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveFirestore, setIsLiveFirestore] = useState<boolean>(false);
  const [connectedCollection, setConnectedCollection] = useState<string>('USERS');
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchField, setSearchField] = useState<'all' | 'email' | 'name' | 'phone' | 'id'>('all');
  const [premiumFilter, setPremiumFilter] = useState<'all' | 'premium' | 'free'>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [createdFrom, setCreatedFrom] = useState<string>('');
  const [createdTo, setCreatedTo] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | '7d' | '30d' | '90d' | 'this_year'>('all');

  // Sorting
  const [sortField, setSortField] = useState<keyof AppUser | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AppUser | null>(null);
  const [selectedUserForDevices, setSelectedUserForDevices] = useState<AppUser | null>(null);

  // Firestore cursor map for fast back/forward navigation without reading skipped documents
  const pageCursorsRef = useRef<{ [page: number]: any }>({ 1: null });

  const canEdit = hasPermission('users:edit');
  const canViewEmail = hasPermission('users:view_email') || role === 'super_admin';
  const canExport = hasPermission('users:export');

  // Server-side page fetcher
  const loadPage = useCallback(
    async (targetPage: number, resetHistory = false) => {
      setIsLoading(true);
      setFirestoreError(null);

      if (resetHistory || targetPage === 1) {
        pageCursorsRef.current = { 1: null };
      }

      const cursorDoc = resetHistory || targetPage === 1 ? null : pageCursorsRef.current[targetPage] || null;

      const queryOpts: UserQueryOptions = {
        pageSize,
        cursorDoc,
        sortField,
        sortOrder,
        searchQuery: searchQuery.trim(),
        searchField,
        premiumFilter,
        verifiedFilter,
        createdFrom,
        createdTo,
      };

      try {
        const result: PaginatedUsersResult = await firestoreService.getUsersPaginated(queryOpts, targetPage);

        setUsers(result.users);
        setTotalCount(result.totalCount);
        setCurrentPage(targetPage);
        setHasMore(result.hasMore);
        setIsLiveFirestore(result.isLiveFirestore);
        setConnectedCollection(result.collectionName);

        // Store next page cursor
        if (result.lastVisibleDoc) {
          pageCursorsRef.current[targetPage + 1] = result.lastVisibleDoc;
        }

        if (result.error) {
          setFirestoreError(result.error);
        }
      } catch (err: any) {
        console.error('Error loading paginated users:', err);
        setFirestoreError(err?.message || 'Failed to load users from Firestore');
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize, sortField, sortOrder, searchQuery, searchField, premiumFilter, verifiedFilter, createdFrom, createdTo]
  );

  // Initial load
  useEffect(() => {
    loadPage(1, true);
  }, [loadPage]);

  // Handle Search Submission
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    loadPage(1, true);
  };

  // Quick Date Range Preset Handler
  const handleSelectDatePreset = (preset: 'all' | '7d' | '30d' | '90d' | 'this_year') => {
    setDatePreset(preset);
    const now = new Date();
    const toDateStr = now.toISOString().split('T')[0];

    let fromStr = '';
    let toStr = '';

    if (preset === 'all') {
      fromStr = '';
      toStr = '';
    } else if (preset === '7d') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      fromStr = past.toISOString().split('T')[0];
      toStr = toDateStr;
    } else if (preset === '30d') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      fromStr = past.toISOString().split('T')[0];
      toStr = toDateStr;
    } else if (preset === '90d') {
      const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      fromStr = past.toISOString().split('T')[0];
      toStr = toDateStr;
    } else if (preset === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      fromStr = startOfYear.toISOString().split('T')[0];
      toStr = toDateStr;
    }

    setCreatedFrom(fromStr);
    setCreatedTo(toStr);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSearchField('all');
    setPremiumFilter('all');
    setVerifiedFilter('all');
    setCreatedFrom('');
    setCreatedTo('');
    setDatePreset('all');
    showInfo('Filters Reset', 'Displaying page 1 of all users');
    setTimeout(() => {
      loadPage(1, true);
    }, 0);
  };

  // Active filters count
  const activeFiltersCount =
    (searchQuery.trim() ? 1 : 0) +
    (premiumFilter !== 'all' ? 1 : 0) +
    (verifiedFilter !== 'all' ? 1 : 0) +
    (createdFrom || createdTo ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleSort = (field: keyof AppUser) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
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
    const rows = users.map((u) => [
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
    link.setAttribute('download', `tijarah_users_page_${currentPage}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('CSV Export Complete', `Exported ${users.length} user records from current page`);
  };

  const formatEmail = (rawEmail: string) => {
    if (canViewEmail) return rawEmail;
    if (!rawEmail) return 'No email';
    const parts = rawEmail.split('@');
    if (parts.length < 2) return '***';
    return `${parts[0].slice(0, 2)}***@***.${parts[1].split('.').pop() || 'com'}`;
  };

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
          <span style={{ fontSize: '0.8rem', color: diffDays < 30 ? 'var(--status-warning)' : 'var(--text-primary)', fontWeight: 500 }}>
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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>USERS Management</h1>
            <span
              className={`badge ${isLiveFirestore ? 'badge-success' : 'badge-neutral'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Database size={12} />
              <span>
                {isLiveFirestore ? `Live Firestore: ${connectedCollection}` : 'Local Demo Cache'}
              </span>
            </span>

            {/* Cost-Optimization Guarantee Pill */}
            <span
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: 'var(--status-success)',
                fontSize: '0.725rem',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Zap size={12} />
              <span>Firestore Paginated ({pageSize} reads / page)</span>
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Server-side cursor pagination &amp; search. Fetches only <strong>{pageSize} records</strong> per page to prevent expensive unbounded reads on large user bases.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-outline btn-sm btn-icon-only"
            onClick={() => loadPage(currentPage, false)}
            title="Refresh current page"
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'spin-anim' : ''} />
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
            disabled={!canExport || users.length === 0}
            title={!canExport ? 'Export restricted for your role' : 'Export current page to CSV'}
          >
            <Download size={15} /> Export Page CSV
          </button>
        </div>
      </div>

      {/* Firestore Diagnostic Notice if any */}
      {firestoreError && (
        <div
          style={{
            background: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <XCircle size={18} style={{ color: 'var(--status-danger)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--status-danger)' }}>
              Query Notice
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              {firestoreError}
            </div>
          </div>
        </div>
      )}

      {/* SERVER-SIDE SEARCH & FILTER TOOLBAR */}
      <div className="filter-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Firestore Server Query &amp; Filter
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
              <RotateCcw size={12} /> Reset Query
            </button>
          )}
        </div>

        {/* Search Row */}
        <form onSubmit={handleSearchSubmit} className="filter-grid-row">
          {/* 1. Search Query Box with Field Selector */}
          <div className="filter-item-group" style={{ gridColumn: 'span 2' }}>
            <label className="filter-item-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Search size={13} /> Server Search Query
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Press Enter to execute Firestore query
              </span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="form-select"
                style={{ width: '130px', flexShrink: 0 }}
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as any)}
              >
                <option value="all">Auto-detect</option>
                <option value="email">Email</option>
                <option value="name">First Name</option>
                <option value="phone">Phone</option>
                <option value="id">User ID (1 Read)</option>
              </select>

              <div className="search-input-wrapper" style={{ flex: 1 }}>
                <Search size={15} className="search-icon-inside" />
                <input
                  type="text"
                  className="form-input search-input-field"
                  placeholder={
                    searchField === 'id'
                      ? 'Enter exact user UID / Document ID (costs only 1 read)...'
                      : searchField === 'email'
                      ? 'Search email prefix (e.g. test@...)...'
                      : searchField === 'phone'
                      ? 'Enter phone number...'
                      : searchField === 'name'
                      ? 'Search first name...'
                      : 'Search name, email, phone or UID...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ padding: '0 16px', flexShrink: 0 }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 size={14} className="spin-anim" /> : <Search size={14} />}
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* 2. Premium Status Filter */}
          <div className="filter-item-group">
            <label className="filter-item-label">
              <Crown size={13} /> Membership
            </label>
            <select
              className="form-select"
              value={premiumFilter}
              onChange={(e) => {
                setPremiumFilter(e.target.value as any);
              }}
            >
              <option value="all">All Memberships</option>
              <option value="premium">⭐ Premium (is_premium = 1)</option>
              <option value="free">Free Tier (is_premium = 0)</option>
            </select>
          </div>

          {/* 3. Verification Filter */}
          <div className="filter-item-group">
            <label className="filter-item-label">
              <CheckCircle2 size={13} /> Verification
            </label>
            <select
              className="form-select"
              value={verifiedFilter}
              onChange={(e) => {
                setVerifiedFilter(e.target.value as any);
              }}
            >
              <option value="all">All Accounts</option>
              <option value="verified">Verified (isVerified = true)</option>
              <option value="unverified">Unverified (isVerified = false)</option>
            </select>
          </div>
        </form>

        {/* Date Range Row */}
        <div style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span className="filter-item-label" style={{ margin: 0 }}>
              <Calendar size={13} /> Joined Date:
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
                }}
                title="To Date"
              />
            </div>

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
            Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount.toLocaleString()} total documents)
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
              <th style={{ textAlign: 'right', width: '180px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <Loader2 size={28} className="spin-anim" style={{ color: 'var(--accent-primary)' }} />
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Fetching {pageSize} users from Firestore USERS collection...
                    </div>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <Search size={28} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      No user documents found matching your query
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
              users.map((user) => {
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
                        {user.phone || user.phoneNumber || '-'}
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

                    <td>{renderExpireBadge(user)}</td>

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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {/* Connected Devices button */}
                        <button
                          className="btn btn-outline btn-sm btn-icon-only"
                          onClick={() => setSelectedUserForDevices(user)}
                          title="View Registered FCM Devices (USERS/{userId}/DEVICES)"
                          style={{ padding: '5px 7px' }}
                        >
                          <Smartphone size={13} style={{ color: 'var(--status-success)' }} />
                        </button>

                        {/* Edit User button */}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedUserForEdit(user)}
                          disabled={!canEdit}
                          style={{ padding: '5px 9px', gap: '4px' }}
                          title={!canEdit ? 'Edit user restricted' : 'Edit profile, messageRemaining & expire_date'}
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Server-Side Pagination Footer */}
        <div className="pagination-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> &bull; Showing {users.length} records (
              {totalCount.toLocaleString()} total in index)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              <span>Page size:</span>
              <select
                className="form-select"
                style={{ width: '65px', padding: '3px 6px', fontSize: '0.775rem' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="pagination-pages">
            <button
              className="btn btn-secondary btn-sm"
              style={{ gap: '4px', padding: '5px 10px' }}
              onClick={() => loadPage(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
            >
              <ChevronLeft size={15} /> Prev 10
            </button>

            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 8px' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              className="btn btn-secondary btn-sm"
              style={{ gap: '4px', padding: '5px 10px' }}
              onClick={() => loadPage(currentPage + 1)}
              disabled={(!hasMore && currentPage >= totalPages) || isLoading}
            >
              Next 10 <ChevronRight size={15} />
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
          loadPage(currentPage, false);
        }}
      />

      {/* Connected Devices Modal */}
      <UserDevicesModal
        user={selectedUserForDevices}
        isOpen={!!selectedUserForDevices}
        onClose={() => setSelectedUserForDevices(null)}
      />
    </div>
  );
};
