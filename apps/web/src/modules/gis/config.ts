import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 GIS_PATHS.xxx，而非硬编码字符串
export const GIS_PATHS = {
  root: '/gis',
  dashboard: '/gis/dashboard',
  map: '/gis/map',
  tracking: '/gis/tracking',
  fence: '/gis/fence',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const gisModuleConfig: RouteModuleConfig = {
  code: 'gis',
  name: '地理信息',
  icon: 'Map',
  path: GIS_PATHS.root,
  source: 'plugin',
  suite: 'gis',
  status: 'online',
  order: 12,
  description: '地图展示、轨迹追踪、地理围栏、空间分析',
  permission: 'gis:read',
  routes: [
    {
      path: GIS_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/gis/DashboardPage'), 'DashboardPage'),
      module: 'gis',
      title: 'GIS仪表盘',
      code: 'gis-dashboard',
      requiredPermissions: ['gis:read'],
      action: 'read',
      template: 'dashboard',
      group: 'overview',
    },
    {
      path: GIS_PATHS.map,
      element: lazyWithRetry(() => import('@/pages/gis/index'), 'GisMapPage'),
      module: 'gis',
      title: '地图展示',
      code: 'gis-map',
      requiredPermissions: ['gis:map:read'],
      action: 'read',
      template: 'dashboard',
      group: 'business',
    },
    {
      path: GIS_PATHS.tracking,
      element: lazyWithRetry(() => import('@/pages/gis/GisTrackingPage'), 'GisTrackingPage'),
      module: 'gis',
      title: '轨迹追踪',
      code: 'gis-tracking',
      requiredPermissions: ['gis:tracking:read'],
      action: 'read',
      template: 'stats',
      group: 'business',
    },
    {
      path: GIS_PATHS.fence,
      element: lazyWithRetry(() => import('@/pages/gis/GisFencePage'), 'GisFencePage'),
      module: 'gis',
      title: '地理围栏',
      code: 'gis-fence',
      requiredPermissions: ['gis:fence:read'],
      action: 'read',
      template: 'list',
      group: 'business',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const gisNavConfig: ModuleNavConfig = {
  code: 'gis',
  name: '地理信息',
  icon: 'Map',
  path: GIS_PATHS.root,
  permission: 'gis:read',
  source: 'plugin',
  suite: 'gis',
  status: 'online',
  order: 12,
  description: '地图展示、轨迹追踪、地理围栏、空间分析',
  navItems: [
    {
      code: 'gis-dashboard',
      label: '仪表盘',
      icon: 'LayoutDashboard',
      path: GIS_PATHS.dashboard,
      permission: 'gis:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: 'GIS数据概览',
    },
    {
      code: 'gis-map',
      label: '地图展示',
      icon: 'MapPin',
      path: GIS_PATHS.map,
      permission: 'gis:map:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: '地图可视化',
    },
    {
      code: 'gis-tracking',
      label: '轨迹追踪',
      icon: 'Navigation',
      path: GIS_PATHS.tracking,
      permission: 'gis:tracking:read',
      order: 2,
      group: 'business',
      showInTabs: true,
      description: '车辆/人员轨迹追踪',
    },
    {
      code: 'gis-fence',
      label: '地理围栏',
      icon: 'MapPin',
      path: GIS_PATHS.fence,
      permission: 'gis:fence:read',
      order: 3,
      group: 'business',
      description: '地理围栏管理',
    },
  ],
};
