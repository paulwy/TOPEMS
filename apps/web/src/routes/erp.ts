import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const AdministrationDashboardPage = lazy(() => import('../pages/oa/AdministrationDashboardPage'));
const OfficeSuppliesManagementPage = lazy(
  () => import('../pages/asset/OfficeSuppliesManagementPage')
);
const MeetingRoomManagementPage = lazy(() => import('../pages/oa/MeetingRoomManagementPage'));
const VehicleManagementPage = lazy(() => import('../pages/asset/VehicleManagementPage'));
const AnnouncementManagementPage = lazy(() => import('../pages/oa/AnnouncementManagementPage'));
const ExpenseClaimPage = lazy(() => import('../pages/oa/ExpenseClaimPage'));
const ERPHomePage = lazy(() => import('../pages/erp/DashboardPage'));
const FinancialReportPage = lazy(() => import('../pages/erp/FinancialReportPage'));
const VoucherManagementPage = lazy(() => import('../pages/erp/VoucherManagementPage'));
const AuditLogPage = lazy(() => import('../pages/erp/AuditLogPage'));
const DictManagementPage = lazy(() => import('../pages/erp/DictManagementPage'));
const DatabaseManagementPage = lazy(() => import('../pages/erp/DatabaseManagementPage'));

export const erpRoutes: RouteConfig[] = [
  {
    path: '/erp',
    element: React.createElement(Navigate, {
      to: '/erp/dashboard',
      replace: true,
    }),
    requiredPermissions: ['erp:read'],
    module: 'erp',
    action: 'read',
  },
  {
    path: '/erp/dashboard',
    element: ERPHomePage,
    requiredPermissions: ['erp:read'],
    module: 'erp',
    action: 'read',
  },
  {
    path: '/assets',
    element: React.createElement(Navigate, {
      to: '/finance/assets',
      replace: true,
    }),
    requiredPermissions: ['finance:read'],
    module: 'finance',
    action: 'read',
  },
  {
    path: '/equipment',
    element: React.createElement(Navigate, {
      to: '/mes/equipment',
      replace: true,
    }),
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/equipment/inspections',
    element: React.createElement(Navigate, {
      to: '/mes/equipment',
      replace: true,
    }),
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/equipment/maintenances',
    element: React.createElement(Navigate, {
      to: '/mes/equipment',
      replace: true,
    }),
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/equipment/:id',
    element: React.createElement(Navigate, {
      to: '/mes/equipment',
      replace: true,
    }),
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/administration',
    element: AdministrationDashboardPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/expense-claims',
    element: ExpenseClaimPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/budget',
    element: React.createElement(Navigate, {
      to: '/finance/budget-management',
      replace: true,
    }),
    requiredPermissions: ['finance:read'],
    module: 'finance',
    action: 'read',
  },
  {
    path: '/office-supplies',
    element: OfficeSuppliesManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/meeting-rooms',
    element: MeetingRoomManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/vehicles',
    element: VehicleManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/announcements',
    element: AnnouncementManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/erp/financial-reports',
    element: FinancialReportPage,
    requiredPermissions: ['erp:read'],
    module: 'erp',
    action: 'read',
  },
  {
    path: '/erp/vouchers',
    element: VoucherManagementPage,
    requiredPermissions: ['erp:read'],
    module: 'erp',
    action: 'read',
  },
  {
    path: '/erp/audit-logs',
    element: AuditLogPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/erp/dict',
    element: DictManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/erp/database',
    element: DatabaseManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
];
