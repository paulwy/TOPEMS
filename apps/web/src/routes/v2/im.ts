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
    },
  ],
};
