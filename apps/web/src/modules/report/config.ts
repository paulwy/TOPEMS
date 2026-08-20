import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

export interface ReportDashboardPageProps {}
export interface ReportListPageProps {}
export interface ReportViewerPageRouteProps {
  reportId?: string;
  templateId?: string;
  parameters?: Record<string, unknown>;
}
export interface ReportDesignPageProps {}
export interface ReportBuilderPageProps {}
export interface ReportSchedulePageProps {}
export interface ReportSubscriptionPageProps {}
export interface TemplateManagementPageProps {}

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 REPORT_PATHS.xxx，而非硬编码字符串
export const REPORT_PATHS = {
  root: '/report',
  dashboard: '/report/dashboard',
  list: '/report/list',
  viewer: '/report/viewer',
  design: '/report/design',
  builder: '/report/builder',
  schedule: '/report/schedule',
  subscription: '/report/subscription',
  template: '/report/template',
  report: '/report/report',
} as const;

// ---- 路由配置（供路由系统使用） ----
const reportDashboardRoute: RouteConfigV2<ReportDashboardPageProps> = {
  path: REPORT_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/report/ReportPage'), 'ReportPage'),
  module: 'report',
  title: i18n.t('shared.config.k2'),
  titleKey: 'shared.config.k2',
  code: 'report-dashboard',
  requiredPermissions: ['report:dashboard:read'],
  action: 'read',
  template: 'dashboard',
  group: 'overview',
};

