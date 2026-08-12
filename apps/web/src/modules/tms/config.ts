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
