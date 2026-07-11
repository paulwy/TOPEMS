import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

// ---- 第一部分：路径常量（唯一真相源） ----
export const NOTIFICATION_PATHS = {
  root: '/notification',
  dashboard: '/notification/dashboard',
  list: '/notification/list',
  archive: '/notification/archive',
  detail: '/notification/:id',
  center: '/notification/center',
  templates: '/notification/templates',
  statistics: '/notification/statistics',
  settings: '/notification/settings',
} as const;

// ---- 第二部分：路由配置 ----
export const notificationModuleConfig: RouteModuleConfig = {
  code: 'notification',
  name: '通知中心',
  icon: 'Bell',
  path: NOTIFICATION_PATHS.root,
  source: 'core',
  status: 'online',
  order: 3,
  description: '消息通知、模板管理、发送统计',
  permission: 'notification:read',
  routes: [
    {
      path: NOTIFICATION_PATHS.dashboard,
      element: lazyWithRetry(
        () => import('@/pages/notification/NotificationDashboardPage'),
        'NotificationDashboardPage'
      ),
      module: 'notification',
      code: 'notification-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['notification:read'],
      action: 'read',
    },
    {
      path: NOTIFICATION_PATHS.list,
      element: lazyWithRetry(
        () => import('@/pages/notification/NotificationListPage'),
        'NotificationListPage'
      ),
      module: 'notification',
      code: 'notification-list',
      title: '通知列表',
      template: 'list',
      group: 'messages',
      requiredPermissions: ['notification:read'],
      action: 'read',
    },
    {
      path: NOTIFICATION_PATHS.archive,
      element: lazyWithRetry(
        () => import('@/pages/notification/NotificationArchivePage'),
        'NotificationArchivePage'
      ),
      module: 'notification',
      code: 'notification-archive',
      title: '通知归档',
      template: 'list',
      group: 'messages',
      requiredPermissions: ['notification:read'],
      action: 'read',
    },
    {
      path: NOTIFICATION_PATHS.detail,
      element: lazyWithRetry(
        () => import('@/pages/notification/NotificationDetailPage'),
        'NotificationDetailPage'
      ),
      module: 'notification',
      code: 'notification-detail',
      title: '通知详情',
      template: 'detail',
      group: 'messages',
      requiredPermissions: ['notification:read'],
      action: 'read',
    },
    {
      path: NOTIFICATION_PATHS.center,
      element: lazyWithRetry(
        () => import('@/pages/notification/NotificationCenter'),
        'NotificationCenter'
      ),
      module: 'notification',
      code: 'notification-center',
      title: '通知中心',
      template: 'list',
      group: 'messages',
      requiredPermissions: ['notification:read'],
      action: 'read',
    },
    {
      path: NOTIFICATION_PATHS.templates,
      element: lazyWithRetry(
        () => import('@/pages/notification/NotificationTemplatesPage'),
        'NotificationTemplatesPage'
      ),
      module: 'notification',
      code: 'notification-templates',
      title: '模板管理',
      template: 'list',
      group: 'templates',
      requiredPermissions: ['notification:read'],
      action: 'read',
    },
    {
      path: NOTIFICATION_PATHS.statistics,
      element: lazyWithRetry(
        () => import('@/pages/notification/NotificationStatsPage'),
        'NotificationStatsPage'
      ),
      module: 'notification',
      code: 'notification-statistics',
      title: '发送统计',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['notification:read'],
      action: 'read',
    },
    {
      path: NOTIFICATION_PATHS.settings,
      element: lazyWithRetry(
        () => import('@/pages/notification/NotificationSettingsPage'),
        'NotificationSettingsPage'
      ),
      module: 'notification',
      code: 'notification-settings',
      title: '通知设置',
      template: 'settings',
      group: 'settings',
      requiredPermissions: ['notification:read'],
      action: 'read',
    },
  ],
};

// ---- 第三部分：导航配置 ----
export const notificationNavConfig: ModuleNavConfig = {
  code: 'notification',
  name: '通知中心',
  icon: 'Bell',
  path: NOTIFICATION_PATHS.root,
  permission: 'notification:read',
  source: 'core',
  status: 'online',
  order: 3,
  description: '消息通知、模板管理、发送统计',
  navItems: [
    {
      code: 'notification-dashboard',
      label: '仪表盘',
      icon: 'LayoutDashboard',
      path: NOTIFICATION_PATHS.dashboard,
      permission: 'notification:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: '通知数据概览',
    },
    {
      code: 'notification-list',
      label: '通知列表',
      icon: 'ScrollText',
      path: NOTIFICATION_PATHS.list,
      permission: 'notification:read',
      order: 1,
      group: 'messages',
      showInTabs: true,
      description: '通知消息列表',
    },
    {
      code: 'notification-archive',
      label: '通知归档',
      icon: 'Archive',
      path: NOTIFICATION_PATHS.archive,
      permission: 'notification:read',
      order: 2,
      group: 'messages',
      description: '归档通知管理',
    },
    {
      code: 'notification-center',
      label: '通知中心',
      icon: 'Bell',
      path: NOTIFICATION_PATHS.center,
      permission: 'notification:read',
      order: 3,
      group: 'messages',
      description: '通知中心',
    },
    {
      code: 'notification-templates',
      label: '模板管理',
      icon: 'FileText',
      path: NOTIFICATION_PATHS.templates,
      permission: 'notification:read',
      order: 1,
      group: 'templates',
      description: '通知模板管理',
    },
    {
      code: 'notification-statistics',
      label: '发送统计',
      icon: 'BarChart3',
      path: NOTIFICATION_PATHS.statistics,
      permission: 'notification:read',
      order: 1,
      group: 'analytics',
      description: '通知发送统计',
    },
    {
      code: 'notification-settings',
      label: '通知设置',
      icon: 'Settings',
      path: NOTIFICATION_PATHS.settings,
      permission: 'notification:read',
      order: 1,
      group: 'settings',
      description: '通知系统设置',
    },
  ],
};
