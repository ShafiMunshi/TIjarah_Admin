import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { AdminUser, AdminRole, Permission, DecodedCustomClaims } from '../types/auth';
import { ROLE_DEFINITIONS } from '../types/auth';
import { firestoreService } from '../services/firestoreService';

interface AuthContextType {
  currentAdmin: AdminUser | null;
  isAuthenticated: boolean;
  role: AdminRole | 'unauthorized';
  isSuperAdmin: boolean;
  claims: DecodedCustomClaims | null;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasRole: (roles: AdminRole | AdminRole[]) => boolean;
  loginWithCredentials: (email: string, password?: string) => Promise<AdminUser>;
  registerWithCredentials: (email: string, password: string, displayName?: string) => Promise<AdminUser>;
  loginAnonymously: () => Promise<AdminUser>;
  logout: () => void;
  switchAdmin: (adminUid: string) => void;
  switchRoleDirectly: (role: AdminRole) => void;
  setUnauthorizedDemo: () => void;
  simulateCustomClaims: (claims: Partial<DecodedCustomClaims>) => void;
  refreshClaims: () => Promise<void>;
  isRefreshingClaims: boolean;
  allAdmins: AdminUser[];
  refreshAdminsList: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_ADMIN_KEY = 'tijarah_active_admin_uid_v2';
const AUTHENTICATED_SESSION_KEY = 'tijarah_auth_session_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => {
    try {
      const savedUser = localStorage.getItem(AUTHENTICATED_SESSION_KEY);
      if (savedUser) {
        return JSON.parse(savedUser);
      }
      return null;
    } catch {
      return null;
    }
  });

  const [isRefreshingClaims, setIsRefreshingClaims] = useState(false);
  const [customOverrideClaims, setCustomOverrideClaims] = useState<DecodedCustomClaims | null>(null);

  const isAuthenticated = Boolean(currentAdmin);

  // Synchronize with Firebase Auth state
  useEffect(() => {
    firestoreService.getAdmins().then((res) => {
      setAdminsList(res.admins);
    });

    const unsubscribe = firestoreService.listenToAuthState((admin) => {
      if (admin) {
        setCurrentAdmin(admin);
        localStorage.setItem(AUTHENTICATED_SESSION_KEY, JSON.stringify(admin));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refreshAdminsList = () => {
    firestoreService.getAdmins().then((res) => {
      setAdminsList(res.admins);
      if (currentAdmin) {
        const updated = res.admins.find((a) => a.uid === currentAdmin.uid);
        if (updated) {
          setCurrentAdmin(updated);
          localStorage.setItem(AUTHENTICATED_SESSION_KEY, JSON.stringify(updated));
        }
      }
    });
  };

  const loginWithCredentials = async (email: string, password?: string): Promise<AdminUser> => {
    const admin = await firestoreService.authenticateAdmin(email, password);
    setCurrentAdmin(admin);
    setCustomOverrideClaims(null);
    localStorage.setItem(ACTIVE_ADMIN_KEY, admin.uid);
    localStorage.setItem(AUTHENTICATED_SESSION_KEY, JSON.stringify(admin));
    return admin;
  };

  const registerWithCredentials = async (email: string, password: string, displayName?: string): Promise<AdminUser> => {
    const admin = await firestoreService.registerAdmin(email, password, displayName);
    setCurrentAdmin(admin);
    setCustomOverrideClaims(null);
    localStorage.setItem(ACTIVE_ADMIN_KEY, admin.uid);
    localStorage.setItem(AUTHENTICATED_SESSION_KEY, JSON.stringify(admin));
    return admin;
  };

  const loginAnonymously = async (): Promise<AdminUser> => {
    const admin = await firestoreService.signInAnonymously();
    setCurrentAdmin(admin);
    setCustomOverrideClaims(null);
    localStorage.setItem(ACTIVE_ADMIN_KEY, admin.uid);
    localStorage.setItem(AUTHENTICATED_SESSION_KEY, JSON.stringify(admin));
    return admin;
  };

  const logout = () => {
    firestoreService.signOutFirebase();
    setCurrentAdmin(null);
    setCustomOverrideClaims(null);
    localStorage.removeItem(ACTIVE_ADMIN_KEY);
    localStorage.removeItem(AUTHENTICATED_SESSION_KEY);
  };

  const switchAdmin = (adminUid: string) => {
    const target = adminsList.find((a) => a.uid === adminUid);
    if (target) {
      setCurrentAdmin(target);
      setCustomOverrideClaims(null);
      localStorage.setItem(ACTIVE_ADMIN_KEY, target.uid);
      localStorage.setItem(AUTHENTICATED_SESSION_KEY, JSON.stringify(target));
    }
  };

  const switchRoleDirectly = (role: AdminRole) => {
    const match = adminsList.find((a) => a.role === role);
    if (match) {
      switchAdmin(match.uid);
    } else {
      const roleDef = ROLE_DEFINITIONS[role];
      const fallbackUser: AdminUser = {
        uid: `admin_sim_${role}`,
        email: `${role}@tijarah.app`,
        displayName: `${roleDef.displayName} (Demo)`,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`,
        role,
        isSuperAdmin: role === 'super_admin',
        firestorePermissions: {
          sendNotifications: role === 'super_admin' || role === 'marketing_admin',
          userEdit: role === 'super_admin' || role === 'app_manager',
          userEmailView: role === 'super_admin' || role === 'app_manager',
          userView: role !== 'marketing_admin',
        },
        customClaims: {
          role,
          isSuperAdmin: role === 'super_admin',
          permissions: [...roleDef.permissions],
          department: 'Simulated Environment',
        },
        status: 'active',
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      setCurrentAdmin(fallbackUser);
      setCustomOverrideClaims(null);
      localStorage.setItem(AUTHENTICATED_SESSION_KEY, JSON.stringify(fallbackUser));
    }
  };

  const setUnauthorizedDemo = () => {
    logout();
  };

  const simulateCustomClaims = (claimsOverride: Partial<DecodedCustomClaims>) => {
    if (!currentAdmin) return;
    const merged: DecodedCustomClaims = {
      ...currentAdmin.customClaims,
      ...claimsOverride,
      role: claimsOverride.role || currentAdmin.role,
    };
    setCustomOverrideClaims(merged);
  };

  const refreshClaims = async () => {
    setIsRefreshingClaims(true);
    if (currentAdmin) {
      try {
        const refreshed = await firestoreService.authenticateAdmin(currentAdmin.email);
        setCurrentAdmin(refreshed);
        localStorage.setItem(AUTHENTICATED_SESSION_KEY, JSON.stringify(refreshed));
      } catch {
        refreshAdminsList();
      }
    }
    setCustomOverrideClaims(null);
    setIsRefreshingClaims(false);
  };

  const activeClaims = customOverrideClaims || currentAdmin?.customClaims || null;
  const activeRole: AdminRole | 'unauthorized' = activeClaims?.role || currentAdmin?.role || (isAuthenticated ? 'app_manager' : 'unauthorized');
  const isSuperAdmin = Boolean(currentAdmin?.isSuperAdmin || activeRole === 'super_admin' || activeClaims?.isSuperAdmin);

  const activePermissions = useMemo<Permission[]>(() => {
    if (!currentAdmin && !customOverrideClaims) return [];
    if (isSuperAdmin) return ROLE_DEFINITIONS.super_admin.permissions;
    if (activeClaims?.permissions && activeClaims.permissions.length > 0) return activeClaims.permissions;
    if (activeRole && activeRole !== 'unauthorized') {
      return ROLE_DEFINITIONS[activeRole]?.permissions || [];
    }
    return [];
  }, [currentAdmin, activeClaims, activeRole, isSuperAdmin, customOverrideClaims]);

  const hasPermission = (permission: Permission): boolean => {
    if (!currentAdmin && !customOverrideClaims) return false;
    if (isSuperAdmin) return true;
    return activePermissions.includes(permission);
  };

  const hasRole = (roles: AdminRole | AdminRole[]): boolean => {
    if (!currentAdmin && !customOverrideClaims) return false;
    if (isSuperAdmin) return true;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(activeRole as AdminRole);
  };

  return (
    <AuthContext.Provider
      value={{
        currentAdmin,
        isAuthenticated,
        role: activeRole,
        isSuperAdmin,
        claims: activeClaims,
        permissions: activePermissions,
        hasPermission,
        hasRole,
        loginWithCredentials,
        registerWithCredentials,
        loginAnonymously,
        logout,
        switchAdmin,
        switchRoleDirectly,
        setUnauthorizedDemo,
        simulateCustomClaims,
        refreshClaims,
        isRefreshingClaims,
        allAdmins: adminsList,
        refreshAdminsList,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
