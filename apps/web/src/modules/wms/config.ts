import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

export interface WmsDashboardPageProps {}
export interface WarehouseManagementPageProps {
  warehouseId?: string;
}
export interface LocationPageProps {
  warehouseId?: string;
}
export interface InboundPageProps {
  status?: string;
}
export interface StockInFormProps {
  orderId?: string;
  warehouseId?: string;
  items?: Array<Record<string, unknown>>;
}
export interface WmsInboundDetailPageProps {
  id?: string;
}
export interface OutboundPageProps {
  status?: string;
}
export interface WmsOutboundDetailPageProps {
  id?: string;
}
export interface InventoryPageProps {
  warehouseId?: string;
  sku?: string;
}
export interface SupplierManagementPageProps {}
export interface SupplierDetailPageProps {
  id?: string;
}
export interface WmsStockTakeDetailPageProps {
  id?: string;
}

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 WMS_PATHS.xxx，而非硬编码字符串
export const WMS_PATHS = {
  root: '/wms',
  dashboard: '/wms/dashboard',
  warehouseManagement: '/wms/warehouse-management',
  locationManagement: '/wms/location-management',
  batchManagement: '/wms/batch-management',
  serialNumber: '/wms/serial-number',
  inbound: '/wms/inbound',
  inboundOrder: '/wms/inbound-order',
  outbound: '/wms/outbound',
  outboundOrder: '/wms/outbound-order',
  transfer: '/wms/transfer',
  stockTake: '/wms/stock-take',
  replenishment: '/wms/replenishment',
  inventory: '/wms/inventory',
  inventoryReport: '/wms/inventory-report',
  supplierManagement: '/wms/supplier-management',
  supplierDetail: '/wms/supplier-detail/:id',
  area: '/wms/area',
  settingLocationRule: '/wms/setting/location-rule',
  settingFifoPolicy: '/wms/setting/fifo-policy',
  settingInventoryCycle: '/wms/setting/inventory-cycle',
  settingInventoryThreshold: '/wms/setting/inventory-threshold',
  WmsInventoryTurnover: '/wms/analytics/inventory-turnover',
  WmsAgePareto: '/wms/analytics/age-pareto',
  WmsFlowTrend: '/wms/analytics/flow-trend',
  WmsAbcAnalysis: '/wms/analytics/abc-analysis',
  WmsLocationUtil: '/wms/analytics/location-utilization',
  WmsOrderFulfillment: '/wms/analytics/order-fulfillment',
  WmsInboundDetail: '/wms/inbound-orders/:id',
  WmsOutboundDetail: '/wms/outbound-orders/:id',
  WmsStockTakeDetail: '/wms/stock-takes/:id',
  WmsTransferDetail: '/wms/transfer-orders/:id',
  WmsWavePickDetail: '/wms/wave-picks/:id',
  WmsMovementDetail: '/wms/inventory-movements/:id',
} as const;

// ---- 路由配置（供路由系统使用） ----
const wmsDashboardRoute: RouteConfigV2<WmsDashboardPageProps> = {
  path: WMS_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/wms/DashboardPage'), 'DashboardPage'),
  module: 'wms',
  code: 'wms-dashboard',
  title: i18n.t('shared.config.k2'),
  titleKey: 'shared.config.k2',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['wms:dashboard:read'],
  action: 'read',
};

const warehouseManagementRoute: RouteConfigV2<WarehouseManagementPageProps> = {
  path: WMS_PATHS.warehouseManagement,
  element: lazyWithRetry(
    () => import('@/pages/wms/WarehouseManagementPage'),
    'WarehouseManagementPage'
  ),
  module: 'wms',
  code: 'wms-warehouses',
  title: i18n.t('shared.config.k3'),
  titleKey: 'shared.config.k3',
  template: 'list',
  group: 'master',
  requiredPermissions: ['wms:warehouse:read'],
  action: 'read',
};

