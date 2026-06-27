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
const ProductionDashboardPage = lazy(() => import('../pages/mes/ProductionDashboardPage'));
const QualityTraceabilityPage = lazy(() => import('../pages/mes/QualityTraceabilityPage'));
const WIPPage = lazy(() => import('../pages/mes/WIPPage'));
const ProductionSchedulePage = lazy(() => import('../pages/mes/ProductionSchedulePage'));
const EquipmentManagementPage = lazy(() => import('../pages/mes/EquipmentManagementPage'));
const EquipmentOEEPage = lazy(() => import('../pages/mes/EquipmentOEEPage'));
const MaterialBOMPage = lazy(() => import('../pages/mes/MaterialBOMPage'));
const MaterialIssuePage = lazy(() => import('../pages/mes/MaterialIssuePage'));
const MaterialReturnPage = lazy(() => import('../pages/mes/MaterialReturnPage'));
const ProductionOrderDetailPage = lazy(() => import('../pages/mes/ProductionOrderDetailPage'));
const TraceabilityDetailPage = lazy(() => import('../pages/mes/TraceabilityDetailPage'));
const EquipmentMaintenanceDetailPage = lazy(
  () => import('../pages/mes/EquipmentMaintenanceDetailPage')
);
const ProcessRoutePage = lazy(() => import('../pages/mes/ProcessRoutePage'));
const ProcessFlowPage = lazy(() => import('../pages/mes/ProcessFlowPage'));
const MesQualityPage = lazy(() => import('../pages/mes/MesQualityPage'));

export const mesRoutes: RouteConfig[] = [
  {
    path: '/mes',
    element: React.createElement(Navigate, {
      to: '/mes/board',
      replace: true,
    }),
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
    path: '/mes/process-routes',
    element: ProcessRoutePage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/process-flows',
    element: ProcessFlowPage,
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
  {
    path: '/mes/quality',
    element: MesQualityPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/quality-traceability',
    element: QualityTraceabilityPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/wip',
    element: WIPPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/schedules',
    element: ProductionSchedulePage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/equipment',
    element: EquipmentManagementPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/equipment-oee',
    element: EquipmentOEEPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/boms',
    element: MaterialBOMPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/material-issues',
    element: MaterialIssuePage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/material-returns',
    element: MaterialReturnPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/orders/:id',
    element: ProductionOrderDetailPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/traceability/:batchNo',
    element: TraceabilityDetailPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
  {
    path: '/mes/equipment-maintenance/:id',
    element: EquipmentMaintenanceDetailPage,
    requiredPermissions: ['mes:read'],
    module: 'mes',
    action: 'read',
  },
];
