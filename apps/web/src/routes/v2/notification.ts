import { lazyWithRetry } from '../utils';
import type { RouteModuleConfig } from './types';

const NotificationDashboardPage = lazyWithRetry(
  () => import('../../pages/notification/NotificationDashboardPage'),
  'NotificationDashboardPage'
);
const NotificationListPage = lazyWithRetry(
  () => import('../../pages/notification/NotificationListPage'),
  'NotificationListPage'
);
const NotificationArchivePage = lazyWithRetry(
  () => import('../../pages/notification/NotificationArchivePage'),
  'NotificationArchivePage'
);
const NotificationDetailPage = lazyWithRetry(
  () => import('../../pages/notification/NotificationDetailPage'),
  'NotificationDetailPage'
);
const NotificationTemplatesPage = lazyWithRetry(
  () => import('../../pages/notification/NotificationTemplatesPage'),
  'NotificationTemplatesPage'
);
const NotificationStatsPage = lazyWithRetry(
  () => import('../../pages/notification/NotificationStatsPage'),
  'NotificationStatsPage'
);
const NotificationSettingsPage = lazyWithRetry(
  () => import('../../pages/notification/NotificationSettingsPage'),
  'NotificationSettingsPage'
);
const NotificationCenter = lazyWithRetry(
  () => import('../../pages/notification/NotificationCenter'),
  'NotificationCenter'
);

export const notificationModuleConfig: RouteModuleConfig = {
  code: 'notification',
  name: '通知中心',
  icon: 'Bell',
  path: '/notification',
  source: 'core',
  status: 'online',
  order: 3,
  description: '消息通知、模板管理、发送统计',
  permission: 'notification:read',
  routes: [
    {
      path: '/notification/dashboard',
      element: NotificationDashboardPage,
      module: 'notification',
      code: 'notification-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['notification:read'],
      nav: {
        label: '仪表盘',
        icon: 'LayoutDashboard',
        order: 0,
        group: 'overview',
        showInTabs: true,
      },
    },
    {
      path: '/notification/list',
      element: NotificationListPage,
      module: 'notification',
      code: 'notification-list',
      title: '通知列表',
      template: 'list',
      group: 'messages',
      requiredPermissions: ['notification:read'],
      nav: {
        label: '通知列表',
        icon: 'ScrollText',
        order: 1,
        group: 'messages',
        showInTabs: true,
      },
    },
    {
      path: '/notification/archive',
      element: NotificationArchivePage,
      module: 'notification',
      code: 'notification-archive',
      title: '通知归档',
      template: 'list',
      group: 'messages',
      requiredPermissions: ['notification:read'],
      nav: {
        label: '通知归档',
        icon: 'Archive',
        order: 2,
        group: 'messages',
      },
    },
    {
      path: '/notification/:id',
      element: NotificationDetailPage,
      module: 'notification',
      code: 'notification-detail',
      title: '通知详情',
      template: 'detail',
      group: 'messages',
      requiredPermissions: ['notification:read'],
    },
    {
      path: '/notification/center',
      element: NotificationCenter,
      module: 'notification',
      code: 'notification-center',
      title: '通知中心',
      template: 'list',
      group: 'messages',
      requiredPermissions: ['notification:read'],
      nav: {
        label: '通知中心',
        icon: 'Bell',
        order: 3,
        group: 'messages',
      },
    },
    {
      path: '/notification/templates',
      element: NotificationTemplatesPage,
      module: 'notification',
      code: 'notification-templates',
      title: '模板管理',
      template: 'list',
      group: 'templates',
      requiredPermissions: ['notification:read'],
      nav: {
        label: '模板管理',
        icon: 'FileText',
        order: 1,
        group: 'templates',
      },
    },
    {
      path: '/notification/statistics',
      element: NotificationStatsPage,
      module: 'notification',
      code: 'notification-statistics',
      title: '发送统计',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['notification:read'],
      nav: {
        label: '发送统计',
        icon: 'BarChart3',
        order: 1,
        group: 'analytics',
      },
    },
    {
      path: '/notification/settings',
      element: NotificationSettingsPage,
      module: 'notification',
      code: 'notification-settings',
      title: '通知设置',
      template: 'settings',
      group: 'settings',
      requiredPermissions: ['notification:read'],
      nav: {
        label: '通知设置',
        icon: 'Settings',
        order: 1,
        group: 'settings',
      },
    },
  ],
};
