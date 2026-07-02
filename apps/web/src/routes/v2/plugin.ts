import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

export const pluginModuleConfig: RouteModuleConfig = {
  code: 'plugin',
  name: '插件市场',
  icon: 'Puzzle',
  path: '/plugin',
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  order: 21,
  description: '插件管理、插件市场、插件详情',
  permission: 'plugin:read',
  routes: [
    {
      path: '/plugin/marketplace',
      element: lazyWithRetry(
        () => import('../../pages/plugin/PluginMarketplacePage'),
        'PluginMarketplacePage'
      ),
      module: 'plugin',
      title: '插件市场',
      code: 'plugin-marketplace',
      requiredPermissions: ['plugin:marketplace:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/plugin/upload',
      element: lazyWithRetry(
        () => import('../../pages/plugin/PluginUploadPage'),
        'PluginUploadPage'
      ),
      module: 'plugin',
      title: '上传插件',
      code: 'plugin-upload',
      requiredPermissions: ['plugin:upload:write'],
      template: 'form',
      group: 'business',
    },
    {
      path: '/plugin/:id',
      element: lazyWithRetry(
        () => import('../../pages/plugin/PluginDetailPage'),
        'PluginDetailPage'
      ),
      module: 'plugin',
      title: '插件详情',
      code: 'plugin-detail',
      requiredPermissions: ['plugin:detail:read'],
      template: 'detail',
      group: 'business',
    },
  ],
};
