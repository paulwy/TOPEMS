import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const WarehouseManagementPage = lazy(() => import('../pages/wms/WarehouseManagementPage'));
const InventoryPage = lazy(() => import('../pages/wms/InventoryPage'));
const InboundOrderPage = lazy(() => import('../pages/wms/InboundOrderPage'));
const OutboundOrderPage = lazy(() => import('../pages/wms/OutboundOrderPage'));
const StockTakePage = lazy(() => import('../pages/wms/StockTakePage'));
const SupplierManagementPage = lazy(() => import('../pages/wms/SupplierManagementPage'));
const WmsDashboardPage = lazy(() => import('../pages/wms/DashboardPage'));
const LocationPage = lazy(() => import('../pages/wms/LocationPage'));
const TransferPage = lazy(() => import('../pages/wms/TransferPage'));
const ReplenishmentPage = lazy(() => import('../pages/wms/ReplenishmentPage'));
const InboundPage = lazy(() => import('../pages/wms/InboundPage'));
const OutboundPage = lazy(() => import('../pages/wms/OutboundPage'));
const InventoryReportPage = lazy(() => import('../pages/wms/InventoryReportPage'));
const BatchManagementPage = lazy(() => import('../pages/wms/BatchManagementPage'));
const SerialNumberPage = lazy(() => import('../pages/wms/SerialNumberPage'));

export const wmsRoutes: RouteConfig[] = [
  {
    path: '/wms',
    element: React.createElement(Navigate, {
      to: '/wms/warehouses',
      replace: true,
    }),
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/warehouses',
    element: WarehouseManagementPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/inventory',
    element: InventoryPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/inbound-orders',
    element: InboundOrderPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/outbound-orders',
    element: OutboundOrderPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/stock-takes',
    element: StockTakePage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/suppliers',
    element: SupplierManagementPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/locations',
    element: LocationPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/transfers',
    element: TransferPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/replenishment',
    element: ReplenishmentPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/inbound',
    element: InboundPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/outbound',
    element: OutboundPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/reports',
    element: InventoryReportPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/batches',
    element: BatchManagementPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/serial-numbers',
    element: SerialNumberPage,
    requiredPermissions: ['wms:read'],
    module: 'wms',
    action: 'read',
  },
];
