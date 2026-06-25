import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const HrmDashboardPage = lazy(() => import('../pages/hrm/DashboardPage'));
const HrmCompanyPage = lazy(() => import('../pages/hrm/HrmCompanyPage'));
const HrmDepartmentPage = lazy(() => import('../pages/hrm/HrmDepartmentPage'));
const HrmOrganizationPage = lazy(() => import('../pages/hrm/HrmOrganizationPage'));
const HrmPositionPage = lazy(() => import('../pages/hrm/HrmPositionPage'));
const HrmEmployeePage = lazy(() => import('../pages/hrm/HrmEmployeePage'));
const HrmEmployeeDetailPage = lazy(() => import('../pages/hrm/HrmEmployeeDetailPage'));
const HrmEmployeeCreatePage = lazy(() => import('../pages/hrm/HrmEmployeeCreatePage'));
const HrmEmployeeEditPage = lazy(() => import('../pages/hrm/HrmEmployeeEditPage'));
const HrmLeavePage = lazy(() => import('../pages/hrm/HrmLeavePage'));
const HrmContractPage = lazy(() => import('../pages/hrm/HrmContractPage'));
const HrmContractDetailPage = lazy(() => import('../pages/hrm/HrmContractDetailPage'));
const HrmRecruitmentPage = lazy(() => import('../pages/hrm/HrmRecruitmentPage'));
const HrmPayrollPage = lazy(() => import('../pages/hrm/HrmPayrollPage'));
const HrmSalaryAdjustmentPage = lazy(() => import('../pages/hrm/HrmSalaryAdjustmentPage'));
const HrmPerformancePage = lazy(() => import('../pages/hrm/HrmPerformancePage'));
const HrmAttendancePage = lazy(() => import('../pages/hrm/HrmAttendancePage'));
const HrmTrainingPage = lazy(() => import('../pages/hrm/HrmTrainingPage'));
const HrmReportsPage = lazy(() => import('../pages/hrm/HrmReportsPage'));

export const hrmRoutes: RouteConfig[] = [
  {
    path: '/hrm',
    element: HrmDashboardPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/companies',
    element: HrmCompanyPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/departments',
    element: HrmDepartmentPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/organization',
    element: HrmOrganizationPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/positions',
    element: HrmPositionPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/employees',
    element: HrmEmployeePage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/employee/:id',
    element: HrmEmployeeDetailPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/employee/create',
    element: HrmEmployeeCreatePage,
    requiredPermissions: ['hrm:write'],
    module: 'hrm',
    action: 'write',
  },
  {
    path: '/hrm/employee/:id/edit',
    element: HrmEmployeeEditPage,
    requiredPermissions: ['hrm:write'],
    module: 'hrm',
    action: 'write',
  },
  {
    path: '/hrm/leave',
    element: HrmLeavePage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/contracts',
    element: HrmContractPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/contract/:id',
    element: HrmContractDetailPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/recruitment',
    element: HrmRecruitmentPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/payroll',
    element: HrmPayrollPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/performance',
    element: HrmPerformancePage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/attendance',
    element: HrmAttendancePage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/training',
    element: HrmTrainingPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/reports',
    element: HrmReportsPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
];
