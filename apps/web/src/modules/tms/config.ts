import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 TMS_PATHS.xxx，而非硬编码字符串

export const TMS_PATHS = {
  root: '/tms',
  dashboard: '/tms/dashboard',
  vehicles: '/tms/vehicles',
  drivers: '/tms/drivers',
  carriers: '/tms/carriers',
  routes: '/tms/routes',
  shipments: '/tms/shipments',
  // BI 分析页
  shipmentTrend: '/tms/analytics/shipment-trend',
  vehicleUtilization: '/tms/analytics/vehicle-utilization',
  driverPerformance: '/tms/analytics/driver-performance',
  carrierPerformance: '/tms/analytics/carrier-performance',
  routeEfficiency: '/tms/analytics/route-efficiency',
  freightCost: '/tms/analytics/freight-cost',
  // 详情页
  shipmentDetail: '/tms/shipments/:id',
  vehicleDetail: '/tms/vehicles/:id',
  driverDetail: '/tms/drivers/:id',
  carrierDetail: '/tms/carriers/:id',
  routeDetail: '/tms/routes/:id',
  transportPlanDetail: '/tms/transport-plans/:id',
} as const;
interface TmsDashboardPageProps {}

export interface VehicleManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface DriverManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface CarrierManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RouteManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface ShipmentManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface ShipmentTrendPageProps {}

interface VehicleUtilizationPageProps {}

interface DriverPerformancePageProps {}

interface CarrierPerformancePageProps {}

interface RouteEfficiencyPageProps {}

interface FreightCostPageProps {}

interface ShipmentDetailPageProps {
  id?: string;
  entityType?: string;
}

interface VehicleDetailPageProps {
  id?: string;
  entityType?: string;
}

interface DriverDetailPageProps {
  id?: string;
  entityType?: string;
}

interface CarrierDetailPageProps {
  id?: string;
  entityType?: string;
}

interface RouteDetailPageProps {
  id?: string;
  entityType?: string;
}

interface TransportPlanDetailPageProps {
  id?: string;
  entityType?: string;
}

const tmsDashboardRoute: RouteConfigV2<TmsDashboardPageProps> = {
  path: TMS_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/tms/TmsDashboardPage'), 'TmsDashboardPage'),
  module: 'tms',
  code: 'tms-dashboard',
  title: i18n.t('tms.nav.tms-dashboard'),
  titleKey: 'tms.nav.tms-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['tms:dashboard:read'],
  action: 'read',
};

const vehicleManagementRoute: RouteConfigV2<VehicleManagementPageProps> = {
  path: TMS_PATHS.vehicles,
  element: lazyWithRetry(
    () => import('@/pages/tms/VehicleManagementPage'),
    'VehicleManagementPage'
  ),
  module: 'tms',
  code: 'tms-vehicles',
  title: i18n.t('tms.nav.tms-vehicles'),
  titleKey: 'tms.nav.tms-vehicles',
  template: 'list',
  group: 'master',
  requiredPermissions: ['tms:vehicle:read'],
  action: 'read',
};

const driverManagementRoute: RouteConfigV2<DriverManagementPageProps> = {
  path: TMS_PATHS.drivers,
  element: lazyWithRetry(() => import('@/pages/tms/DriverManagementPage'), 'DriverManagementPage'),
  module: 'tms',
  code: 'tms-drivers',
  title: i18n.t('tms.nav.tms-drivers'),
  titleKey: 'tms.nav.tms-drivers',
  template: 'list',
  group: 'master',
  requiredPermissions: ['tms:driver:read'],
  action: 'read',
};

const carrierManagementRoute: RouteConfigV2<CarrierManagementPageProps> = {
  path: TMS_PATHS.carriers,
  element: lazyWithRetry(
    () => import('@/pages/tms/CarrierManagementPage'),
    'CarrierManagementPage'
  ),
  module: 'tms',
  code: 'tms-carriers',
  title: i18n.t('tms.nav.tms-carriers'),
  titleKey: 'tms.nav.tms-carriers',
  template: 'list',
  group: 'master',
  requiredPermissions: ['tms:carrier:read'],
  action: 'read',
};

const routeManagementRoute: RouteConfigV2<RouteManagementPageProps> = {
  path: TMS_PATHS.routes,
  element: lazyWithRetry(() => import('@/pages/tms/RouteManagementPage'), 'RouteManagementPage'),
  module: 'tms',
  code: 'tms-routes',
  title: i18n.t('tms.nav.tms-routes'),
  titleKey: 'tms.nav.tms-routes',
  template: 'list',
  group: 'master',
  requiredPermissions: ['tms:route:read'],
  action: 'read',
};

