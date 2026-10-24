import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import i18n from '@/i18n';

interface ReportDashboardPageProps {}
interface ReportListPageProps {}
interface ReportViewerPageRouteProps {
  reportId?: string;
  templateId?: string;
  parameters?: Record<string, unknown>;
}
interface ReportDesignPageProps {}
interface ReportBuilderPageProps {}
interface ReportSchedulePageProps {}
interface ReportSubscriptionPageProps {}
interface TemplateManagementPageProps {}

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
  title: i18n.t('report.nav.report-dashboard'),
  titleKey: 'report.nav.report-dashboard',
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
  title: i18n.t('report.nav.report-list'),
  titleKey: 'report.nav.report-list',
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
  title: i18n.t('report.nav.report-viewer'),
  titleKey: 'report.nav.report-viewer',
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
    title: i18n.t('report.nav.report-design'),
    titleKey: 'report.nav.report-design',
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
    title: i18n.t('report.nav.report-builder'),
    titleKey: 'report.nav.report-builder',
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
    title: i18n.t('report.nav.report-schedule'),
    titleKey: 'report.nav.report-schedule',
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
    title: i18n.t('report.nav.report-subscription'),
    titleKey: 'report.nav.report-subscription',
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
    title: i18n.t('report.nav.report-template'),
    titleKey: 'report.nav.report-template',
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
    title: i18n.t('report.nav.report-report'),
    titleKey: 'report.nav.report-report',
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
  description: i18n.t('report.nav.module_name_desc'),
  permission: 'report:dashboard:read',
  routes: reportRoutes,
};
