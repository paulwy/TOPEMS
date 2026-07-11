import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 IM_PATHS.xxx，而非硬编码字符串
export const IM_PATHS = {
  root: '/im',
  mail: '/im/mail',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const imModuleConfig: RouteModuleConfig = {
  code: 'im',
  name: '即时通讯',
  icon: 'MessageSquare',
  path: IM_PATHS.root,
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  frontendOnly: true,
  order: 22,
  description: '邮件管理、即时通讯',
  permission: 'im:read',
  routes: [
    {
      path: IM_PATHS.mail,
      element: lazyWithRetry(() => import('@/pages/im/MailPage'), 'MailPage'),
      module: 'im',
      title: '邮件管理',
      code: 'im-mail',
      requiredPermissions: ['im:mail:read'],
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
  permission: 'im:read',
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  order: 22,
  description: '邮件管理、即时通讯',
  navItems: [
    {
      code: 'im-mail',
      label: '邮件管理',
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