const shipmentManagementRoute: RouteConfigV2<ShipmentManagementPageProps> = {
  path: TMS_PATHS.shipments,
  element: lazyWithRetry(
    () => import('@/pages/tms/ShipmentManagementPage'),
    'ShipmentManagementPage'
  ),
  module: 'tms',
  code: 'tms-shipments',
  title: i18n.t('tms.nav.tms-shipments'),
  titleKey: 'tms.nav.tms-shipments',
  template: 'list',
  group: 'business',
  requiredPermissions: ['tms:shipment:read'],
  action: 'read',
};

const shipmentTrendRoute: RouteConfigV2<ShipmentTrendPageProps> = {
  path: TMS_PATHS.shipmentTrend,
  element: lazyWithRetry(
    () => import('@/pages/tms/analytics/ShipmentTrendPage'),
    'ShipmentTrendPage'
  ),
  module: 'tms',
  code: 'tms-shipment-trend',
  title: i18n.t('tms.nav.tms-shipment-trend'),
  titleKey: 'tms.nav.tms-shipment-trend',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['tms:analytics:read', 'tms:dashboard:read'],
  action: 'read',
};

const vehicleUtilizationRoute: RouteConfigV2<VehicleUtilizationPageProps> = {
  path: TMS_PATHS.vehicleUtilization,
  element: lazyWithRetry(
    () => import('@/pages/tms/analytics/VehicleUtilizationPage'),
    'VehicleUtilizationPage'
  ),
  module: 'tms',
  code: 'tms-vehicle-utilization',
  title: i18n.t('tms.nav.tms-vehicle-utilization'),
  titleKey: 'tms.nav.tms-vehicle-utilization',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['tms:analytics:read', 'tms:dashboard:read'],
  action: 'read',
};

const driverPerformanceRoute: RouteConfigV2<DriverPerformancePageProps> = {
  path: TMS_PATHS.driverPerformance,
  element: lazyWithRetry(
    () => import('@/pages/tms/analytics/DriverPerformancePage'),
    'DriverPerformancePage'
  ),
  module: 'tms',
  code: 'tms-driver-performance',
  title: i18n.t('tms.nav.tms-driver-performance'),
  titleKey: 'tms.nav.tms-driver-performance',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['tms:analytics:read', 'tms:dashboard:read'],
  action: 'read',
};

const carrierPerformanceRoute: RouteConfigV2<CarrierPerformancePageProps> = {
  path: TMS_PATHS.carrierPerformance,
  element: lazyWithRetry(
    () => import('@/pages/tms/analytics/CarrierPerformancePage'),
    'CarrierPerformancePage'
  ),
  module: 'tms',
  code: 'tms-carrier-performance',
  title: i18n.t('tms.nav.tms-carrier-performance'),
  titleKey: 'tms.nav.tms-carrier-performance',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['tms:analytics:read', 'tms:dashboard:read'],
  action: 'read',
};

const routeEfficiencyRoute: RouteConfigV2<RouteEfficiencyPageProps> = {
  path: TMS_PATHS.routeEfficiency,
  element: lazyWithRetry(
    () => import('@/pages/tms/analytics/RouteEfficiencyPage'),
    'RouteEfficiencyPage'
  ),
  module: 'tms',
  code: 'tms-route-efficiency',
  title: i18n.t('tms.nav.tms-route-efficiency'),
  titleKey: 'tms.nav.tms-route-efficiency',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['tms:analytics:read', 'tms:dashboard:read'],
  action: 'read',
};

const freightCostRoute: RouteConfigV2<FreightCostPageProps> = {
  path: TMS_PATHS.freightCost,
  element: lazyWithRetry(() => import('@/pages/tms/analytics/FreightCostPage'), 'FreightCostPage'),
  module: 'tms',
  code: 'tms-freight-cost',
  title: i18n.t('tms.nav.tms-freight-cost'),
  titleKey: 'tms.nav.tms-freight-cost',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['tms:analytics:read', 'tms:dashboard:read'],
  action: 'read',
};

const shipmentDetailRoute: RouteConfigV2<ShipmentDetailPageProps> = {
  path: TMS_PATHS.shipmentDetail,
  element: lazyWithRetry(() => import('@/pages/tms/ShipmentDetailPage'), 'ShipmentDetailPage'),
  module: 'tms',
  code: 'tms-shipment-detail',
  title: i18n.t('tms.nav.tms-shipment-detail'),
  titleKey: 'tms.nav.tms-shipment-detail',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['tms:shipment:read', 'tms:dashboard:read'],
  action: 'read',
};

