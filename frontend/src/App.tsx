import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import AIPage from './pages/AIPage';
import FlowWorkflowPage from './pages/FlowWorkflowPage';
import WorkflowDesignerPage from './pages/WorkflowDesignerPage';
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
import AssetManagementPage from './pages/AssetManagementPage';
import EquipmentManagementPage from './pages/EquipmentManagementPage';
import FinanceExpensePage from './pages/FinanceExpensePage';
import AdministrationPage from './pages/AdministrationPage';
import BudgetManagementPage from './pages/BudgetManagementPage';
import AuditLogPage from './pages/AuditLogPage';
import ReportPage from './pages/ReportPage';
import ConfigDebugPage from './pages/ConfigDebugPage';
import DocumentCenterPage from './pages/DocumentCenterPage';
import HelpCenterPage from './pages/HelpCenterPage';
import TemplateManagementPage from './pages/TemplateManagementPage';
import HrmPositionPage from './pages/HrmPositionPage';
import HrmLeavePage from './pages/HrmLeavePage';
import HrmRecruitmentPage from './pages/HrmRecruitmentPage';
import HrmPayrollPage from './pages/HrmPayrollPage';
import HrmPerformancePage from './pages/HrmPerformancePage';
import HrmAttendancePage from './pages/HrmAttendancePage';
import HrmEmployeeDetailPage from './pages/HrmEmployeeDetailPage';
import PerformanceMonitorPage from './pages/PerformanceMonitorPage';
import FlowInstanceListPage from './pages/FlowInstanceListPage';
import FlowInstanceDetailPage from './pages/FlowInstanceDetailPage';
import FlowApprovalPage from './pages/FlowApprovalPage';
import FlowApprovalDetailPage from './pages/FlowApprovalDetailPage';
import FlowNotificationCenter from './pages/FlowNotificationCenter';
import FlowStatisticsPage from './pages/FlowStatisticsPage';
import FlowVersionHistoryPage from './pages/FlowVersionHistoryPage';
import MobileWorkstationPage from './pages/MobileWorkstationPage';
import SystemManagementPage from './pages/SystemManagementPage';
import DictionaryManagementPage from './pages/DictionaryManagementPage';
import DatabaseStructurePage from './pages/DatabaseStructurePage';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import { ModuleGate } from './components/PermissionGate';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import { LoadingProvider } from './components/LoadingProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/Toaster';

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
                <FlowWorkflowPage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workflow-designer"
          element={
            <ProtectedRoute requiredPermissions={['workflow:write']}>
              <ModuleGate module="workflow" action="write">
                <WorkflowDesignerPage />
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
            path="/assets"
            element={
              <ProtectedRoute requiredPermissions={['erp:read']}>
                <ModuleGate module="erp" action="admin">
                  <EquipmentManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/finance"
            element={
              <ProtectedRoute requiredPermissions={['erp:read']}>
                <ModuleGate module="erp" action="admin">
                  <FinanceExpensePage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/administration"
            element={
              <ProtectedRoute requiredPermissions={['erp:read']}>
                <ModuleGate module="erp" action="admin">
                  <AdministrationPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/budget"
            element={
              <ProtectedRoute requiredPermissions={['erp:read']}>
                <ModuleGate module="erp" action="admin">
                  <BudgetManagementPage />
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
            path="/system"
            element={
              <ProtectedRoute requiredPermissions={['iam:admin']}>
                <ModuleGate module="iam" action="admin">
                  <SystemManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/dictionary"
            element={
              <ProtectedRoute requiredPermissions={['iam:admin']}>
                <ModuleGate module="iam" action="admin">
                  <DictionaryManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/database"
            element={
              <ProtectedRoute requiredPermissions={['iam:admin']}>
                <ModuleGate module="iam" action="admin">
                  <DatabaseStructurePage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/reports"
            element={
              <ProtectedRoute requiredPermissions={['iam:read']}>
                <ModuleGate module="iam" action="admin">
                  <ReportPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/document-center"
            element={
              <ProtectedRoute requiredPermissions={['doc:read']}>
                <ModuleGate module="doc" action="read">
                  <DocumentCenterPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/help"
            element={
              <ProtectedRoute>
                <HelpCenterPage />
              </ProtectedRoute>
            }
          />
        <Route
            path="/templates"
            element={
              <ProtectedRoute requiredPermissions={['doc:read']}>
                <ModuleGate module="doc" action="admin">
                  <TemplateManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/mobile-workstation"
            element={
              <ProtectedRoute>
                <MobileWorkstationPage />
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
            path="/hrm/employees/:id"
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module="hrm" action="admin">
                  <HrmEmployeeDetailPage />
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
        <Route
            path="/performance-monitor"
            element={
              <ProtectedRoute requiredPermissions={['iam:read']}>
                <ModuleGate module="iam" action="admin">
                  <PerformanceMonitorPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        
        {/* FLOW Service Routes */}
        <Route
            path="/flow/workflows"
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module="workflow" action="admin">
                  <FlowWorkflowPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/flow/instances"
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module="workflow" action="admin">
                  <FlowInstanceListPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/flow/instances/:id"
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module="workflow" action="admin">
                  <FlowInstanceDetailPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/flow/approvals"
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module="workflow" action="admin">
                  <FlowApprovalPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/flow/approvals/:id"
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module="workflow" action="admin">
                  <FlowApprovalDetailPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/flow/notifications"
            element={
              <ProtectedRoute>
                <FlowNotificationCenter />
              </ProtectedRoute>
            }
          />
        <Route
            path="/flow/statistics"
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module="workflow" action="admin">
                  <FlowStatisticsPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
        <Route
            path="/flow/workflows/:id/versions"
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module="workflow" action="admin">
                  <FlowVersionHistoryPage />
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
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <LoadingProvider>
              <AppContent />
              <Toaster />
            </LoadingProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
