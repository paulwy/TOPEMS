import type { ModuleNavConfig } from '../types';

export const pluginNavConfig: ModuleNavConfig = {
  code: 'plugin',
  name: '插件市场',
  icon: 'Puzzle',
  path: '/plugin',
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
      path: '/plugin/marketplace',
      permission: 'plugin:marketplace:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: '插件应用市场',
    },
    {
      code: 'plugin-upload',
      label: '上传插件',
      icon: 'Upload',
      path: '/plugin/upload',
      permission: 'plugin:upload:write',
      order: 2,
      group: 'business',
      showInTabs: true,
      description: '上传自定义插件',
    },
  ],
};