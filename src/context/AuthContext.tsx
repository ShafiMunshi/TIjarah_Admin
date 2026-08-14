import React, { createContext, useContext, useState, useMemo } from 'react';
import type { AdminUser, AdminRole, Permission, DecodedCustomClaims } from '../types/auth';
import { ROLE_DEFINITIONS } from '../types/auth';
import { mockService } from '../services/mockService';

interface AuthContextType {
  currentAdmin: AdminUser | null;
  role: AdminRole | 'unauthorized';
  claims: DecodedCustomClaims | null;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasRole: (roles: AdminRole | AdminRole[]) => boolean;
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

const ACTIVE_ADMIN_KEY = 'tijarah_active_admin_uid_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminsList, setAdminsList] = useState<AdminUser[]>(() => mockService.getAdmins());
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => {
    const savedUid = localStorage.getItem(ACTIVE_ADMIN_KEY);
    const admins = mockService.getAdmins();
    return admins.find((a) => a.uid === savedUid) || admins[0] || null;
  });
  const [isRefreshingClaims, setIsRefreshingClaims] = useState(false);
  const [customOverrideClaims, setCustomOverrideClaims] = useState<DecodedCustomClaims | null>(null);

  const refreshAdminsList = () => {
    const latest = mockService.getAdmins();
    setAdminsList(latest);
    if (currentAdmin) {
      const updated = latest.find((a) => a.uid === currentAdmin.uid);
      if (updated) {
        setCurrentAdmin(updated);
      }
    }
  };

  const switchAdmin = (adminUid: string) => {
    const target = adminsList.find((a) => a.uid === adminUid);
    if (target) {
      setCurrentAdmin(target);
      setCustomOverrideClaims(null);
      localStorage.setItem(ACTIVE_ADMIN_KEY, target.uid);
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
        customClaims: {
          role,
          permissions: [...roleDef.permissions],
          department: 'Simulated Environment',
        },
        status: 'active',
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      setCurrentAdmin(fallbackUser);
      setCustomOverrideClaims(null);
    }
  };

  const setUnauthorizedDemo = () => {
    setCurrentAdmin(null);
    setCustomOverrideClaims(null);
    localStorage.removeItem(ACTIVE_ADMIN_KEY);
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
    await new Promise((resolve) => setTimeout(resolve, 600));
    refreshAdminsList();
    setCustomOverrideClaims(null);
    setIsRefreshingClaims(false);
  };

  const activeClaims = customOverrideClaims || currentAdmin?.customClaims || null;
  const activeRole: AdminRole | 'unauthorized' = activeClaims?.role || currentAdmin?.role || 'unauthorized';

  const activePermissions = useMemo<Permission[]>(() => {
    if (!currentAdmin && !customOverrideClaims) return [];
    if (activeClaims?.permissions) return activeClaims.permissions;
    if (activeRole && activeRole !== 'unauthorized') {
      return ROLE_DEFINITIONS[activeRole]?.permissions || [];
    }
    return [];
  }, [currentAdmin, activeClaims, activeRole, customOverrideClaims]);

  const hasPermission = (permission: Permission): boolean => {
    if (!currentAdmin && !customOverrideClaims) return false;
    if (activeRole === 'super_admin') return true;
    return activePermissions.includes(permission);
  };

  const hasRole = (roles: AdminRole | AdminRole[]): boolean => {
    if (!currentAdmin && !customOverrideClaims) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(activeRole as AdminRole);
  };

  return (
    <AuthContext.Provider
      value={{
        currentAdmin,
        role: activeRole,
        claims: activeClaims,
        permissions: activePermissions,
        hasPermission,
        hasRole,
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
