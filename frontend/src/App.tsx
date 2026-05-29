import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import AIPage from './pages/AIPage';
import WorkflowsPage from './pages/WorkflowsPage';
import Rspage from './pages/Rspage';
import Limspage from './pages/Limspage';
import Qmspage from './pages/Qmspage';
import Ehspage from './pages/Ehspage';
import Srmpage from './pages/Srmpage';
import Pdmpage from './pages/Pdmpage';
import Gispage from './pages/Gispage';
import Impage from './pages/Impage';
import NotificationCenter from './pages/NotificationCenter';
import UserManagementPage from './pages/UserManagementPage';
import RoleManagementPage from './pages/RoleManagementPage';
import PermissionManagementPage from './pages/PermissionManagementPage';
import CompanyManagementPage from './pages/CompanyManagementPage';
import DepartmentManagementPage from './pages/DepartmentManagementPage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';
import AuditLogPage from './pages/AuditLogPage';
import ReportsPage from './pages/ReportsPage';
import ConfigDebugPage from './pages/ConfigDebugPage';
import HrmPositionPage from './pages/HrmPositionPage';
import HrmLeavePage from './pages/HrmLeavePage';
import HrmRecruitmentPage from './pages/HrmRecruitmentPage';
import HrmPayrollPage from './pages/HrmPayrollPage';
import HrmPerformancePage from './pages/HrmPerformancePage';
import HrmAttendancePage from './pages/HrmAttendancePage';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import { ModuleGate } from './components/PermissionGate';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import { LoadingProvider } from './components/LoadingProvider';

const AppContent: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage onLogout={logout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute requiredPermissions={['doc:read']}>
              <ModuleGate module="doc" action="read">
                <DocumentsPage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai"
          element={
            <ProtectedRoute requiredPermissions={['ai:read']}>
              <ModuleGate module="ai" action="read">
                <AIPage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workflows"
          element={
            <ProtectedRoute requiredPermissions={['workflow:read']}>
              <ModuleGate module="workflow" action="read">
                <WorkflowsPage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rs"
          element={
            <ProtectedRoute requiredPermissions={['rs:read']}>
              <ModuleGate module="rs" action="read">
                <Rspage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/lims"
          element={
            <ProtectedRoute requiredPermissions={['lims:read']}>
              <ModuleGate module="lims" action="read">
                <Limspage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/qms"
          element={
            <ProtectedRoute requiredPermissions={['qms:read']}>
              <ModuleGate module="qms" action="read">
                <Qmspage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ehs"
          element={
            <ProtectedRoute requiredPermissions={['ehs:read']}>
              <ModuleGate module="ehs" action="read">
                <Ehspage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/srm"
          element={
            <ProtectedRoute requiredPermissions={['srm:read']}>
              <ModuleGate module="srm" action="read">
                <Srmpage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pdm"
          element={
            <ProtectedRoute requiredPermissions={['pdm:read']}>
              <ModuleGate module="pdm" action="read">
                <Pdmpage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/gis"
          element={
            <ProtectedRoute requiredPermissions={['gis:read']}>
              <ModuleGate module="gis" action="read">
                <Gispage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/im"
          element={
            <ProtectedRoute requiredPermissions={['im:read']}>
              <ModuleGate module="im" action="read">
                <Impage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationCenter />
            </ProtectedRoute>
          }
        />
        <Route
            path="/users"
            element={
              <ProtectedRoute requiredPermissions={['iam:read']}>
                <ModuleGate module="iam" action="admin">
                  <UserManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/roles"
            element={
              <ProtectedRoute requiredPermissions={['iam:read']}>
                <ModuleGate module="iam" action="admin">
                  <RoleManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/permissions"
            element={
              <ProtectedRoute requiredPermissions={['iam:read']}>
                <ModuleGate module="iam" action="admin">
                  <PermissionManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/companies"
            element={
              <ProtectedRoute requiredPermissions={['erp:read']}>
                <ModuleGate module="erp" action="admin">
                  <CompanyManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/departments"
            element={
              <ProtectedRoute requiredPermissions={['erp:read']}>
                <ModuleGate module="erp" action="admin">
                  <DepartmentManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/employees"
            element={
              <ProtectedRoute requiredPermissions={['erp:read']}>
                <ModuleGate module="erp" action="admin">
                  <EmployeeManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/audit"
            element={
              <ProtectedRoute requiredPermissions={['iam:read']}>
                <ModuleGate module="iam" action="admin">
                  <AuditLogPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/reports"
            element={
              <ProtectedRoute requiredPermissions={['iam:read']}>
                <ModuleGate module="iam" action="admin">
                  <ReportsPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route path="/debug" element={<ConfigDebugPage />} />
        <Route
            path="/hrm/positions"
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module="hrm" action="admin">
                  <HrmPositionPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/hrm/leave"
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module="hrm" action="admin">
                  <HrmLeavePage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/hrm/recruitment"
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module="hrm" action="admin">
                  <HrmRecruitmentPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/hrm/payroll"
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module="hrm" action="admin">
                  <HrmPayrollPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/hrm/performance"
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module="hrm" action="admin">
                  <HrmPerformancePage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/hrm/attendance"
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module="hrm" action="admin">
                  <HrmAttendancePage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <LoadingProvider>
            <AppContent />
          </LoadingProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
