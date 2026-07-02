import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const HrmDashboardPage = lazyWithRetry(
  () => import('../../pages/hrm/DashboardPage'),
  'DashboardPage'
);
const HrmEmployeePage = lazyWithRetry(
  () => import('../../pages/hrm/HrmEmployeePage'),
  'HrmEmployeePage'
);
const HrmEmployeeEditPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmEmployeeEditPage'),
  'HrmEmployeeEditPage'
);
const HrmEmployeeDetailPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmEmployeeDetailPage'),
  'HrmEmployeeDetailPage'
);
const HrmEmployeeCreatePage = lazyWithRetry(
  () => import('../../pages/hrm/HrmEmployeeCreatePage'),
  'HrmEmployeeCreatePage'
);
const HrmDepartmentPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmDepartmentPage'),
  'HrmDepartmentPage'
);
const HrmOrganizationPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmOrganizationPage'),
  'HrmOrganizationPage'
);
const HrmPositionPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmPositionPage'),
  'HrmPositionPage'
);
const HrmContractPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmContractPage'),
  'HrmContractPage'
);
const HrmContractDetailPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmContractDetailPage'),
  'HrmContractDetailPage'
);
const HrmCompanyPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmCompanyPage'),
  'HrmCompanyPage'
);
const HrmAttendancePage = lazyWithRetry(
  () => import('../../pages/hrm/HrmAttendancePage'),
  'HrmAttendancePage'
);
const HrmLeavePage = lazyWithRetry(() => import('../../pages/hrm/HrmLeavePage'), 'HrmLeavePage');
const HrmPayrollPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmPayrollPage'),
  'HrmPayrollPage'
);
const HrmRecruitmentPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmRecruitmentPage'),
  'HrmRecruitmentPage'
);
const HrmTrainingPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmTrainingPage'),
  'HrmTrainingPage'
);
const HrmPerformancePage = lazyWithRetry(
  () => import('../../pages/hrm/HrmPerformancePage'),
  'HrmPerformancePage'
);
const HrmReportsPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmReportsPage'),
  'HrmReportsPage'
);
const HrmOverviewPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmOverviewPage'),
  'HrmOverviewPage'
);
const HrmSalaryAdjustmentPage = lazyWithRetry(
  () => import('../../pages/hrm/HrmSalaryAdjustmentPage'),
  'HrmSalaryAdjustmentPage'
);

export const hrmModuleConfig: RouteModuleConfig = {
  code: 'hrm',
  name: '人力资源',
  icon: 'Users',
  path: '/hrm',
  source: 'core',
  suite: 'hr',
  status: 'online',
  order: 5,
  description: '员工、考勤、薪资、绩效、招聘、培训管理',
  permission: 'hrm:read',
  routes: [
    {
      path: '/hrm/dashboard',
      element: HrmDashboardPage,
      module: 'hrm',
      code: 'hrm-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['hrm:read'],
    },
    {
      path: '/hrm/employees',
      element: HrmEmployeePage,
      module: 'hrm',
      code: 'hrm-employees',
      title: '员工管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['hrm:employee:read'],
    },
    {
      path: '/hrm/employees/create',
      element: HrmEmployeeCreatePage,
      module: 'hrm',
      code: 'hrm-employee-create',
      title: '创建员工',
      template: 'form',
      group: 'business',
      requiredPermissions: ['hrm:employee:create'],
    },
    {
      path: '/hrm/employees/:id',
      element: HrmEmployeeDetailPage,
      module: 'hrm',
      code: 'hrm-employee-detail',
      title: '员工详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['hrm:employee:read'],
    },
    {
      path: '/hrm/employees/:id/edit',
      element: HrmEmployeeEditPage,
      module: 'hrm',
      code: 'hrm-employee-edit',
      title: '编辑员工',
      template: 'form',
      group: 'business',
      requiredPermissions: ['hrm:employee:update'],
    },
    {
      path: '/hrm/departments',
      element: HrmDepartmentPage,
      module: 'hrm',
      code: 'hrm-departments',
      title: '部门管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['hrm:department:read'],
    },
    {
      path: '/hrm/organization',
      element: HrmOrganizationPage,
      module: 'hrm',
      code: 'hrm-organization',
      title: '组织架构',
      template: 'tree',
      group: 'business',
      requiredPermissions: ['hrm:organization:read'],
    },
    {
      path: '/hrm/positions',
      element: HrmPositionPage,
      module: 'hrm',
      code: 'hrm-positions',
      title: '岗位管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['hrm:position:read'],
    },
    {
      path: '/hrm/contracts',
      element: HrmContractPage,
      module: 'hrm',
      code: 'hrm-contracts',
      title: '合同管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['hrm:contract:read'],
    },
    {
      path: '/hrm/contracts/:id',
      element: HrmContractDetailPage,
      module: 'hrm',
      code: 'hrm-contract-detail',
      title: '合同详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['hrm:contract:read'],
    },
    {
      path: '/hrm/company',
      element: HrmCompanyPage,
      module: 'hrm',
      code: 'hrm-company',
      title: '公司信息',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['hrm:company:read'],
    },
    {
      path: '/hrm/attendance',
      element: HrmAttendancePage,
      module: 'hrm',
      code: 'hrm-attendance',
      title: '考勤管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:attendance:read'],
    },
    {
      path: '/hrm/leave',
      element: HrmLeavePage,
      module: 'hrm',
      code: 'hrm-leave',
      title: '请假管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:leave:read'],
    },
    {
      path: '/hrm/payroll',
      element: HrmPayrollPage,
      module: 'hrm',
      code: 'hrm-payroll',
      title: '薪资管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:payroll:read'],
    },
    {
      path: '/hrm/salary-adjustment',
      element: HrmSalaryAdjustmentPage,
      module: 'hrm',
      code: 'hrm-salary-adjustment',
      title: '调薪管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:salary_adjustment:read'],
    },
    {
      path: '/hrm/recruitment',
      element: HrmRecruitmentPage,
      module: 'hrm',
      code: 'hrm-recruitment',
      title: '招聘管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:recruitment:read'],
    },
    {
      path: '/hrm/training',
      element: HrmTrainingPage,
      module: 'hrm',
      code: 'hrm-training',
      title: '培训管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:training:read'],
    },
    {
      path: '/hrm/performance',
      element: HrmPerformancePage,
      module: 'hrm',
      code: 'hrm-performance',
      title: '绩效管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:performance:read'],
    },
    {
      path: '/hrm/reports',
      element: HrmReportsPage,
      module: 'hrm',
      code: 'hrm-reports',
      title: '统计报表',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['hrm:report:read'],
    },
    {
      path: '/hrm/overview',
      element: HrmOverviewPage,
      module: 'hrm',
      code: 'hrm-overview',
      title: '数据概览',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['hrm:read'],
    },
  ],
};
