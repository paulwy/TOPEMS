import type { ModuleNavConfig } from '../types';

export const imNavConfig: ModuleNavConfig = {
  code: 'im',
  name: '即时通讯',
  icon: 'MessageSquare',
  path: '/im',
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
      path: '/im/mail',
      permission: 'im:mail:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: '邮件收发管理',
    },
  ],
};
