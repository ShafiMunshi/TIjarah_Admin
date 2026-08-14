import React from 'react';
import type { AdminRole, Permission } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import { UnauthorizedState } from './UnauthorizedState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AdminRole[];
  requiredPermissions?: Permission[];
  featureName?: string;
  onNavigateHome?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  featureName,
  onNavigateHome,
}) => {
  const { role, hasPermission, hasRole } = useAuth();

  if (role === 'unauthorized') {
    return (
      <UnauthorizedState
        requiredRoles={requiredRoles}
        requiredPermissions={requiredPermissions}
        featureName={featureName}
        onNavigateHome={onNavigateHome}
      />
    );
  }

  // Super Admin always passes
  if (role === 'super_admin') {
    return <>{children}</>;
  }

  // Role check
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <UnauthorizedState
        requiredRoles={requiredRoles}
        requiredPermissions={requiredPermissions}
        featureName={featureName}
        onNavigateHome={onNavigateHome}
      />
    );
  }

  // Permission check
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every((p) => hasPermission(p));
    if (!hasAllPermissions) {
      return (
        <UnauthorizedState
          requiredRoles={requiredRoles}
          requiredPermissions={requiredPermissions}
          featureName={featureName}
          onNavigateHome={onNavigateHome}
        />
      );
    }
  }

  return <>{children}</>;
};
