import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 IM_PATHS.xxx，而非硬编码字符串

export const IM_PATHS = {
  root: '/im',
  dashboard: '/im/dashboard',
  mail: '/im/mail',
} as const;
export interface DashboardPageProps {}

interface MailPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

const dashboardRoute: RouteConfigV2<DashboardPageProps> = {
  path: IM_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/im/DashboardPage'), 'DashboardPage'),
  module: 'im',
  title: i18n.t('im.nav.im-dashboard'),
  titleKey: 'im.nav.im-dashboard',
  code: 'im-dashboard',
  requiredPermissions: ['im:dashboard:read'],
  action: 'read',
  template: 'dashboard',
  group: 'overview',
};

const mailRoute: RouteConfigV2<MailPageProps> = {
  path: IM_PATHS.mail,
  element: lazyWithRetry(() => import('@/pages/im/MailPage'), 'MailPage'),
  module: 'im',
  title: i18n.t('im.nav.im-mail'),
  titleKey: 'im.nav.im-mail',
  code: 'im-mail',
  requiredPermissions: ['im:mail:read', 'im:mail:read'],
  action: 'read',
  template: 'list',
  group: 'business',
};

// ---- 路由配置（供路由系统使用） ----
export const imModuleConfig: RouteModuleConfig = {
  code: 'im',
  name: i18n.t('shared.config.im_name'),
  nameKey: 'shared.config.im_name',
  icon: 'MessageSquare',
  path: IM_PATHS.root,
  source: 'plugin',
  suite: 'collaboration',
  status: 'online',
  frontendOnly: true,
  order: 22,
  description: i18n.t('im.nav.module_name_desc'),
  permission: 'im:mail:read',
  routes: [dashboardRoute, mailRoute],
};
