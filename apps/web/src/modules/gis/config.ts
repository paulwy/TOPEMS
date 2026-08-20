import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 GIS_PATHS.xxx，而非硬编码字符串

export const GIS_PATHS = {
  root: '/gis',
  dashboard: '/gis/dashboard',
  map: '/gis/map',
  tracking: '/gis/tracking',
  fence: '/gis/fence',
} as const;
export interface DashboardPageProps {}

interface GisMapPageProps {}

interface GisTrackingPageProps {}

interface GisFencePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

const dashboardRoute: RouteConfigV2<DashboardPageProps> = {
  path: GIS_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/gis/DashboardPage'), 'DashboardPage'),
  module: 'gis',
  title: i18n.t('shared.config.gis_0'),
  titleKey: 'shared.config.gis_0',
  code: 'gis-dashboard',
  requiredPermissions: ['gis:dashboard:read'],
  action: 'read',
  template: 'dashboard',
  group: 'overview',
};

const gisMapRoute: RouteConfigV2<GisMapPageProps> = {
  path: GIS_PATHS.map,
  element: lazyWithRetry(() => import('@/pages/gis/index'), 'GisMapPage'),
  module: 'gis',
  title: i18n.t('shared.config.k2'),
  titleKey: 'shared.config.k2',
  code: 'gis-map',
  requiredPermissions: ['gis:map:read', 'gis:dashboard:read'],
  action: 'read',
  template: 'dashboard',
  group: 'process',
};

const gisTrackingRoute: RouteConfigV2<GisTrackingPageProps> = {
  path: GIS_PATHS.tracking,
  element: lazyWithRetry(() => import('@/pages/gis/GisTrackingPage'), 'GisTrackingPage'),
  module: 'gis',
  title: i18n.t('shared.config.k3'),
  titleKey: 'shared.config.k3',
  code: 'gis-tracking',
  requiredPermissions: ['gis:tracking:read', 'gis:dashboard:read'],
  action: 'read',
  template: 'stats',
  group: 'process',
};

const gisFenceRoute: RouteConfigV2<GisFencePageProps> = {
  path: GIS_PATHS.fence,
  element: lazyWithRetry(() => import('@/pages/gis/GisFencePage'), 'GisFencePage'),
  module: 'gis',
  title: i18n.t('shared.config.k4'),
  titleKey: 'shared.config.k4',
  code: 'gis-fence',
  requiredPermissions: ['gis:fence:read', 'gis:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'process',
};

// ---- 路由配置（供路由系统使用） ----
export const gisModuleConfig: RouteModuleConfig = {
  code: 'gis',
  name: i18n.t('shared.config.gis_name'),
  nameKey: 'shared.config.gis_name',
  icon: 'Map',
  path: GIS_PATHS.root,
  source: 'plugin',
  suite: 'platform',
  status: 'online',
  order: 12,
  description: i18n.t('shared.config.k1'),
  permission: 'gis:dashboard:read',
  routes: [dashboardRoute, gisMapRoute, gisTrackingRoute, gisFenceRoute],
};

// ---- 导航配置（供导航注册表使用） ----
export const gisNavConfig: ModuleNavConfig = {
  code: 'gis',
  name: i18n.t('shared.config.k5'),
  nameKey: 'shared.config.k5',
  icon: 'Map',
  path: GIS_PATHS.root,
  permission: 'gis:dashboard:read',
  source: 'plugin',
  suite: 'platform',
  status: 'online',
  order: 12,
  description: i18n.t('shared.config.k6'),
  navItems: [
    {
      code: 'gis-dashboard',
      label: i18n.t('shared.config.k7'),
      labelKey: 'shared.config.k7',
      icon: 'LayoutDashboard',
      path: GIS_PATHS.dashboard,
      permission: 'gis:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.gis_1'),
    },
    {
      code: 'gis-map',
      label: i18n.t('shared.config.k8'),
      labelKey: 'shared.config.k8',
      icon: 'MapPin',
      path: GIS_PATHS.map,
      permission: 'gis:map:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k9'),
    },
    {
      code: 'gis-tracking',
      label: i18n.t('shared.config.k10'),
      labelKey: 'shared.config.k10',
      icon: 'Navigation',
      path: GIS_PATHS.tracking,
      permission: 'gis:tracking:read',
      order: 2,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k11'),
    },
    {
      code: 'gis-fence',
      label: i18n.t('shared.config.k12'),
      labelKey: 'shared.config.k12',
      icon: 'MapPin',
      path: GIS_PATHS.fence,
      permission: 'gis:fence:read',
      order: 3,
      group: 'process',
      description: i18n.t('shared.config.k13'),
    },
  ],
};
