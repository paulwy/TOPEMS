import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

export const imModuleConfig: RouteModuleConfig = {
  code: 'im',
  name: '即时通讯',
  icon: 'MessageSquare',
  path: '/im',
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  order: 22,
  description: '邮件管理、即时通讯',
  permission: 'im:read',
  routes: [
    {
      path: '/im/mail',
      element: lazyWithRetry(() => import('../../pages/im/MailPage'), 'MailPage'),
      module: 'im',
      title: '邮件管理',
      code: 'im-mail',
      requiredPermissions: ['im:mail:read'],
      template: 'list',
      group: 'business',
      nav: {
        label: '邮件管理',
        icon: 'Mail',
        order: 1,
        group: 'business',
        showInSidebar: true,
        showInBreadcrumb: true,
        showInTabs: true,
        description: '邮件收发管理',
      },
    },
  ],
};