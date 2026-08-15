import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import type { NavView } from './components/layout/Sidebar';
import { Sidebar } from './components/layout/Sidebar';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginView } from './components/auth/LoginView';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { UserManagementView } from './components/users/UserManagementView';
import { NotificationCenterView } from './components/fcm/NotificationCenterView';
import { CrashlyticsView } from './components/crashlytics/CrashlyticsView';
import { AdminManagementView } from './components/admins/AdminManagementView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { SecurityArchitectureView } from './components/security/SecurityArchitectureView';

const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<NavView>('users');

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="app-container">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />

      <div className="main-content-wrapper">
        <Navbar />

        <main className="page-container">
          {currentView === 'dashboard' && <DashboardView onNavigate={setCurrentView} />}

          {currentView === 'users' && (
            <ProtectedRoute
              requiredRoles={['super_admin', 'app_manager']}
              requiredPermissions={['users:view']}
              featureName="USERS Collection & Customer Data"
              onNavigateHome={() => setCurrentView('dashboard')}
            >
              <UserManagementView />
            </ProtectedRoute>
          )}

          {currentView === 'fcm' && (
            <ProtectedRoute
              requiredRoles={['super_admin', 'marketing_admin']}
              requiredPermissions={['fcm:compose']}
              featureName="FCM Push Notification Center"
              onNavigateHome={() => setCurrentView('dashboard')}
            >
              <NotificationCenterView />
            </ProtectedRoute>
          )}

          {currentView === 'crashlytics' && (
            <ProtectedRoute
              requiredRoles={['super_admin', 'app_manager']}
              requiredPermissions={['crashlytics:view']}
              featureName="Crashlytics & Error Traces"
              onNavigateHome={() => setCurrentView('dashboard')}
            >
              <CrashlyticsView />
            </ProtectedRoute>
          )}

          {currentView === 'admins' && (
            <ProtectedRoute
              requiredRoles={['super_admin']}
              requiredPermissions={['admins:manage_roles']}
              featureName="Admin RBAC & Custom Claims Matrix"
              onNavigateHome={() => setCurrentView('dashboard')}
            >
              <AdminManagementView />
            </ProtectedRoute>
          )}

          {currentView === 'audit' && (
            <ProtectedRoute
              requiredRoles={['super_admin', 'app_manager', 'marketing_admin']}
              featureName="Security Audit Trail"
              onNavigateHome={() => setCurrentView('dashboard')}
            >
              <AuditLogsView />
            </ProtectedRoute>
          )}

          {currentView === 'security' && <SecurityArchitectureView />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthenticatedApp />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
