import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 PLUGIN_PATHS.xxx，而非硬编码字符串
export const PLUGIN_PATHS = {
  root: '/plugin',
  marketplace: '/plugin/marketplace',
  upload: '/plugin/upload',
  detail: '/plugin/:id',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const pluginModuleConfig: RouteModuleConfig = {
  code: 'plugin',
  name: '插件市场',
  icon: 'Puzzle',
  path: PLUGIN_PATHS.root,
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  order: 21,
  description: '插件管理、插件市场、插件详情',
  permission: 'plugin:read',
  routes: [
    {
      path: PLUGIN_PATHS.marketplace,
      element: lazyWithRetry(
        () => import('@/pages/plugin/PluginMarketplacePage'),
        'PluginMarketplacePage'
      ),
      module: 'plugin',
      title: '插件市场',
      code: 'plugin-marketplace',
      requiredPermissions: ['plugin:marketplace:read', 'plugin:read'],
      action: 'read',
      template: 'list',
      group: 'setting',
    },
    {
      path: PLUGIN_PATHS.upload,
      element: lazyWithRetry(() => import('@/pages/plugin/PluginUploadPage'), 'PluginUploadPage'),
      module: 'plugin',
      title: '上传插件',
      code: 'plugin-upload',
      requiredPermissions: ['plugin:upload:write', 'plugin:write'],
      action: 'write',
      template: 'form',
      group: 'setting',
    },
    {
      path: PLUGIN_PATHS.detail,
      element: lazyWithRetry(() => import('@/pages/plugin/PluginDetailPage'), 'PluginDetailPage'),
      module: 'plugin',
      title: '插件详情',
      code: 'plugin-detail',
      requiredPermissions: ['plugin:detail:read', 'plugin:read'],
      action: 'read',
      template: 'detail',
      group: 'business',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const pluginNavConfig: ModuleNavConfig = {
  code: 'plugin',
  name: '插件市场',
  icon: 'Puzzle',
  path: PLUGIN_PATHS.root,
  permission: 'plugin:read',
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  order: 21,
  description: '插件管理、插件市场、插件详情',
  navItems: [
    {
      code: 'plugin-marketplace',
      label: '插件市场',
      icon: 'ShoppingCart',
      path: PLUGIN_PATHS.marketplace,
      permission: 'plugin:marketplace:read',
      order: 1,
      group: 'setting',
      showInTabs: true,
      description: '插件应用市场',
    },
    {
      code: 'plugin-upload',
      label: '上传插件',
      icon: 'Upload',
      path: PLUGIN_PATHS.upload,
      permission: 'plugin:upload:write',
      order: 2,
      group: 'setting',
      showInTabs: true,
      description: '上传自定义插件',
    },
  ],
};
