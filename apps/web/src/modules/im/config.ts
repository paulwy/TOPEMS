import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 IM_PATHS.xxx，而非硬编码字符串
export const IM_PATHS = {
  root: '/im',
  dashboard: '/im/dashboard',
  mail: '/im/mail',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const imModuleConfig: RouteModuleConfig = {
  code: 'im',
  name: '即时通讯',
  icon: 'MessageSquare',
  path: IM_PATHS.root,
  source: 'plugin',
  suite: 'collaboration',
  status: 'online',
  frontendOnly: true,
  order: 22,
  description: '邮件管理、即时通讯',
  permission: 'im:mail:read',
  routes: [
    {
      path: IM_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/im/DashboardPage'), 'DashboardPage'),
      module: 'im',
      title: '即时通讯概览',
      code: 'im-dashboard',
      requiredPermissions: ['im:dashboard:read'],
      action: 'read',
      template: 'dashboard',
      group: 'overview',
    },
    {
      path: IM_PATHS.mail,
      element: lazyWithRetry(() => import('@/pages/im/MailPage'), 'MailPage'),
      module: 'im',
      title: '邮件列表',
      code: 'im-mail',
      requiredPermissions: ['im:mail:read', 'im:mail:read'],
      action: 'read',
      template: 'list',
      group: 'business',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const imNavConfig: ModuleNavConfig = {
  code: 'im',
  name: '即时通讯',
  icon: 'MessageSquare',
  path: IM_PATHS.root,
  permission: 'im:mail:read',
  source: 'plugin',
  suite: 'collaboration',
  status: 'online',
  order: 22,
  description: '邮件管理、即时通讯',
  navItems: [
    {
      code: 'im-dashboard',
      label: '即时通讯概览',
      icon: 'LayoutDashboard',
      path: IM_PATHS.dashboard,
      permission: 'im:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: '即时通讯数据概览',
    },
    {
      code: 'im-mail',
      label: '邮件列表',
      icon: 'Mail',
      path: IM_PATHS.mail,
      permission: 'im:mail:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: '邮件收发管理',
    },
  ],
};
