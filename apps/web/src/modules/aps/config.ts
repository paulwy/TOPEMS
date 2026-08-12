import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 APS_PATHS.xxx，而非硬编码字符串
export const APS_PATHS = {
  root: '/aps',
  dashboard: '/aps/dashboard',
  productionPlans: '/aps/production-plans',
  schedules: '/aps/schedules',
  capacities: '/aps/capacities',
  materialPlans: '/aps/material-plans',
  forecasts: '/aps/forecasts',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const apsModuleConfig: RouteModuleConfig = {
  code: 'aps',
  name: '高级计划排程',
  icon: 'CalendarClock',
  path: APS_PATHS.root,
  source: 'plugin',
  suite: 'manufacturing',
  status: 'online',
  order: 12,
  description: '生产计划、排程、产能、物料计划、需求预测',
  permission: 'aps:module:read',
  routes: [
    {
      path: APS_PATHS.dashboard,
      element: lazyWithRetry(
        () => import('@/pages/aps/ApsDashboardPage'),
        'ApsDashboardPage'
      ),
      module: 'aps',
      code: 'aps-dashboard',
      title: '高级计划排程概览',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['aps:dashboard:read'],
      action: 'read',
    },
    {
      path: APS_PATHS.productionPlans,
      element: lazyWithRetry(
        () => import('@/pages/aps/ProductionPlanPage'),
        'ProductionPlanPage'
      ),
      module: 'aps',
      code: 'aps-production-plans',
      title: '生产计划',
      template: 'list',
      group: 'business',
      requiredPermissions: ['aps:production_plan:read'],
      action: 'read',
    },
    {
      path: APS_PATHS.schedules,
      element: lazyWithRetry(
        () => import('@/pages/aps/ScheduleManagementPage'),
        'ScheduleManagementPage'
      ),
      module: 'aps',
      code: 'aps-schedules',
      title: '排程管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['aps:schedule:read'],
      action: 'read',
    },
    {
      path: APS_PATHS.capacities,
      element: lazyWithRetry(
        () => import('@/pages/aps/CapacityManagementPage'),
        'CapacityManagementPage'
      ),
      module: 'aps',
      code: 'aps-capacities',
      title: '产能管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['aps:capacity:read'],
      action: 'read',
    },
    {
      path: APS_PATHS.materialPlans,
      element: lazyWithRetry(
        () => import('@/pages/aps/MaterialPlanPage'),
        'MaterialPlanPage'
      ),
      module: 'aps',
      code: 'aps-material-plans',
      title: '物料计划',
      template: 'list',
      group: 'business',
      requiredPermissions: ['aps:material_plan:read'],
      action: 'read',
    },
    {
      path: APS_PATHS.forecasts,
      element: lazyWithRetry(
        () => import('@/pages/aps/ForecastManagementPage'),
        'ForecastManagementPage'
      ),
      module: 'aps',
      code: 'aps-forecasts',
      title: '需求预测',
      template: 'list',
      group: 'analytics',
      requiredPermissions: ['aps:forecast:read'],
      action: 'read',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const apsNavConfig: ModuleNavConfig = {
  code: 'aps',
  name: '高级计划排程',
  icon: 'CalendarClock',
  path: APS_PATHS.root,
  permission: 'aps:module:read',
  source: 'plugin',
  suite: 'manufacturing',
  status: 'online',
  order: 12,
  description: '生产计划、排程、产能、物料计划、需求预测',
  navItems: [
    {
      code: 'aps-dashboard',
      label: '高级计划排程概览',
      icon: 'LayoutDashboard',
      path: APS_PATHS.dashboard,
      permission: 'aps:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: '高级计划排程数据概览',
    },
    {
      code: 'aps-production-plans',
      label: '生产计划',
      icon: 'ClipboardList',
      path: APS_PATHS.productionPlans,
      permission: 'aps:production_plan:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: '生产计划管理',
    },
    {
      code: 'aps-schedules',
      label: '排程管理',
      icon: 'CalendarClock',
      path: APS_PATHS.schedules,
      permission: 'aps:schedule:read',
      order: 2,
      group: 'business',
      showInTabs: true,
      description: '生产排程管理',
    },
    {
      code: 'aps-capacities',
      label: '产能管理',
      icon: 'Gauge',
      path: APS_PATHS.capacities,
      permission: 'aps:capacity:read',
      order: 3,
      group: 'business',
      showInTabs: true,
      description: '工作中心产能管理',
    },
    {
      code: 'aps-material-plans',
      label: '物料计划',
      icon: 'Package',
      path: APS_PATHS.materialPlans,
      permission: 'aps:material_plan:read',
      order: 4,
      group: 'business',
      showInTabs: true,
      description: '物料需求计划管理',
    },
    {
      code: 'aps-forecasts',
      label: '需求预测',
      icon: 'TrendingUp',
      path: APS_PATHS.forecasts,
      permission: 'aps:forecast:read',
      order: 5,
      group: 'analytics',
      showInTabs: true,
      description: '需求预测管理',
    },
  ],
};