const vehicleDetailRoute: RouteConfigV2<VehicleDetailPageProps> = {
  path: TMS_PATHS.vehicleDetail,
  element: lazyWithRetry(() => import('@/pages/tms/VehicleDetailPage'), 'VehicleDetailPage'),
  module: 'tms',
  code: 'tms-vehicle-detail',
  title: i18n.t('tms.nav.tms-vehicle-detail'),
  titleKey: 'tms.nav.tms-vehicle-detail',
  template: 'detail',
  group: 'master',
  requiredPermissions: ['tms:vehicle:read', 'tms:dashboard:read'],
  action: 'read',
};

const driverDetailRoute: RouteConfigV2<DriverDetailPageProps> = {
  path: TMS_PATHS.driverDetail,
  element: lazyWithRetry(() => import('@/pages/tms/DriverDetailPage'), 'DriverDetailPage'),
  module: 'tms',
  code: 'tms-driver-detail',
  title: i18n.t('tms.nav.tms-driver-detail'),
  titleKey: 'tms.nav.tms-driver-detail',
  template: 'detail',
  group: 'master',
  requiredPermissions: ['tms:driver:read', 'tms:dashboard:read'],
  action: 'read',
};

const carrierDetailRoute: RouteConfigV2<CarrierDetailPageProps> = {
  path: TMS_PATHS.carrierDetail,
  element: lazyWithRetry(() => import('@/pages/tms/CarrierDetailPage'), 'CarrierDetailPage'),
  module: 'tms',
  code: 'tms-carrier-detail',
  title: i18n.t('tms.nav.tms-carrier-detail'),
  titleKey: 'tms.nav.tms-carrier-detail',
  template: 'detail',
  group: 'master',
  requiredPermissions: ['tms:carrier:read', 'tms:dashboard:read'],
  action: 'read',
};

const routeDetailRoute: RouteConfigV2<RouteDetailPageProps> = {
  path: TMS_PATHS.routeDetail,
  element: lazyWithRetry(() => import('@/pages/tms/RouteDetailPage'), 'RouteDetailPage'),
  module: 'tms',
  code: 'tms-route-detail',
  title: i18n.t('tms.nav.tms-route-detail'),
  titleKey: 'tms.nav.tms-route-detail',
  template: 'detail',
  group: 'master',
  requiredPermissions: ['tms:route:read', 'tms:dashboard:read'],
  action: 'read',
};

const transportPlanDetailRoute: RouteConfigV2<TransportPlanDetailPageProps> = {
  path: TMS_PATHS.transportPlanDetail,
  element: lazyWithRetry(
    () => import('@/pages/tms/TransportPlanDetailPage'),
    'TransportPlanDetailPage'
  ),
  module: 'tms',
  code: 'tms-transport-plan-detail',
  title: i18n.t('tms.nav.tms-transport-plan-detail'),
  titleKey: 'tms.nav.tms-transport-plan-detail',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['tms:shipment:read', 'tms:dashboard:read'],
  action: 'read',
};