const locationManagementRoute: RouteConfigV2<LocationPageProps> = {
  path: WMS_PATHS.locationManagement,
  element: lazyWithRetry(() => import('@/pages/wms/LocationPage'), 'LocationPage'),
  module: 'wms',
  code: 'wms-locations',
  title: i18n.t('shared.config.k4'),
  titleKey: 'shared.config.k4',
  template: 'tree',
  group: 'master',
  requiredPermissions: ['wms:location:read'],
  action: 'read',
};

const inboundRoute: RouteConfigV2<InboundPageProps> = {
  path: WMS_PATHS.inbound,
  element: lazyWithRetry(() => import('@/pages/wms/InboundPage'), 'InboundPage'),
  module: 'wms',
  code: 'wms-inbound',
  title: i18n.t('shared.config.k7'),
  titleKey: 'shared.config.k7',
  template: 'list',
  group: 'process',
  requiredPermissions: ['wms:inbound:read'],
  action: 'read',
};

const stockInFormRoute: RouteConfigV2<StockInFormProps> = inboundRoute as RouteConfigV2<StockInFormProps>;

const wmsInboundDetailRoute: RouteConfigV2<WmsInboundDetailPageProps> = {
  path: WMS_PATHS.WmsInboundDetail,
  element: lazyWithRetry(
    () => import('@/pages/wms/WmsInboundDetailPage'),
    'WmsInboundDetailPage'
  ),
  module: 'wms',
  code: 'wms-inbound-detail',
  title: i18n.t('shared.config.k27'),
  titleKey: 'shared.config.k27',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['wms:inbound:read'],
  action: 'read',
};

const outboundRoute: RouteConfigV2<OutboundPageProps> = {
  path: WMS_PATHS.outbound,
  element: lazyWithRetry(() => import('@/pages/wms/OutboundPage'), 'OutboundPage'),
  module: 'wms',
  code: 'wms-outbound',
  title: i18n.t('shared.config.k9'),
  titleKey: 'shared.config.k9',
  template: 'list',
  group: 'process',
  requiredPermissions: ['wms:outbound:read'],
  action: 'read',
};

const wmsOutboundDetailRoute: RouteConfigV2<WmsOutboundDetailPageProps> = {
  path: WMS_PATHS.WmsOutboundDetail,
  element: lazyWithRetry(
    () => import('@/pages/wms/WmsOutboundDetailPage'),
    'WmsOutboundDetailPage'
  ),
  module: 'wms',
  code: 'wms-outbound-detail',
  title: i18n.t('shared.config.k28'),
  titleKey: 'shared.config.k28',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['wms:outbound:read'],
  action: 'read',
};

const inventoryRoute: RouteConfigV2<InventoryPageProps> = {
  path: WMS_PATHS.inventory,
  element: lazyWithRetry(() => import('@/pages/wms/InventoryPage'), 'InventoryPage'),
  module: 'wms',
  code: 'wms-items',
  title: i18n.t('shared.config.k14'),
  titleKey: 'shared.config.k14',
  template: 'list',
  group: 'analytics',
  requiredPermissions: ['wms:inventory:read'],
  action: 'read',
};

const supplierManagementRoute: RouteConfigV2<SupplierManagementPageProps> = {
  path: WMS_PATHS.supplierManagement,
  element: lazyWithRetry(
    () => import('@/pages/wms/SupplierManagementPage'),
    'SupplierManagementPage'
  ),
  module: 'wms',
  code: 'wms-supplier-management',
  title: i18n.t('shared.config.k16'),
  titleKey: 'shared.config.k16',
  template: 'list',
  group: 'master',
  requiredPermissions: ['wms:supplier:read'],
  action: 'read',
};

const supplierDetailRoute: RouteConfigV2<SupplierDetailPageProps> = {
  path: WMS_PATHS.supplierDetail,
  element: lazyWithRetry(() => import('@/pages/wms/SupplierDetailPage'), 'SupplierDetailPage'),
  module: 'wms',
  code: 'wms-supplier-detail',
  title: i18n.t('shared.config.k17'),
  titleKey: 'shared.config.k17',
  template: 'detail',
  group: 'master',
  requiredPermissions: ['wms:supplier:read'],
  action: 'read',
};

