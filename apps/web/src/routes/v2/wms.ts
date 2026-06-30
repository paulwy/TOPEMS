import { lazyWithRetry } from '../utils';
import type { RouteModuleConfig } from './types';

const WmsDashboardPage = lazyWithRetry(
  () => import('../../pages/wms/DashboardPage'),
  'DashboardPage'
);

export const wmsModuleConfig: RouteModuleConfig = {
  code: 'wms',
  name: '仓储管理',
  icon: 'Warehouse',
  path: '/wms',
  source: 'core',
  suite: 'supply',
  status: 'online',
  order: 12,
  description: '仓库管理、入库出库、库存盘点、批次管理',
  permission: 'wms:read',
  routes: [
    {
      path: '/wms/dashboard',
      element: WmsDashboardPage,
      module: 'wms',
      code: 'wms-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['wms:read'],
      nav: {
        label: '仪表盘',
        icon: 'LayoutDashboard',
        order: 0,
        group: 'overview',
        showInTabs: true,
      },
    },
    {
      path: '/wms/warehouse-management',
      element: lazyWithRetry(
        () => import('../../pages/wms/WarehouseManagementPage'),
        'WarehouseManagementPage'
      ),
      module: 'wms',
      code: 'wms-warehouses',
      title: '仓库管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['wms:warehouse:read'],
      nav: {
        label: '仓库管理',
        icon: 'Warehouse',
        order: 1,
        group: 'business',
        showInTabs: true,
      },
    },
    {
      path: '/wms/location-management',
      element: lazyWithRetry(
        () => import('../../pages/wms/LocationPage'),
        'LocationPage'
      ),
      module: 'wms',
      code: 'wms-locations',
      title: '库位管理',
      template: 'tree',
      group: 'business',
      requiredPermissions: ['wms:location:read'],
      nav: {
        label: '库位管理',
        icon: 'MapPin',
        order: 2,
        group: 'business',
      },
    },
    {
      path: '/wms/batch-management',
      element: lazyWithRetry(
        () => import('../../pages/wms/BatchManagementPage'),
        'BatchManagementPage'
      ),
      module: 'wms',
      code: 'wms-batches',
      title: '批次管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['wms:batch:read'],
      nav: {
        label: '批次管理',
        icon: 'Layers',
        order: 3,
        group: 'business',
      },
    },
    {
      path: '/wms/serial-number',
      element: lazyWithRetry(
        () => import('../../pages/wms/SerialNumberPage'),
        'SerialNumberPage'
      ),
      module: 'wms',
      code: 'wms-serial-number',
      title: '序列号管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['wms:serial_number:read'],
      nav: {
        label: '序列号管理',
        icon: 'Hash',
        order: 4,
        group: 'business',
      },
    },
    {
      path: '/wms/inbound',
      element: lazyWithRetry(
        () => import('../../pages/wms/InboundPage'),
        'InboundPage'
      ),
      module: 'wms',
      code: 'wms-inbound',
      title: '入库管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['wms:inbound:read'],
      nav: {
        label: '入库管理',
        icon: 'ArrowDownToLine',
        order: 1,
        group: 'process',
        showInTabs: true,
      },
    },
    {
      path: '/wms/inbound-order',
      element: lazyWithRetry(
        () => import('../../pages/wms/InboundOrderPage'),
        'InboundOrderPage'
      ),
      module: 'wms',
      code: 'wms-inbound-order',
      title: '入库单',
      template: 'list',
      group: 'process',
      requiredPermissions: ['wms:inbound:read'],
      nav: {
        label: '入库单',
        icon: 'FileText',
        order: 2,
        group: 'process',
      },
    },
    {
      path: '/wms/outbound',
      element: lazyWithRetry(
        () => import('../../pages/wms/OutboundPage'),
        'OutboundPage'
      ),
      module: 'wms',
      code: 'wms-outbound',
      title: '出库管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['wms:outbound:read'],
      nav: {
        label: '出库管理',
        icon: 'ArrowUpFromLine',
        order: 3,
        group: 'process',
      },
    },
    {
      path: '/wms/outbound-order',
      element: lazyWithRetry(
        () => import('../../pages/wms/OutboundOrderPage'),
        'OutboundOrderPage'
      ),
      module: 'wms',
      code: 'wms-outbound-order',
      title: '出库单',
      template: 'list',
      group: 'process',
      requiredPermissions: ['wms:outbound:read'],
      nav: {
        label: '出库单',
        icon: 'FileText',
        order: 4,
        group: 'process',
      },
    },
    {
      path: '/wms/transfer',
      element: lazyWithRetry(
        () => import('../../pages/wms/TransferPage'),
        'TransferPage'
      ),
      module: 'wms',
      code: 'wms-transfer',
      title: '调拨管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['wms:transfer:read'],
      nav: {
        label: '调拨管理',
        icon: 'ArrowRightLeft',
        order: 5,
        group: 'process',
      },
    },
    {
      path: '/wms/stock-take',
      element: lazyWithRetry(
        () => import('../../pages/wms/StockTakePage'),
        'StockTakePage'
      ),
      module: 'wms',
      code: 'wms-inventory-check',
      title: '库存盘点',
      template: 'list',
      group: 'process',
      requiredPermissions: ['wms:inventory_check:read'],
      nav: {
        label: '库存盘点',
        icon: 'ClipboardCheck',
        order: 6,
        group: 'process',
      },
    },
    {
      path: '/wms/replenishment',
      element: lazyWithRetry(
        () => import('../../pages/wms/ReplenishmentPage'),
        'ReplenishmentPage'
      ),
      module: 'wms',
      code: 'wms-replenishment',
      title: '补货管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['wms:replenishment:read'],
      nav: {
        label: '补货管理',
        icon: 'RefreshCw',
        order: 7,
        group: 'process',
      },
    },
    {
      path: '/wms/inventory',
      element: lazyWithRetry(
        () => import('../../pages/wms/InventoryPage'),
        'InventoryPage'
      ),
      module: 'wms',
      code: 'wms-items',
      title: '库存查询',
      template: 'list',
      group: 'analytics',
      requiredPermissions: ['wms:inventory:read'],
      nav: {
        label: '库存查询',
        icon: 'Package',
        order: 1,
        group: 'analytics',
      },
    },
    {
      path: '/wms/inventory-report',
      element: lazyWithRetry(
        () => import('../../pages/wms/InventoryReportPage'),
        'InventoryReportPage'
      ),
      module: 'wms',
      code: 'wms-inventory-report',
      title: '库存报表',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['wms:report:read'],
      nav: {
        label: '库存报表',
        icon: 'BarChart3',
        order: 2,
        group: 'analytics',
        showInTabs: true,
      },
    },
    {
      path: '/wms/supplier-management',
      element: lazyWithRetry(
        () => import('../../pages/wms/SupplierManagementPage'),
        'SupplierManagementPage'
      ),
      module: 'wms',
      code: 'wms-supplier-management',
      title: '供应商管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['wms:supplier:read'],
      nav: {
        label: '供应商管理',
        icon: 'Building2',
        order: 5,
        group: 'business',
      },
    },
    {
      path: '/wms/supplier-detail/:id',
      element: lazyWithRetry(
        () => import('../../pages/wms/SupplierDetailPage'),
        'SupplierDetailPage'
      ),
      module: 'wms',
      code: 'wms-supplier-detail',
      title: '供应商详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['wms:supplier:read'],
    },
  ],
};