// ---- 路由配置（供路由系统使用） ----
export const tmsModuleConfig: RouteModuleConfig = {
  code: 'tms',
  name: i18n.t('shared.config.tms_name'),
  nameKey: 'shared.config.tms_name',
  icon: 'Truck',
  path: TMS_PATHS.root,
  source: 'plugin',
  suite: 'supply',
  status: 'online',
  order: 11,
  description: i18n.t('tms.nav.module_name_desc'),
  permission: 'tms:module:read',
  routes: [
    tmsDashboardRoute,
    vehicleManagementRoute,
    driverManagementRoute,
    carrierManagementRoute,
    routeManagementRoute,
    shipmentManagementRoute,
    shipmentTrendRoute,
    vehicleUtilizationRoute,
    driverPerformanceRoute,
    carrierPerformanceRoute,
    routeEfficiencyRoute,
    freightCostRoute,
    shipmentDetailRoute,
    vehicleDetailRoute,
    driverDetailRoute,
    carrierDetailRoute,
    routeDetailRoute,
    transportPlanDetailRoute,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const tmsNavConfig: ModuleNavConfig = {
  code: 'tms',
  name: i18n.t('tms.nav.module_name'),
  nameKey: 'tms.nav.module_name',
  icon: 'Truck',
  path: TMS_PATHS.root,
  permission: 'tms:module:read',
  source: 'plugin',
  suite: 'supply',
  status: 'online',
  order: 11,
  description: i18n.t('tms.nav.module_name_desc'),
  navItems: [
    {
      code: 'tms-dashboard',
      label: i18n.t('tms.nav.tms-dashboard'),
      labelKey: 'tms.nav.tms-dashboard',
      icon: 'LayoutDashboard',
      path: TMS_PATHS.dashboard,
      permission: 'tms:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('tms.nav.tms-dashboard_desc'),
    },
    {
      code: 'tms-vehicles',
      label: i18n.t('tms.nav.tms-vehicles'),
      labelKey: 'tms.nav.tms-vehicles',
      icon: 'Truck',
      path: TMS_PATHS.vehicles,
      permission: 'tms:vehicle:read',
      order: 1,
      group: 'master',
      description: i18n.t('tms.nav.tms-vehicles_desc'),
    },
    {
      code: 'tms-drivers',
      label: i18n.t('tms.nav.tms-drivers'),
      labelKey: 'tms.nav.tms-drivers',
      icon: 'Users',
      path: TMS_PATHS.drivers,
      permission: 'tms:driver:read',
      order: 2,
      group: 'master',
      description: i18n.t('tms.nav.tms-drivers_desc'),
    },
    {
      code: 'tms-carriers',
      label: i18n.t('tms.nav.tms-carriers'),
      labelKey: 'tms.nav.tms-carriers',
      icon: 'Building',
      path: TMS_PATHS.carriers,
      permission: 'tms:carrier:read',
      order: 3,
      group: 'master',
      description: i18n.t('tms.nav.tms-carriers_desc'),
    },
    {
      code: 'tms-routes',
      label: i18n.t('tms.nav.tms-routes'),
      labelKey: 'tms.nav.tms-routes',
      icon: 'Route',
      path: TMS_PATHS.routes,
      permission: 'tms:route:read',
      order: 4,
      group: 'master',
      description: i18n.t('tms.nav.tms-routes_desc'),
    },
    {
      code: 'tms-shipments',
      label: i18n.t('tms.nav.tms-shipments'),
      labelKey: 'tms.nav.tms-shipments',
      icon: 'Package',
      path: TMS_PATHS.shipments,
      permission: 'tms:shipment:read',
      order: 5,
      group: 'business',
      showInTabs: true,
      description: i18n.t('tms.nav.tms-shipments_desc'),
    },
    {
      code: 'tms-shipment-trend',
      label: i18n.t('tms.nav.tms-shipment-trend'),
      labelKey: 'tms.nav.tms-shipment-trend',
      icon: 'TrendingUp',
      path: TMS_PATHS.shipmentTrend,
      permission: 'tms:analytics:read',
      order: 0,
      group: 'analytics',
      description: i18n.t('tms.nav.tms-dashboard_desc'),
    },
    {
      code: 'tms-vehicle-utilization',
      label: i18n.t('tms.nav.tms-vehicle-utilization'),
      labelKey: 'tms.nav.tms-vehicle-utilization',
      icon: 'Gauge',
      path: TMS_PATHS.vehicleUtilization,
      permission: 'tms:analytics:read',
      order: 1,
      group: 'analytics',
      description: i18n.t('tms.nav.tms-vehicles_desc'),
    },
    {
      code: 'tms-driver-performance',
      label: i18n.t('tms.nav.tms-driver-performance'),
      labelKey: 'tms.nav.tms-driver-performance',
      icon: 'UserCheck',
      path: TMS_PATHS.driverPerformance,
      permission: 'tms:analytics:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('tms.nav.tms-drivers_desc'),
    },
    {
      code: 'tms-carrier-performance',
      label: i18n.t('tms.nav.tms-carrier-performance'),
      labelKey: 'tms.nav.tms-carrier-performance',
      icon: 'Building2',
      path: TMS_PATHS.carrierPerformance,
      permission: 'tms:analytics:read',
      order: 3,
      group: 'analytics',
      description: i18n.t('tms.nav.tms-carriers_desc'),
    },
    {
      code: 'tms-route-efficiency',
      label: i18n.t('tms.nav.tms-route-efficiency'),
      labelKey: 'tms.nav.tms-route-efficiency',
      icon: 'Map',
      path: TMS_PATHS.routeEfficiency,
      permission: 'tms:analytics:read',
      order: 4,
      group: 'analytics',
      description: i18n.t('tms.nav.tms-routes_desc'),
    },
    {
      code: 'tms-freight-cost',
      label: i18n.t('tms.nav.tms-freight-cost'),
      labelKey: 'tms.nav.tms-freight-cost',
      icon: 'DollarSign',
      path: TMS_PATHS.freightCost,
      permission: 'tms:analytics:read',
      order: 5,
      group: 'analytics',
      description: i18n.t('tms.nav.tms-shipments_desc'),
    },
  ],
};
