import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import { ModuleGate } from './components/PermissionGate';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import { LoadingProvider } from './components/LoadingProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/Toaster';
import { LoadingSpinner } from './components/LoadingSpinner';
import { AddressbookPage } from './pages/AddressbookPage';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AIPage = lazy(() => import('./pages/AIPage'));
const FlowWorkflowPage = lazy(() => import('./pages/FlowWorkflowPage'));
const WorkflowDesignerPage = lazy(() => import('./pages/WorkflowDesignerPage'));
const Rspage = lazy(() => import('./pages/Rspage'));
const Limspage = lazy(() => import('./pages/Limspage'));
const Qmspage = lazy(() => import('./pages/Qmspage'));
const Ehspage = lazy(() => import('./pages/Ehspage'));
const Srmpage = lazy(() => import('./pages/Srmpage'));
const Pdmpage = lazy(() => import('./pages/Pdmpage'));
const Gispage = lazy(() => import('./pages/Gispage'));
const Impage = lazy(() => import('./pages/Impage'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const RoleManagementPage = lazy(() => import('./pages/RoleManagementPage'));
const PermissionManagementPage = lazy(() => import('./pages/PermissionManagementPage'));
const CompanyManagementPage = lazy(() => import('./pages/CompanyManagementPage'));
const DepartmentManagementPage = lazy(() => import('./pages/DepartmentManagementPage'));
const EmployeeManagementPage = lazy(() => import('./pages/EmployeeManagementPage'));
const AssetManagementPage = lazy(() => import('./pages/AssetManagementPage'));
const EquipmentManagementPage = lazy(() => import('./pages/EquipmentManagementPage'));
const FinanceExpensePage = lazy(() => import('./pages/FinanceExpensePage'));
const FinanceVoucherPage = lazy(() => import('./pages/FinanceVoucherPage'));
const FinanceReceivablePayablePage = lazy(() => import('./pages/FinanceReceivablePayablePage'));
const FinanceReportsPage = lazy(() => import('./pages/FinanceReportsPage'));
const AdministrationPage = lazy(() => import('./pages/AdministrationPage'));
const BudgetManagementPage = lazy(() => import('./pages/BudgetManagementPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const ConfigDebugPage = lazy(() => import('./pages/ConfigDebugPage'));
const DocumentCenterPage = lazy(() => import('./pages/DocumentCenterPage'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const TemplateManagementPage = lazy(() => import('./pages/TemplateManagementPage'));
const HrmPositionPage = lazy(() => import('./pages/HrmPositionPage'));
const HrmLeavePage = lazy(() => import('./pages/HrmLeavePage'));
const HrmContractPage = lazy(() => import('./pages/HrmContractPage'));
const HrmRecruitmentPage = lazy(() => import('./pages/HrmRecruitmentPage'));
const HrmPayrollPage = lazy(() => import('./pages/HrmPayrollPage'));
const HrmPerformancePage = lazy(() => import('./pages/HrmPerformancePage'));
const HrmAttendancePage = lazy(() => import('./pages/HrmAttendancePage'));
const HrmEmployeeDetailPage = lazy(() => import('./pages/HrmEmployeeDetailPage'));
const HrmEmployeePage = lazy(() => import('./pages/HrmEmployeePage'));
const HrmTrainingPage = lazy(() => import('./pages/HrmTrainingPage'));
const HrmReportsPage = lazy(() => import('./pages/HrmReportsPage'));
const PerformanceMonitorPage = lazy(() => import('./pages/PerformanceMonitorPage'));
const FlowInstanceListPage = lazy(() => import('./pages/FlowInstanceListPage'));
const FlowInstanceDetailPage = lazy(() => import('./pages/FlowInstanceDetailPage'));
const FlowApprovalPage = lazy(() => import('./pages/FlowApprovalPage'));
const FlowApprovalDetailPage = lazy(() => import('./pages/FlowApprovalDetailPage'));
const FlowNotificationCenter = lazy(() => import('./pages/FlowNotificationCenter'));
const FlowStatisticsPage = lazy(() => import('./pages/FlowStatisticsPage'));
const FlowVersionHistoryPage = lazy(() => import('./pages/FlowVersionHistoryPage'));
const MobileWorkstationPage = lazy(() => import('./pages/MobileWorkstationPage'));
const SystemManagementPage = lazy(() => import('./pages/SystemManagementPage'));
const DictionaryManagementPage = lazy(() => import('./pages/DictionaryManagementPage'));
const DatabaseStructurePage = lazy(() => import('./pages/DatabaseStructurePage'));
const MailPage = lazy(() => import('./pages/MailPage'));
const CRMPage = lazy(() => import('./pages/CRMPage'));
const CRMDashboardPage = lazy(() => import('./pages/CRMDashboardPage'));
const CustomerManagementPage = lazy(() => import('./pages/CustomerManagementPage'));
const ContactManagementPage = lazy(() => import('./pages/ContactManagementPage'));
const OpportunityManagementPage = lazy(() => import('./pages/OpportunityManagementPage'));
const InteractionManagementPage = lazy(() => import('./pages/InteractionManagementPage'));
const PmProjectListPage = lazy(() => import('./pages/PmProjectListPage'));
const PmProjectDetailPage = lazy(() => import('./pages/PmProjectDetailPage'));
const PmProjectCreatePage = lazy(() => import('./pages/PmProjectCreatePage'));
const PmContractListPage = lazy(() => import('./pages/PmContractListPage'));
const PmContractDetailPage = lazy(() => import('./pages/PmContractDetailPage'));

const PageLoader: React.FC = () => (
  <div className='min-h-screen flex items-center justify-center bg-gray-50'>
    <div className='text-center'>
      <LoadingSpinner size='lg' />
      <p className='mt-4 text-gray-600'>加载中...</p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { logout } = useAuth();

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path='/login'
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path='/dashboard'
            element={
              <ProtectedRoute>
                <DashboardPage onLogout={logout} />
              </ProtectedRoute>
            }
          />
          <Route
            path='/addressbook'
            element={
              <ProtectedRoute>
                <AddressbookPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/documents'
            element={
              <ProtectedRoute requiredPermissions={['doc:read']}>
                <ModuleGate module='doc' action='read'>
                  <DocumentsPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/ai'
            element={
              <ProtectedRoute requiredPermissions={['ai:read']}>
                <ModuleGate module='ai' action='read'>
                  <AIPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/workflows'
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module='workflow' action='read'>
                  <FlowWorkflowPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/workflow-designer'
            element={
              <ProtectedRoute requiredPermissions={['workflow:write']}>
                <ModuleGate module='workflow' action='write'>
                  <WorkflowDesignerPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/rs'
            element={
              <ProtectedRoute>
                <Rspage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/lims'
            element={
              <ProtectedRoute>
                <Limspage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/qms'
            element={
              <ProtectedRoute requiredPermissions={['qms:read']}>
                <ModuleGate module='qms' action='read'>
                  <Qmspage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/ehs'
            element={
              <ProtectedRoute requiredPermissions={['ehs:read']}>
                <ModuleGate module='ehs' action='read'>
                  <Ehspage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/srm'
            element={
              <ProtectedRoute requiredPermissions={['srm:read']}>
                <ModuleGate module='srm' action='read'>
                  <Srmpage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/pdm'
            element={
              <ProtectedRoute requiredPermissions={['pdm:read']}>
                <ModuleGate module='pdm' action='read'>
                  <Pdmpage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/gis'
            element={
              <ProtectedRoute requiredPermissions={['gis:read']}>
                <ModuleGate module='gis' action='read'>
                  <Gispage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/im'
            element={
              <ProtectedRoute requiredPermissions={['im:read']}>
                <ModuleGate module='im' action='read'>
                  <Impage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/notifications'
            element={
              <ProtectedRoute>
                <NotificationCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path='/profile'
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/users'
            element={
              <ProtectedRoute requiredPermissions={['iam:admin']}>
                <ModuleGate module='iam' action='admin'>
                  <UserManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/roles'
            element={
              <ProtectedRoute requiredPermissions={['iam:admin']}>
                <ModuleGate module='iam' action='admin'>
                  <RoleManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/permissions'
            element={
              <ProtectedRoute requiredPermissions={['iam:admin']}>
                <ModuleGate module='iam' action='admin'>
                  <PermissionManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/companies'
            element={
              <ProtectedRoute requiredPermissions={['erp:admin']}>
                <ModuleGate module='erp' action='admin'>
                  <CompanyManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/departments'
            element={
              <ProtectedRoute requiredPermissions={['erp:admin']}>
                <ModuleGate module='erp' action='admin'>
                  <DepartmentManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/employees'
            element={
              <ProtectedRoute requiredPermissions={['erp:admin']}>
                <ModuleGate module='erp' action='admin'>
                  <EmployeeManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/assets'
            element={
              <ProtectedRoute requiredPermissions={['erp:admin']}>
                <ModuleGate module='erp' action='admin'>
                  <AssetManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/equipment'
            element={
              <ProtectedRoute requiredPermissions={['erp:admin']}>
                <ModuleGate module='erp' action='admin'>
                  <EquipmentManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/finance'
            element={
              <ProtectedRoute requiredPermissions={['erp:admin']}>
                <ModuleGate module='erp' action='admin'>
                  <FinanceExpensePage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/finance/vouchers'
            element={
              <ProtectedRoute requiredPermissions={['erp:admin']}>
                <ModuleGate module='erp' action='admin'>
                  <FinanceVoucherPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/finance/receivable-payable'
            element={
              <ProtectedRoute requiredPermissions={['erp:admin']}>
                <ModuleGate module='erp' action='admin'>
                  <FinanceReceivablePayablePage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/finance/reports'
            element={
              <ProtectedRoute requiredPermissions={['erp:admin']}>
                <ModuleGate module='erp' action='admin'>
                  <FinanceReportsPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/administration'
            element={
              <ProtectedRoute requiredPermissions={['erp:admin']}>
                <ModuleGate module='erp' action='admin'>
                  <AdministrationPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/budget'
            element={
              <ProtectedRoute requiredPermissions={['erp:admin']}>
                <ModuleGate module='erp' action='admin'>
                  <BudgetManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/audit'
            element={
              <ProtectedRoute requiredPermissions={['iam:admin']}>
                <ModuleGate module='iam' action='admin'>
                  <AuditLogPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/reports'
            element={
              <ProtectedRoute requiredPermissions={['iam:admin']}>
                <ModuleGate module='iam' action='admin'>
                  <ReportPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/document-center'
            element={
              <ProtectedRoute requiredPermissions={['doc:read']}>
                <ModuleGate module='doc' action='read'>
                  <DocumentCenterPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/help'
            element={
              <ProtectedRoute>
                <HelpCenterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/templates'
            element={
              <ProtectedRoute requiredPermissions={['doc:admin']}>
                <ModuleGate module='doc' action='admin'>
                  <TemplateManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/hrm/positions'
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module='hrm' action='read'>
                  <HrmPositionPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/hrm/employees'
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module='hrm' action='read'>
                  <HrmEmployeePage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/hrm/leave'
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module='hrm' action='read'>
                  <HrmLeavePage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/hrm/contracts'
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module='hrm' action='read'>
                  <HrmContractPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/hrm/recruitment'
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module='hrm' action='read'>
                  <HrmRecruitmentPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/hrm/payroll'
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module='hrm' action='read'>
                  <HrmPayrollPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/hrm/performance'
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module='hrm' action='read'>
                  <HrmPerformancePage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/hrm/attendance'
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module='hrm' action='read'>
                  <HrmAttendancePage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/hrm/employee/:id'
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module='hrm' action='read'>
                  <HrmEmployeeDetailPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/hrm/training'
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module='hrm' action='read'>
                  <HrmTrainingPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/hrm/reports'
            element={
              <ProtectedRoute requiredPermissions={['hrm:read']}>
                <ModuleGate module='hrm' action='read'>
                  <HrmReportsPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/flow/instances'
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module='workflow' action='read'>
                  <FlowInstanceListPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/flow/instance/:id'
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module='workflow' action='read'>
                  <FlowInstanceDetailPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/flow/approvals'
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module='workflow' action='read'>
                  <FlowApprovalPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/flow/approval/:id'
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module='workflow' action='read'>
                  <FlowApprovalDetailPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/flow/notifications'
            element={
              <ProtectedRoute>
                <FlowNotificationCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path='/flow/statistics'
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module='workflow' action='read'>
                  <FlowStatisticsPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/flow/history'
            element={
              <ProtectedRoute requiredPermissions={['workflow:read']}>
                <ModuleGate module='workflow' action='read'>
                  <FlowVersionHistoryPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/mobile-workstation'
            element={
              <ProtectedRoute>
                <MobileWorkstationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/system'
            element={
              <ProtectedRoute requiredPermissions={['iam:admin']}>
                <ModuleGate module='iam' action='admin'>
                  <SystemManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/dictionaries'
            element={
              <ProtectedRoute requiredPermissions={['iam:admin']}>
                <ModuleGate module='iam' action='admin'>
                  <DictionaryManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/database'
            element={
              <ProtectedRoute requiredPermissions={['iam:admin']}>
                <ModuleGate module='iam' action='admin'>
                  <DatabaseStructurePage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/performance'
            element={
              <ProtectedRoute>
                <PerformanceMonitorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/debug'
            element={
              <ProtectedRoute requiredPermissions={['iam:admin']}>
                <ModuleGate module='iam' action='admin'>
                  <ConfigDebugPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/mail'
            element={
              <ProtectedRoute requiredPermissions={['mail:read']}>
                <ModuleGate module='mail' action='read'>
                  <MailPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/crm'
            element={
              <ProtectedRoute requiredPermissions={['crm:read']}>
                <ModuleGate module='crm' action='read'>
                  <CRMPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/crm/dashboard'
            element={
              <ProtectedRoute requiredPermissions={['crm:read']}>
                <ModuleGate module='crm' action='read'>
                  <CRMDashboardPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/crm/customers'
            element={
              <ProtectedRoute requiredPermissions={['crm:read']}>
                <ModuleGate module='crm' action='read'>
                  <CustomerManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/crm/contacts'
            element={
              <ProtectedRoute requiredPermissions={['crm:read']}>
                <ModuleGate module='crm' action='read'>
                  <ContactManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/crm/opportunities'
            element={
              <ProtectedRoute requiredPermissions={['crm:read']}>
                <ModuleGate module='crm' action='read'>
                  <OpportunityManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/crm/interactions'
            element={
              <ProtectedRoute requiredPermissions={['crm:read']}>
                <ModuleGate module='crm' action='read'>
                  <InteractionManagementPage />
                </ModuleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path='/pm/projects'
            element={
              <ProtectedRoute>
                <PmProjectListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/pm/projects/create'
            element={
              <ProtectedRoute>
                <PmProjectCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/pm/projects/:id'
            element={
              <ProtectedRoute>
                <PmProjectDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/pm/projects/:id/edit'
            element={
              <ProtectedRoute>
                <PmProjectCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/pm/contracts'
            element={
              <ProtectedRoute>
                <PmContractListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/pm/contracts/:id'
            element={
              <ProtectedRoute>
                <PmContractDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path='/' element={<Navigate to='/dashboard' replace />} />
          <Route path='*' element={<Navigate to='/dashboard' replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <LoadingProvider>
            <AuthProvider>
              <AppContent />
              <Toaster />
            </AuthProvider>
          </LoadingProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
