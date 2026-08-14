import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
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

// ---- 路由配置（供路由系统使用） ----
export const pluginModuleConfig: RouteModuleConfig = {
  code: 'plugin',
  name: i18n.t('shared.config.k0'),
  icon: 'Puzzle',
  path: PLUGIN_PATHS.root,
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  order: 21,
  description: i18n.t('shared.config.k1'),
  permission: 'plugin:marketplace:read',
  routes: [
    {
      path: PLUGIN_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/plugin/DashboardPage'), 'DashboardPage'),
      module: 'plugin',
      title: i18n.t('shared.config.k2'),
      code: 'plugin-dashboard',
      requiredPermissions: ['plugin:dashboard:read'],
      action: 'read',
      template: 'dashboard',
      group: 'overview',
    },
    {
      path: PLUGIN_PATHS.marketplace,
      element: lazyWithRetry(
        () => import('@/pages/plugin/PluginMarketplacePage'),
        'PluginMarketplacePage'
      ),
      module: 'plugin',
      title: i18n.t('shared.config.k3'),
      code: 'plugin-marketplace',
      requiredPermissions: ['plugin:marketplace:read', 'plugin:marketplace:read'],
      action: 'read',
      template: 'list',
      group: 'setting',
    },
    {
      path: PLUGIN_PATHS.upload,
      element: lazyWithRetry(() => import('@/pages/plugin/PluginUploadPage'), 'PluginUploadPage'),
      module: 'plugin',
      title: i18n.t('shared.config.k4'),
      code: 'plugin-upload',
      requiredPermissions: ['plugin:upload:write', 'plugin:upload:write'],
      action: 'write',
      template: 'form',
      group: 'setting',
    },
    {
      path: PLUGIN_PATHS.detail,
      element: lazyWithRetry(() => import('@/pages/plugin/PluginDetailPage'), 'PluginDetailPage'),
      module: 'plugin',
      title: i18n.t('shared.config.k5'),
      code: 'plugin-detail',
      requiredPermissions: ['plugin:detail:read', 'plugin:detail:read'],
      action: 'read',
      template: 'detail',
      group: 'business',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const pluginNavConfig: ModuleNavConfig = {
  code: 'plugin',
  name: i18n.t('shared.config.k6'),
  icon: 'Puzzle',
  path: PLUGIN_PATHS.root,
  permission: 'plugin:marketplace:read',
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  order: 21,
  description: i18n.t('shared.config.k7'),
  navItems: [
    {
      code: 'plugin-dashboard',
      label: i18n.t('shared.config.k8'),
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
      icon: 'ShoppingCart',
      path: PLUGIN_PATHS.marketplace,
      permission: 'plugin:marketplace:read',
      order: 1,
      group: 'setting',
      showInTabs: true,
      description: i18n.t('shared.config.k11'),
    },
    {
      code: 'plugin-upload',
      label: i18n.t('shared.config.k12'),
      icon: 'Upload',
      path: PLUGIN_PATHS.upload,
      permission: 'plugin:upload:write',
      order: 2,
      group: 'setting',
      showInTabs: true,
      description: i18n.t('shared.config.k13'),
    },
  ],
};
