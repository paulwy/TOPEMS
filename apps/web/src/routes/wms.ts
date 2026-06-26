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

export const wmsRoutes: RouteConfig[] = [
  {
    path: '/wms',
    element: WmsDashboardPage,
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
];
