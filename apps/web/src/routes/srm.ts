import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const SrmDashboardPage = lazy(() => import('../pages/srm/SrmDashboardPage'));
const SrmSupplierPage = lazy(() => import('../pages/srm/SrmSupplierPage'));
const SrmEvaluationPage = lazy(() => import('../pages/srm/SrmEvaluationPage'));
const SrmOrderPage = lazy(() => import('../pages/srm/SrmOrderPage'));
const SrmContractPage = lazy(() => import('../pages/srm/SrmContractPage'));
const SrmFinancePage = lazy(() => import('../pages/srm/SrmFinancePage'));
const SrmPerformancePage = lazy(() => import('../pages/srm/SrmPerformancePage'));
const SupplierDetailPage = lazy(() => import('../pages/wms/SupplierDetailPage'));

export const srmRoutes: RouteConfig[] = [
  {
    path: '/srm',
    element: React.createElement(Navigate, {
      to: '/srm/dashboard',
      replace: true,
    }),
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/dashboard',
    element: SrmDashboardPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/suppliers',
    element: SrmSupplierPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/suppliers/:id',
    element: SupplierDetailPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/evaluations',
    element: SrmEvaluationPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/orders',
    element: SrmOrderPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/contracts',
    element: SrmContractPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/finance',
    element: SrmFinancePage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/performance',
    element: SrmPerformancePage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
];
