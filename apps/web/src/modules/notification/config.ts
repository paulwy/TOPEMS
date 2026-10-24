import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import i18n from '@/i18n';

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
// ---- 第一部分：路径常量（唯一真相源） ----

interface NotificationDashboardPageProps {}

interface NotificationListPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface NotificationArchivePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface NotificationDetailPageProps {
  id?: string;
  entityType?: string;
}

interface NotificationCenterPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface NotificationTemplatesPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface NotificationStatsPageProps {}

interface NotificationSettingsPageProps {}

const notificationDashboardRoute: RouteConfigV2<NotificationDashboardPageProps> = {
  path: NOTIFICATION_PATHS.dashboard,
  element: lazyWithRetry(
    () => import('@/pages/notification/NotificationDashboardPage'),
    'NotificationDashboardPage'
  ),
  module: 'notification',
  code: 'notification-dashboard',
  title: i18n.t('notification.nav.notification-dashboard'),
  titleKey: 'notification.nav.notification-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['notification:dashboard:read'],
  action: 'read',
};

const notificationListRoute: RouteConfigV2<NotificationListPageProps> = {
  path: NOTIFICATION_PATHS.list,
  element: lazyWithRetry(
    () => import('@/pages/notification/NotificationListPage'),
    'NotificationListPage'
  ),
  module: 'notification',
  code: 'notification-list',
  title: i18n.t('notification.nav.notification-list'),
  titleKey: 'notification.nav.notification-list',
  template: 'list',
  group: 'setting',
  requiredPermissions: ['notification:dashboard:read'],
  action: 'read',
};

const notificationArchiveRoute: RouteConfigV2<NotificationArchivePageProps> = {
  path: NOTIFICATION_PATHS.archive,
  element: lazyWithRetry(
    () => import('@/pages/notification/NotificationArchivePage'),
    'NotificationArchivePage'
  ),
  module: 'notification',
  code: 'notification-archive',
  title: i18n.t('notification.nav.notification-archive'),
  titleKey: 'notification.nav.notification-archive',
  template: 'list',
  group: 'setting',
  requiredPermissions: ['notification:dashboard:read'],
  action: 'read',
};

const notificationDetailRoute: RouteConfigV2<NotificationDetailPageProps> = {
  path: NOTIFICATION_PATHS.detail,
  element: lazyWithRetry(
    () => import('@/pages/notification/NotificationDetailPage'),
    'NotificationDetailPage'
  ),
  module: 'notification',
  code: 'notification-detail',
  title: i18n.t('notification.nav.notification-detail'),
  titleKey: 'notification.nav.notification-detail',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['notification:dashboard:read'],
  action: 'read',
};

const notificationCenterRoute: RouteConfigV2<NotificationCenterPageProps> = {
  path: NOTIFICATION_PATHS.center,
  element: lazyWithRetry(
    () => import('@/pages/notification/NotificationCenter'),
    'NotificationCenter'
  ),
  module: 'notification',
  code: 'notification-center',
  title: i18n.t('notification.nav.notification-center'),
  titleKey: 'notification.nav.notification-center',
  template: 'list',
  group: 'setting',
  requiredPermissions: ['notification:dashboard:read'],
  action: 'read',
};

const notificationTemplatesRoute: RouteConfigV2<NotificationTemplatesPageProps> = {
  path: NOTIFICATION_PATHS.templates,
  element: lazyWithRetry(
    () => import('@/pages/notification/NotificationTemplatesPage'),
    'NotificationTemplatesPage'
  ),
  module: 'notification',
  code: 'notification-templates',
  title: i18n.t('notification.nav.notification-templates'),
  titleKey: 'notification.nav.notification-templates',
  template: 'list',
  group: 'setting',
  requiredPermissions: ['notification:dashboard:read'],
  action: 'read',
};

const notificationStatsRoute: RouteConfigV2<NotificationStatsPageProps> = {
  path: NOTIFICATION_PATHS.statistics,
  element: lazyWithRetry(
    () => import('@/pages/notification/NotificationStatsPage'),
    'NotificationStatsPage'
  ),
  module: 'notification',
  code: 'notification-statistics',
  title: i18n.t('notification.nav.notification-statistics'),
  titleKey: 'notification.nav.notification-statistics',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['notification:dashboard:read'],
  action: 'read',
};

const notificationSettingsRoute: RouteConfigV2<NotificationSettingsPageProps> = {
  path: NOTIFICATION_PATHS.settings,
  element: lazyWithRetry(
    () => import('@/pages/notification/NotificationSettingsPage'),
    'NotificationSettingsPage'
  ),
  module: 'notification',
  code: 'notification-settings',
  title: i18n.t('notification.nav.notification-settings'),
  titleKey: 'notification.nav.notification-settings',
  template: 'settings',
  group: 'setting',
  requiredPermissions: ['notification:dashboard:read'],
  action: 'read',
};

// ---- 第二部分：路由配置 ----
export const notificationModuleConfig: RouteModuleConfig = {
  code: 'notification',
  name: i18n.t('shared.config.notification_name'),
  nameKey: 'shared.config.notification_name',
  icon: 'Bell',
  path: NOTIFICATION_PATHS.root,
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 3,
  description: i18n.t('notification.nav.module_name_desc'),
  permission: 'notification:dashboard:read',
  routes: [
    notificationDashboardRoute,
    notificationListRoute,
    notificationArchiveRoute,
    notificationDetailRoute,
    notificationCenterRoute,
    notificationTemplatesRoute,
    notificationStatsRoute,
    notificationSettingsRoute,
  ],
};
