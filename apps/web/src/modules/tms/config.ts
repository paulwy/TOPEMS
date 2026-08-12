import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

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

// ---- 路由配置（供路由系统使用） ----
export const tmsModuleConfig: RouteModuleConfig = {
  code: 'tms',
  name: '运输管理',
  icon: 'Truck',
  path: TMS_PATHS.root,
  source: 'plugin',
  suite: 'supply',
  status: 'online',
  order: 11,
  description: '车辆、司机、承运商、路线、运单管理',
  permission: 'tms:module:read',
  routes: [
    {
      path: TMS_PATHS.dashboard,
      element: lazyWithRetry(
        () => import('@/pages/tms/TmsDashboardPage'),
        'TmsDashboardPage'
      ),
      module: 'tms',
      code: 'tms-dashboard',
      title: '运输管理概览',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['tms:dashboard:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.vehicles,
      element: lazyWithRetry(
        () => import('@/pages/tms/VehicleManagementPage'),
        'VehicleManagementPage'
      ),
      module: 'tms',
      code: 'tms-vehicles',
      title: '车辆档案',
      template: 'list',
      group: 'master',
      requiredPermissions: ['tms:vehicle:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.drivers,
      element: lazyWithRetry(
        () => import('@/pages/tms/DriverManagementPage'),
        'DriverManagementPage'
      ),
      module: 'tms',
      code: 'tms-drivers',
      title: '司机档案',
      template: 'list',
      group: 'master',
      requiredPermissions: ['tms:driver:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.carriers,
      element: lazyWithRetry(
        () => import('@/pages/tms/CarrierManagementPage'),
        'CarrierManagementPage'
      ),
      module: 'tms',
      code: 'tms-carriers',
      title: '承运商管理',
      template: 'list',
      group: 'master',
      requiredPermissions: ['tms:carrier:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.routes,
      element: lazyWithRetry(
        () => import('@/pages/tms/RouteManagementPage'),
        'RouteManagementPage'
      ),
      module: 'tms',
      code: 'tms-routes',
      title: '路线管理',
      template: 'list',
      group: 'master',
      requiredPermissions: ['tms:route:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.shipments,
      element: lazyWithRetry(
        () => import('@/pages/tms/ShipmentManagementPage'),
        'ShipmentManagementPage'
      ),
      module: 'tms',
      code: 'tms-shipments',
      title: '运单管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['tms:shipment:read'],
      action: 'read',
    },
    // ---- BI 分析页（6 个） ----
    {
      path: TMS_PATHS.shipmentTrend,
      element: lazyWithRetry(
        () => import('@/pages/tms/analytics/ShipmentTrendPage'),
        'ShipmentTrendPage'
      ),
      module: 'tms',
      code: 'tms-shipment-trend',
      title: '运单趋势分析',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['tms:analytics:read', 'tms:dashboard:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.vehicleUtilization,
      element: lazyWithRetry(
        () => import('@/pages/tms/analytics/VehicleUtilizationPage'),
        'VehicleUtilizationPage'
      ),
      module: 'tms',
      code: 'tms-vehicle-utilization',
      title: '车辆利用率分析',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['tms:analytics:read', 'tms:dashboard:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.driverPerformance,
      element: lazyWithRetry(
        () => import('@/pages/tms/analytics/DriverPerformancePage'),
        'DriverPerformancePage'
      ),
      module: 'tms',
      code: 'tms-driver-performance',
      title: '司机绩效分析',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['tms:analytics:read', 'tms:dashboard:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.carrierPerformance,
      element: lazyWithRetry(
        () => import('@/pages/tms/analytics/CarrierPerformancePage'),
        'CarrierPerformancePage'
      ),
      module: 'tms',
      code: 'tms-carrier-performance',
      title: '承运商绩效分析',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['tms:analytics:read', 'tms:dashboard:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.routeEfficiency,
      element: lazyWithRetry(
        () => import('@/pages/tms/analytics/RouteEfficiencyPage'),
        'RouteEfficiencyPage'
      ),
      module: 'tms',
      code: 'tms-route-efficiency',
      title: '路线效率分析',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['tms:analytics:read', 'tms:dashboard:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.freightCost,
      element: lazyWithRetry(
        () => import('@/pages/tms/analytics/FreightCostPage'),
        'FreightCostPage'
      ),
      module: 'tms',
      code: 'tms-freight-cost',
      title: '运费成本分析',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['tms:analytics:read', 'tms:dashboard:read'],
      action: 'read',
    },
    // ---- 详情页（6 个） ----
    {
      path: TMS_PATHS.shipmentDetail,
      element: lazyWithRetry(
        () => import('@/pages/tms/ShipmentDetailPage'),
        'ShipmentDetailPage'
      ),
      module: 'tms',
      code: 'tms-shipment-detail',
      title: '运单详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['tms:shipment:read', 'tms:dashboard:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.vehicleDetail,
      element: lazyWithRetry(
        () => import('@/pages/tms/VehicleDetailPage'),
        'VehicleDetailPage'
      ),
      module: 'tms',
      code: 'tms-vehicle-detail',
      title: '车辆详情',
      template: 'detail',
      group: 'master',
      requiredPermissions: ['tms:vehicle:read', 'tms:dashboard:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.driverDetail,
      element: lazyWithRetry(
        () => import('@/pages/tms/DriverDetailPage'),
        'DriverDetailPage'
      ),
      module: 'tms',
      code: 'tms-driver-detail',
      title: '司机详情',
      template: 'detail',
      group: 'master',
      requiredPermissions: ['tms:driver:read', 'tms:dashboard:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.carrierDetail,
      element: lazyWithRetry(
        () => import('@/pages/tms/CarrierDetailPage'),
        'CarrierDetailPage'
      ),
      module: 'tms',
      code: 'tms-carrier-detail',
      title: '承运商详情',
      template: 'detail',
      group: 'master',
      requiredPermissions: ['tms:carrier:read', 'tms:dashboard:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.routeDetail,
      element: lazyWithRetry(
        () => import('@/pages/tms/RouteDetailPage'),
        'RouteDetailPage'
      ),
      module: 'tms',
      code: 'tms-route-detail',
      title: '路线详情',
      template: 'detail',
      group: 'master',
      requiredPermissions: ['tms:route:read', 'tms:dashboard:read'],
      action: 'read',
    },
    {
      path: TMS_PATHS.transportPlanDetail,
      element: lazyWithRetry(
        () => import('@/pages/tms/TransportPlanDetailPage'),
        'TransportPlanDetailPage'
      ),
      module: 'tms',
      code: 'tms-transport-plan-detail',
      title: '运输计划详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['tms:shipment:read', 'tms:dashboard:read'],
      action: 'read',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const tmsNavConfig: ModuleNavConfig = {
  code: 'tms',
  name: '运输管理',
  icon: 'Truck',
  path: TMS_PATHS.root,
  permission: 'tms:module:read',
  source: 'plugin',
  suite: 'supply',
  status: 'online',
  order: 11,
  description: '车辆、司机、承运商、路线、运单管理',
  navItems: [
    {
      code: 'tms-dashboard',
      label: '运输管理概览',
      icon: 'LayoutDashboard',
      path: TMS_PATHS.dashboard,
      permission: 'tms:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: '运输管理数据概览',
    },
    {
      code: 'tms-vehicles',
      label: '车辆档案',
      icon: 'Truck',
      path: TMS_PATHS.vehicles,
      permission: 'tms:vehicle:read',
      order: 1,
      group: 'master',
      description: '车辆档案管理',
    },
    {
      code: 'tms-drivers',
      label: '司机档案',
      icon: 'Users',
      path: TMS_PATHS.drivers,
      permission: 'tms:driver:read',
      order: 2,
      group: 'master',
      description: '司机档案管理',
    },
    {
      code: 'tms-carriers',
      label: '承运商管理',
      icon: 'Building',
      path: TMS_PATHS.carriers,
      permission: 'tms:carrier:read',
      order: 3,
      group: 'master',
      description: '承运商信息管理',
    },
    {
      code: 'tms-routes',
      label: '路线管理',
      icon: 'Route',
      path: TMS_PATHS.routes,
      permission: 'tms:route:read',
      order: 4,
      group: 'master',
      description: '运输路线管理',
    },
    {
      code: 'tms-shipments',
      label: '运单管理',
      icon: 'Package',
      path: TMS_PATHS.shipments,
      permission: 'tms:shipment:read',
      order: 5,
      group: 'business',
      showInTabs: true,
      description: '运输运单管理',
    },
  ],
};
