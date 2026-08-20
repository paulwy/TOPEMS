import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 PLUGIN_PATHS.xxx，而非硬编码字符串

export const PLUGIN_PATHS = {
  root: '/plugin',
  dashboard: '/plugin/dashboard',
  marketplace: '/plugin/marketplace',
  upload: '/plugin/upload',
  detail: '/plugin/:id',
} as const;
export interface DashboardPageProps {}

export interface PluginMarketplacePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

export interface PluginUploadPageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

export interface PluginDetailPageProps {
  id?: string;
  entityType?: string;
}

const dashboardRoute: RouteConfigV2<DashboardPageProps> = {
  path: PLUGIN_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/plugin/DashboardPage'), 'DashboardPage'),
  module: 'plugin',
  title: i18n.t('shared.config.k2'),
  titleKey: 'shared.config.k2',
  code: 'plugin-dashboard',
  requiredPermissions: ['plugin:dashboard:read'],
  action: 'read',
  template: 'dashboard',
  group: 'overview',
};

const pluginMarketplaceRoute: RouteConfigV2<PluginMarketplacePageProps> = {
  path: PLUGIN_PATHS.marketplace,
  element: lazyWithRetry(
    () => import('@/pages/plugin/PluginMarketplacePage'),
    'PluginMarketplacePage'
  ),
  module: 'plugin',
  title: i18n.t('shared.config.k3'),
  titleKey: 'shared.config.k3',
  code: 'plugin-marketplace',
  // P4-D: 浏览市场无需权限
  requiredPermissions: [],
  action: 'read',
  template: 'list',
  group: 'setting',
};

const pluginUploadRoute: RouteConfigV2<PluginUploadPageProps> = {
  path: PLUGIN_PATHS.upload,
  element: lazyWithRetry(() => import('@/pages/plugin/PluginUploadPage'), 'PluginUploadPage'),
  module: 'plugin',
  title: i18n.t('shared.config.k4'),
  titleKey: 'shared.config.k4',
  code: 'plugin-upload',
  // 写操作保留 admin 权限
  requiredPermissions: ['admin:plugin:write'],
  action: 'write',
  template: 'form',
  group: 'setting',
};

const pluginDetailRoute: RouteConfigV2<PluginDetailPageProps> = {
  path: PLUGIN_PATHS.detail,
  element: lazyWithRetry(() => import('@/pages/plugin/PluginDetailPage'), 'PluginDetailPage'),
  module: 'plugin',
  title: i18n.t('shared.config.k5'),
  titleKey: 'shared.config.k5',
  code: 'plugin-detail',
  requiredPermissions: [],
  action: 'read',
  template: 'detail',
  group: 'business',
};

// ---- 路由配置（供路由系统使用） ----
export const pluginModuleConfig: RouteModuleConfig = {
  code: 'plugin',
  name: i18n.t('shared.config.plugin_name'),
  nameKey: 'shared.config.plugin_name',
  icon: 'Puzzle',
  path: PLUGIN_PATHS.root,
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 21,
  description: i18n.t('shared.config.k1'),
  // P4-D: 权限降级 — 扩展市场对所有已登录用户可见
  // 仅管理操作（上传/发布）仍需 admin 权限
  permission: undefined,
  routes: [dashboardRoute, pluginMarketplaceRoute, pluginUploadRoute, pluginDetailRoute],
};

// ---- 导航配置（供导航注册表使用） ----
export const pluginNavConfig: ModuleNavConfig = {
  code: 'plugin',
  name: i18n.t('shared.config.k6'),
  nameKey: 'shared.config.k6',
  icon: 'Puzzle',
  path: PLUGIN_PATHS.root,
  // P4-D: 扩展市场导航入口对所有已登录用户可见
  permission: undefined,
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 21,
  description: i18n.t('shared.config.k7'),
  navItems: [
    {
      code: 'plugin-dashboard',
      label: i18n.t('shared.config.k8'),
      labelKey: 'shared.config.k8',
      icon: 'LayoutDashboard',
      path: PLUGIN_PATHS.dashboard,
      permission: 'plugin:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.k9'),
    },
    {
      code: 'plugin-marketplace',
      label: i18n.t('shared.config.k10'),
      labelKey: 'shared.config.k10',
      icon: 'ShoppingCart',
      path: PLUGIN_PATHS.marketplace,
      permission: '',
      order: 1,
      group: 'setting',
      showInTabs: true,
      description: i18n.t('shared.config.k11'),
    },
    {
      code: 'plugin-upload',
      label: i18n.t('shared.config.k12'),
      labelKey: 'shared.config.k12',
      icon: 'Upload',
      path: PLUGIN_PATHS.upload,
      // 上传/开发操作保留 admin 权限
      permission: 'admin:plugin:write',
      order: 2,
      group: 'setting',
      showInTabs: true,
      description: i18n.t('shared.config.k13'),
    },
  ],
};