const wmsStockTakeDetailRoute: RouteConfigV2<WmsStockTakeDetailPageProps> = {
  path: WMS_PATHS.WmsStockTakeDetail,
  element: lazyWithRetry(
    () => import('@/pages/wms/WmsStockTakeDetailPage'),
    'WmsStockTakeDetailPage'
  ),
  module: 'wms',
  code: 'wms-stocktake-detail',
  title: i18n.t('shared.config.k29'),
  titleKey: 'shared.config.k29',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['wms:stocktake:read'],
  action: 'read',
};

const wmsRoutes: RouteConfigV2[] = [
  wmsDashboardRoute,
  warehouseManagementRoute,
  locationManagementRoute,
  {
    path: WMS_PATHS.batchManagement,
    element: lazyWithRetry(
      () => import('@/pages/wms/BatchManagementPage'),
      'BatchManagementPage'
    ),
    module: 'wms',
    code: 'wms-batches',
    title: i18n.t('shared.config.k5'),
    titleKey: 'shared.config.k5',
    template: 'list',
    group: 'master',
    requiredPermissions: ['wms:batch:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.serialNumber,
    element: lazyWithRetry(() => import('@/pages/wms/SerialNumberPage'), 'SerialNumberPage'),
    module: 'wms',
    code: 'wms-serial-number',
    title: i18n.t('shared.config.k6'),
    titleKey: 'shared.config.k6',
    template: 'list',
    group: 'master',
    requiredPermissions: ['wms:serial_number:read'],
    action: 'read',
  },
  stockInFormRoute,
  {
    path: WMS_PATHS.inboundOrder,
    element: lazyWithRetry(() => import('@/pages/wms/InboundOrderPage'), 'InboundOrderPage'),
    module: 'wms',
    code: 'wms-inbound-order',
    title: i18n.t('shared.config.k8'),
    titleKey: 'shared.config.k8',
    template: 'list',
    group: 'process',
    requiredPermissions: ['wms:inbound:read'],
    action: 'read',
  },
  outboundRoute,
  {
    path: WMS_PATHS.outboundOrder,
    element: lazyWithRetry(() => import('@/pages/wms/OutboundOrderPage'), 'OutboundOrderPage'),
    module: 'wms',
    code: 'wms-outbound-order',
    title: i18n.t('shared.config.k10'),
    titleKey: 'shared.config.k10',
    template: 'list',
    group: 'process',
    requiredPermissions: ['wms:outbound:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.transfer,
    element: lazyWithRetry(() => import('@/pages/wms/TransferPage'), 'TransferPage'),
    module: 'wms',
    code: 'wms-transfer',
    title: i18n.t('shared.config.k11'),
    titleKey: 'shared.config.k11',
    template: 'list',
    group: 'process',
    requiredPermissions: ['wms:transfer:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.stockTake,
    element: lazyWithRetry(() => import('@/pages/wms/StockTakePage'), 'StockTakePage'),
    module: 'wms',
    code: 'wms-inventory-check',
    title: i18n.t('shared.config.k12'),
    titleKey: 'shared.config.k12',
    template: 'list',
    group: 'process',
    requiredPermissions: ['wms:inventory_check:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.replenishment,
    element: lazyWithRetry(() => import('@/pages/wms/ReplenishmentPage'), 'ReplenishmentPage'),
    module: 'wms',
    code: 'wms-replenishment',
    title: i18n.t('shared.config.k13'),
    titleKey: 'shared.config.k13',
    template: 'list',
    group: 'process',
    requiredPermissions: ['wms:replenishment:read'],
    action: 'read',
  },
  inventoryRoute,
  {
    path: WMS_PATHS.inventoryReport,
    element: lazyWithRetry(
      () => import('@/pages/wms/InventoryReportPage'),
      'InventoryReportPage'
    ),
    module: 'wms',
    code: 'wms-inventory-report',
    title: i18n.t('shared.config.k15'),
    titleKey: 'shared.config.k15',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['wms:report:read'],
    action: 'read',
  },
  supplierManagementRoute,
  supplierDetailRoute,
  {
    path: WMS_PATHS.area,
    element: lazyWithRetry(() => import('@/pages/wms/WmsAreaPage'), 'WmsAreaPage'),
    module: 'wms',
    code: 'wms-area',
    title: i18n.t('shared.config.k18'),
    titleKey: 'shared.config.k18',
    template: 'tree',
    group: 'master',
    requiredPermissions: ['wms:area:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.settingLocationRule,
    element: lazyWithRetry(
      () => import('@/pages/wms/setting/LocationRulePage'),
      'LocationRulePage'
    ),
    module: 'wms',
    code: 'wms-location-rule',
    title: i18n.t('shared.config.k19'),
    titleKey: 'shared.config.k19',
    template: 'settings',
    group: 'setting',
    requiredPermissions: ['wms:location_rule:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.settingFifoPolicy,
    element: lazyWithRetry(() => import('@/pages/wms/setting/FifoPolicyPage'), 'FifoPolicyPage'),
    module: 'wms',
    code: 'wms-fifo-policy',
    title: i18n.t('shared.config.fifo_0'),
    titleKey: 'shared.config.fifo_0',
    template: 'settings',
    group: 'setting',
    requiredPermissions: ['wms:fifo_policy:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.settingInventoryCycle,
    element: lazyWithRetry(
      () => import('@/pages/wms/setting/InventoryCyclePage'),
      'InventoryCyclePage'
    ),
    module: 'wms',
    code: 'wms-inventory-cycle',
    title: i18n.t('shared.config.k20'),
    titleKey: 'shared.config.k20',
    template: 'settings',
    group: 'setting',
    requiredPermissions: ['wms:inventory_cycle:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.settingInventoryThreshold,
    element: lazyWithRetry(
      () => import('@/pages/wms/setting/InventoryThresholdPage'),
      'InventoryThresholdPage'
    ),
    module: 'wms',
    code: 'wms-inventory-threshold',
    title: i18n.t('shared.config.k21'),
    titleKey: 'shared.config.k21',
    template: 'settings',
    group: 'setting',
    requiredPermissions: ['wms:inventory_threshold:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.WmsInventoryTurnover,
    element: lazyWithRetry(
      () => import('@/pages/wms/analytics/WmsInventoryTurnoverPage'),
      'WmsInventoryTurnoverPage'
    ),
    module: 'wms',
    code: 'wms-analytics-turnover',
    title: i18n.t('shared.config.k22'),
    titleKey: 'shared.config.k22',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['wms:turnover:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.WmsAgePareto,
    element: lazyWithRetry(
      () => import('@/pages/wms/analytics/WmsAgeParetoPage'),
      'WmsAgeParetoPage'
    ),
    module: 'wms',
    code: 'wms-analytics-pareto',
    title: i18n.t('shared.config.k23'),
    titleKey: 'shared.config.k23',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['wms:pareto:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.WmsFlowTrend,
    element: lazyWithRetry(
      () => import('@/pages/wms/analytics/WmsFlowTrendPage'),
      'WmsFlowTrendPage'
    ),
    module: 'wms',
    code: 'wms-analytics-flow',
    title: i18n.t('shared.config.k24'),
    titleKey: 'shared.config.k24',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['wms:flow:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.WmsAbcAnalysis,
    element: lazyWithRetry(
      () => import('@/pages/wms/analytics/WmsAbcAnalysisPage'),
      'WmsAbcAnalysisPage'
    ),
    module: 'wms',
    code: 'wms-analytics-abc',
    title: i18n.t('shared.config.abc_1'),
    titleKey: 'shared.config.abc_1',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['wms:abc:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.WmsLocationUtil,
    element: lazyWithRetry(
      () => import('@/pages/wms/analytics/WmsLocationUtilizationPage'),
      'WmsLocationUtilizationPage'
    ),
    module: 'wms',
    code: 'wms-analytics-locutil',
    title: i18n.t('shared.config.k25'),
    titleKey: 'shared.config.k25',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['wms:locutil:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.WmsOrderFulfillment,
    element: lazyWithRetry(
      () => import('@/pages/wms/analytics/WmsOrderFulfillmentPage'),
      'WmsOrderFulfillmentPage'
    ),
    module: 'wms',
    code: 'wms-analytics-fulfillment',
    title: i18n.t('shared.config.sla_26'),
    titleKey: 'shared.config.sla_26',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['wms:fulfillment:read'],
    action: 'read',
  },
  wmsInboundDetailRoute,
  wmsOutboundDetailRoute,
  wmsStockTakeDetailRoute,
  {
    path: WMS_PATHS.WmsTransferDetail,
    element: lazyWithRetry(
      () => import('@/pages/wms/WmsTransferDetailPage'),
      'WmsTransferDetailPage'
    ),
    module: 'wms',
    code: 'wms-transfer-detail',
    title: i18n.t('shared.config.k30'),
    titleKey: 'shared.config.k30',
    template: 'detail',
    group: 'business',
    requiredPermissions: ['wms:transfer:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.WmsWavePickDetail,
    element: lazyWithRetry(
      () => import('@/pages/wms/WmsWavePickDetailPage'),
      'WmsWavePickDetailPage'
    ),
    module: 'wms',
    code: 'wms-wavepick-detail',
    title: i18n.t('shared.config.k31'),
    titleKey: 'shared.config.k31',
    template: 'detail',
    group: 'business',
    requiredPermissions: ['wms:wavepick:read'],
    action: 'read',
  },
  {
    path: WMS_PATHS.WmsMovementDetail,
    element: lazyWithRetry(
      () => import('@/pages/wms/WmsInventoryMovementDetailPage'),
      'WmsInventoryMovementDetailPage'
    ),
    module: 'wms',
    code: 'wms-movement-detail',
    title: i18n.t('shared.config.k32'),
    titleKey: 'shared.config.k32',
    template: 'detail',
    group: 'business',
    requiredPermissions: ['wms:movement:read'],
    action: 'read',
  },
];

export const wmsModuleConfig: RouteModuleConfig = {
  code: 'wms',
  name: i18n.t('shared.config.wms_name'),
  nameKey: 'shared.config.wms_name',
  icon: 'Warehouse',
  path: WMS_PATHS.root,
  source: 'core',
  suite: 'supply',
  status: 'online',
  order: 12,
  description: i18n.t('shared.config.k1'),
  permission: 'wms:module:read',
  routes: wmsRoutes,
};

// ---- 导航配置（供导航注册表使用） ----
export const wmsNavConfig: ModuleNavConfig = {
  code: 'wms',
  name: i18n.t('shared.config.k33'),
  nameKey: 'shared.config.k33',
  icon: 'Warehouse',
  path: WMS_PATHS.root,
  permission: 'wms:module:read',
  source: 'core',
  suite: 'supply',
  status: 'online',
  order: 12,
  description: i18n.t('shared.config.k34'),
  navItems: [
    {
      code: 'wms-dashboard',
      label: i18n.t('shared.config.k35'),
      labelKey: 'shared.config.k35',
      icon: 'LayoutDashboard',
      path: WMS_PATHS.dashboard,
      permission: 'wms:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.wms_2'),
    },
    {
      code: 'wms-warehouses',
      label: i18n.t('shared.config.k36'),
      labelKey: 'shared.config.k36',
      icon: 'Warehouse',
      path: WMS_PATHS.warehouseManagement,
      permission: 'wms:warehouse:read',
      order: 1,
      group: 'master',
      showInTabs: true,
      description: i18n.t('shared.config.k37'),
    },
    {
      code: 'wms-locations',
      label: i18n.t('shared.config.k38'),
      labelKey: 'shared.config.k38',
      icon: 'MapPin',
      path: WMS_PATHS.locationManagement,
      permission: 'wms:location:read',
      order: 2,
      group: 'master',
      description: i18n.t('shared.config.k39'),
    },
    {
      code: 'wms-batches',
      label: i18n.t('shared.config.k40'),
      labelKey: 'shared.config.k40',
      icon: 'Layers',
      path: WMS_PATHS.batchManagement,
      permission: 'wms:batch:read',
      order: 3,
      group: 'master',
      description: i18n.t('shared.config.k41'),
    },
    {
      code: 'wms-serial-number',
      label: i18n.t('shared.config.k42'),
      labelKey: 'shared.config.k42',
      icon: 'Hash',
      path: WMS_PATHS.serialNumber,
      permission: 'wms:serial_number:read',
      order: 4,
      group: 'master',
      description: i18n.t('shared.config.k43'),
    },
    {
      code: 'wms-supplier-management',
      label: i18n.t('shared.config.k44'),
      labelKey: 'shared.config.k44',
      icon: 'Building2',
      path: WMS_PATHS.supplierManagement,
      permission: 'wms:supplier:read',
      order: 5,
      group: 'master',
      description: i18n.t('shared.config.k45'),
    },
    {
      code: 'wms-inbound',
      label: i18n.t('shared.config.k46'),
      labelKey: 'shared.config.k46',
      icon: 'ArrowDownToLine',
      path: WMS_PATHS.inbound,
      permission: 'wms:inbound:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k47'),
    },
    {
      code: 'wms-inbound-order',
      label: i18n.t('shared.config.k48'),
      labelKey: 'shared.config.k48',
      icon: 'FileText',
      path: WMS_PATHS.inboundOrder,
      permission: 'wms:inbound:read',
      order: 2,
      group: 'process',
      description: i18n.t('shared.config.k49'),
    },
    {
      code: 'wms-outbound',
      label: i18n.t('shared.config.k50'),
      labelKey: 'shared.config.k50',
      icon: 'ArrowUpFromLine',
      path: WMS_PATHS.outbound,
      permission: 'wms:outbound:read',
      order: 3,
      group: 'process',
      description: i18n.t('shared.config.k51'),
    },
    {
      code: 'wms-outbound-order',
      label: i18n.t('shared.config.k52'),
      labelKey: 'shared.config.k52',
      icon: 'FileText',
      path: WMS_PATHS.outboundOrder,
      permission: 'wms:outbound:read',
      order: 4,
      group: 'process',
      description: i18n.t('shared.config.k53'),
    },
    {
      code: 'wms-transfer',
      label: i18n.t('shared.config.k54'),
      labelKey: 'shared.config.k54',
      icon: 'ArrowRightLeft',
      path: WMS_PATHS.transfer,
      permission: 'wms:transfer:read',
      order: 5,
      group: 'process',
      description: i18n.t('shared.config.k55'),
    },
    {
      code: 'wms-inventory-check',
      label: i18n.t('shared.config.k56'),
      labelKey: 'shared.config.k56',
      icon: 'ClipboardCheck',
      path: WMS_PATHS.stockTake,
      permission: 'wms:inventory_check:read',
      order: 6,
      group: 'process',
      description: i18n.t('shared.config.k57'),
    },
    {
      code: 'wms-replenishment',
      label: i18n.t('shared.config.k58'),
      labelKey: 'shared.config.k58',
      icon: 'RefreshCw',
      path: WMS_PATHS.replenishment,
      permission: 'wms:replenishment:read',
      order: 7,
      group: 'process',
      description: i18n.t('shared.config.k59'),
    },
    {
      code: 'wms-items',
      label: i18n.t('shared.config.k60'),
      labelKey: 'shared.config.k60',
      icon: 'Package',
      path: WMS_PATHS.inventory,
      permission: 'wms:inventory:read',
      order: 1,
      group: 'analytics',
      description: i18n.t('shared.config.k61'),
    },
    {
      code: 'wms-inventory-report',
      label: i18n.t('shared.config.k62'),
      labelKey: 'shared.config.k62',
      icon: 'BarChart3',
      path: WMS_PATHS.inventoryReport,
      permission: 'wms:report:read',
      order: 2,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('shared.config.k63'),
    },
    {
      code: 'wms-analytics-turnover',
      label: i18n.t('shared.config.k64'),
      labelKey: 'shared.config.k64',
      icon: 'TrendingUp',
      path: WMS_PATHS.WmsInventoryTurnover,
      permission: 'wms:turnover:read',
      order: 10,
      group: 'analytics',
      description: i18n.t('shared.config.k65'),
    },
    {
      code: 'wms-analytics-pareto',
      label: i18n.t('shared.config.k66'),
      labelKey: 'shared.config.k66',
      icon: 'BarChart2',
      path: WMS_PATHS.WmsAgePareto,
      permission: 'wms:pareto:read',
      order: 11,
      group: 'analytics',
      description: i18n.t('shared.config.sku8020_3'),
    },
    {
      code: 'wms-analytics-flow',
      label: i18n.t('shared.config.k67'),
      labelKey: 'shared.config.k67',
      icon: 'AreaChart',
      path: WMS_PATHS.WmsFlowTrend,
      permission: 'wms:flow:read',
      order: 12,
      group: 'analytics',
      description: i18n.t('shared.config.30_68'),
    },
    {
      code: 'wms-analytics-abc',
      label: i18n.t('shared.config.abc_4'),
      labelKey: 'shared.config.abc_4',
      icon: 'PieChart',
      path: WMS_PATHS.WmsAbcAnalysis,
      permission: 'wms:abc:read',
      order: 13,
      group: 'analytics',
      description: i18n.t('shared.config.k5'),
    },
    {
      code: 'wms-analytics-locutil',
      label: i18n.t('shared.config.k69'),
      labelKey: 'shared.config.k69',
      icon: 'MapPin',
      path: WMS_PATHS.WmsLocationUtil,
      permission: 'wms:locutil:read',
      order: 14,
      group: 'analytics',
      description: i18n.t('shared.config.k70'),
    },
    {
      code: 'wms-analytics-fulfillment',
      label: i18n.t('shared.config.sla_71'),
      labelKey: 'shared.config.sla_71',
      icon: 'Gauge',
      path: WMS_PATHS.WmsOrderFulfillment,
      permission: 'wms:fulfillment:read',
      order: 15,
      group: 'analytics',
      description: i18n.t('shared.config.k6'),
    },
    {
      code: 'wms-area',
      label: i18n.t('shared.config.k72'),
      labelKey: 'shared.config.k72',
      icon: 'Map',
      path: WMS_PATHS.area,
      permission: 'wms:area:read',
      order: 6,
      group: 'master',
      description: i18n.t('shared.config.k73'),
    },
    {
      code: 'wms-location-rule',
      label: i18n.t('shared.config.k74'),
      labelKey: 'shared.config.k74',
      icon: 'MapPin',
      path: WMS_PATHS.settingLocationRule,
      permission: 'wms:location_rule:read',
      order: 1,
      group: 'setting',
      description: i18n.t('shared.config.k75'),
    },
    {
      code: 'wms-fifo-policy',
      label: i18n.t('shared.config.fifo_7'),
      labelKey: 'shared.config.fifo_7',
      icon: 'ArrowRightLeft',
      path: WMS_PATHS.settingFifoPolicy,
      permission: 'wms:fifo_policy:read',
      order: 2,
      group: 'setting',
      description: i18n.t('shared.config.k76'),
    },
    {
      code: 'wms-inventory-cycle',
      label: i18n.t('shared.config.k77'),
      labelKey: 'shared.config.k77',
      icon: 'ClipboardCheck',
      path: WMS_PATHS.settingInventoryCycle,
      permission: 'wms:inventory_cycle:read',
      order: 3,
      group: 'setting',
      description: i18n.t('shared.config.k78'),
    },
    {
      code: 'wms-inventory-threshold',
      label: i18n.t('shared.config.k79'),
      labelKey: 'shared.config.k79',
      icon: 'AlertTriangle',
      path: WMS_PATHS.settingInventoryThreshold,
      permission: 'wms:inventory_threshold:read',
      order: 4,
      group: 'setting',
      description: i18n.t('shared.config.k80'),
    },
  ],
};
