import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 IM_PATHS.xxx，而非硬编码字符串

export const IM_PATHS = {
  root: '/im',
  dashboard: '/im/dashboard',
  mail: '/im/mail',
} as const;
export interface DashboardPageProps {}

export interface MailPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

const dashboardRoute: RouteConfigV2<DashboardPageProps> = {
  path: IM_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/im/DashboardPage'), 'DashboardPage'),
  module: 'im',
  title: i18n.t('shared.config.k2'),
  titleKey: 'shared.config.k2',
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
  title: i18n.t('shared.config.k3'),
  titleKey: 'shared.config.k3',
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
  description: i18n.t('shared.config.k1'),
  permission: 'im:mail:read',
  routes: [dashboardRoute, mailRoute],
};

// ---- 导航配置（供导航注册表使用） ----
export const imNavConfig: ModuleNavConfig = {
  code: 'im',
  name: i18n.t('shared.config.k4'),
  nameKey: 'shared.config.k4',
  icon: 'MessageSquare',
  path: IM_PATHS.root,
  permission: 'im:mail:read',
  source: 'plugin',
  suite: 'collaboration',
  status: 'online',
  order: 22,
  description: i18n.t('shared.config.k5'),
  navItems: [
    {
      code: 'im-dashboard',
      label: i18n.t('shared.config.k6'),
      labelKey: 'shared.config.k6',
      icon: 'LayoutDashboard',
      path: IM_PATHS.dashboard,
      permission: 'im:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.k7'),
    },
    {
      code: 'im-mail',
      label: i18n.t('shared.config.k8'),
      labelKey: 'shared.config.k8',
      icon: 'Mail',
      path: IM_PATHS.mail,
      permission: 'im:mail:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('shared.config.k9'),
    },
  ],
};
