import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const ProductionOrderManagementPage = lazy(
  () => import('../pages/mes/ProductionOrderManagementPage')
);
const ProductionProcessPage = lazy(() => import('../pages/mes/ProductionProcessPage'));
const WorkStationPage = lazy(() => import('../pages/mes/WorkStationPage'));
const ProductionRecordPage = lazy(() => import('../pages/mes/ProductionRecordPage'));
const MesDashboardPage = lazy(() => import('../pages/mes/DashboardPage'));
const ProductionDashboardPage = lazy(
  () => import('../pages/mes/ProductionDashboardPage')
);

export const mesRoutes: RouteConfig[] = [
  {
    path: '/mes',
    element: MesDashboardPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/board',
    element: ProductionDashboardPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/orders',
    element: ProductionOrderManagementPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/processes',
    element: ProductionProcessPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/workstations',
    element: WorkStationPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/records',
    element: ProductionRecordPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
];