const reportListRoute: RouteConfigV2<ReportListPageProps> = {
  path: REPORT_PATHS.list,
  element: lazyWithRetry(() => import('@/pages/report/ReportListPage'), 'ReportListPage'),
  module: 'report',
  title: i18n.t('shared.config.k3'),
  titleKey: 'shared.config.k3',
  code: 'report-list',
  requiredPermissions: ['report:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'report',
};

const reportViewerRoute = {
  path: REPORT_PATHS.viewer,
  element: lazyWithRetry(() => import('@/pages/report/ReportViewer'), 'ReportViewer'),
  module: 'report',
  title: i18n.t('shared.config.k4'),
  titleKey: 'shared.config.k4',
  code: 'report-viewer',
  requiredPermissions: ['report:dashboard:read'],
  action: 'read',
  template: 'detail',
  group: 'business',
} as RouteConfigV2<ReportViewerPageRouteProps>;

const reportRoutes: RouteConfigV2[] = [
  reportDashboardRoute,
  reportListRoute,
  reportViewerRoute,
  {
    path: REPORT_PATHS.design,
    element: lazyWithRetry(() => import('@/pages/report/ReportDesignPage'), 'ReportDesignPage'),
    module: 'report',
    title: i18n.t('shared.config.k5'),
    titleKey: 'shared.config.k5',
    code: 'report-design',
    requiredPermissions: ['report:design:write', 'report:dashboard:write'],
    action: 'write',
    template: 'form',
    group: 'report',
  } as RouteConfigV2<ReportDesignPageProps>,
  {
    path: REPORT_PATHS.builder,
    element: lazyWithRetry(() => import('@/pages/report/ReportBuilderPage'), 'ReportBuilderPage'),
    module: 'report',
    title: i18n.t('shared.config.k6'),
    titleKey: 'shared.config.k6',
    code: 'report-builder',
    requiredPermissions: ['report:builder:write', 'report:dashboard:write'],
    action: 'write',
    template: 'form',
    group: 'report',
  } as RouteConfigV2<ReportBuilderPageProps>,
  {
    path: REPORT_PATHS.schedule,
    element: lazyWithRetry(() => import('@/pages/report/ReportSchedulePage'), 'ReportSchedulePage'),
    module: 'report',
    title: i18n.t('shared.config.k7'),
    titleKey: 'shared.config.k7',
    code: 'report-schedule',
    requiredPermissions: ['report:schedule:read', 'report:dashboard:read'],
    action: 'read',
    template: 'list',
    group: 'process',
  } as RouteConfigV2<ReportSchedulePageProps>,
  {
    path: REPORT_PATHS.subscription,
    element: lazyWithRetry(
      () => import('@/pages/report/ReportSubscriptionPage'),
      'ReportSubscriptionPage'
    ),
    module: 'report',
    title: i18n.t('shared.config.k8'),
    titleKey: 'shared.config.k8',
    code: 'report-subscription',
    requiredPermissions: ['report:subscription:read', 'report:dashboard:read'],
    action: 'read',
    template: 'list',
    group: 'process',
  } as RouteConfigV2<ReportSubscriptionPageProps>,
  {
    path: REPORT_PATHS.template,
    element: lazyWithRetry(
      () => import('@/pages/report/TemplateManagementPage'),
      'TemplateManagementPage'
    ),
    module: 'report',
    title: i18n.t('shared.config.k9'),
    titleKey: 'shared.config.k9',
    code: 'report-template',
    requiredPermissions: ['report:template:read', 'report:dashboard:read'],
    action: 'read',
    template: 'list',
    group: 'setting',
  } as RouteConfigV2<TemplateManagementPageProps>,
  {
    path: REPORT_PATHS.report,
    element: lazyWithRetry(() => import('@/pages/report/ReportPage'), 'ReportPage'),
    module: 'report',
    title: i18n.t('shared.config.k10'),
    titleKey: 'shared.config.k10',
    code: 'report-report',
    requiredPermissions: ['report:dashboard:read'],
    action: 'read',
    template: 'list',
    group: 'report',
  },
];

export const reportModuleConfig: RouteModuleConfig = {
  code: 'report',
  name: i18n.t('shared.config.report_name'),
  nameKey: 'shared.config.report_name',
  icon: 'FileSpreadsheet',
  path: REPORT_PATHS.root,
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 6,
  description: i18n.t('shared.config.k1'),
  permission: 'report:dashboard:read',
  routes: reportRoutes,
};

// ---- 导航配置（供导航注册表使用） ----
export const reportNavConfig: ModuleNavConfig = {
  code: 'report',
  name: i18n.t('shared.config.k11'),
  nameKey: 'shared.config.k11',
  icon: 'FileSpreadsheet',
  path: REPORT_PATHS.root,
  permission: 'report:dashboard:read',
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 6,
  description: i18n.t('shared.config.k12'),
  navItems: [
    {
      code: 'report-dashboard',
      label: i18n.t('shared.config.k13'),
      labelKey: 'shared.config.k13',
      icon: 'LayoutDashboard',
      path: REPORT_PATHS.dashboard,
      permission: 'report:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.k14'),
    },
    {
      code: 'report-list',
      label: i18n.t('shared.config.k15'),
      labelKey: 'shared.config.k15',
      icon: 'List',
      path: REPORT_PATHS.list,
      permission: 'report:dashboard:read',
      order: 1,
      group: 'report',
      showInTabs: true,
      description: i18n.t('shared.config.k16'),
    },
    {
      code: 'report-design',
      label: i18n.t('shared.config.k17'),
      labelKey: 'shared.config.k17',
      icon: 'Wand2',
      path: REPORT_PATHS.design,
      permission: 'report:design:write',
      order: 2,
      group: 'report',
      description: i18n.t('shared.config.k18'),
    },
    {
      code: 'report-builder',
      label: i18n.t('shared.config.k19'),
      labelKey: 'shared.config.k19',
      icon: 'Blocks',
      path: REPORT_PATHS.builder,
      permission: 'report:builder:write',
      order: 3,
      group: 'report',
      description: i18n.t('shared.config.k20'),
    },
    {
      code: 'report-schedule',
      label: i18n.t('shared.config.k21'),
      labelKey: 'shared.config.k21',
      icon: 'Clock',
      path: REPORT_PATHS.schedule,
      permission: 'report:schedule:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k22'),
    },
    {
      code: 'report-subscription',
      label: i18n.t('shared.config.k23'),
      labelKey: 'shared.config.k23',
      icon: 'Bell',
      path: REPORT_PATHS.subscription,
      permission: 'report:subscription:read',
      order: 2,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k24'),
    },
    {
      code: 'report-template',
      label: i18n.t('shared.config.k25'),
      labelKey: 'shared.config.k25',
      icon: 'FolderKanban',
      path: REPORT_PATHS.template,
      permission: 'report:template:read',
      order: 1,
      group: 'setting',
      description: i18n.t('shared.config.k26'),
    },
    {
      code: 'report-report',
      label: i18n.t('shared.config.k27'),
      labelKey: 'shared.config.k27',
      icon: 'FileSpreadsheet',
      path: REPORT_PATHS.report,
      permission: 'report:dashboard:read',
      order: 4,
      group: 'report',
      description: i18n.t('shared.config.k28'),
    },
    {
      code: 'report-viewer',
      label: i18n.t('shared.config.rpt_r4_1'),
      labelKey: 'shared.config.rpt_r4_1',
      icon: 'Eye',
      path: REPORT_PATHS.viewer,
      permission: 'report:dashboard:read',
      order: 5,
      group: 'report',
      description: i18n.t('shared.config.rpt_r4_2'),
    },
  ],
};
