import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 BI_PATHS.xxx，而非硬编码字符串

export const BI_PATHS = {
  root: '/bi',
  dashboard: '/bi/dashboard',
  analytics: '/bi/analytics',
  comparison: '/bi/comparison',
  dataSource: '/bi/data-source',
  dataset: '/bi/dataset',
  report: '/bi/report',
  visualization: '/bi/visualization',
  reportBuilder: '/bi/report-builder',
  permission: '/bi/permission',
  index: '/bi/index',
  moduleDetail: '/bi/module-detail',
  module: '/bi/module/:moduleId',
  dataAnalysis: '/bi/data-analysis',
  gis: '/bi/gis',
} as const;
interface BIDashboardPageProps {}

interface BIAnalyticsPageProps {}

interface BIComparisonPageProps {}

interface BIDataSourcePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface DatasetPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface BIReportPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface BIVisualizationPageProps {}

interface ReportBuilderPageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

interface BiPermissionPageProps {}

interface BiIndexPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface BIModuleDetailPageProps {
  id?: string;
  entityType?: string;
}

interface DataAnalysisPageProps {}

interface GisPageProps {}

const bIDashboardRoute: RouteConfigV2<BIDashboardPageProps> = {
  path: BI_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/bi/BIDashboardPage'), 'BIDashboardPage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-dashboard'),
  titleKey: 'bi.nav.bi-dashboard',
  code: 'bi-dashboard',
  requiredPermissions: ['bi:dashboard:read'],
  action: 'read',
  template: 'dashboard',
  group: 'overview',
};

const bIAnalyticsRoute: RouteConfigV2<BIAnalyticsPageProps> = {
  path: BI_PATHS.analytics,
  element: lazyWithRetry(() => import('@/pages/bi/BIAnalyticsPage'), 'BIAnalyticsPage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-analytics'),
  titleKey: 'bi.nav.bi-analytics',
  code: 'bi-analytics',
  requiredPermissions: ['bi:analytics:read', 'bi:dashboard:read'],
  action: 'read',
  template: 'stats',
  group: 'analytics',
};

const bIComparisonRoute: RouteConfigV2<BIComparisonPageProps> = {
  path: BI_PATHS.comparison,
  element: lazyWithRetry(() => import('@/pages/bi/BIComparisonPage'), 'BIComparisonPage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-comparison'),
  titleKey: 'bi.nav.bi-comparison',
  code: 'bi-comparison',
  requiredPermissions: ['bi:comparison:read', 'bi:dashboard:read'],
  action: 'read',
  template: 'stats',
  group: 'analytics',
};

const bIDataSourceRoute: RouteConfigV2<BIDataSourcePageProps> = {
  path: BI_PATHS.dataSource,
  element: lazyWithRetry(() => import('@/pages/bi/BIDataSourcePage'), 'BIDataSourcePage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-data-source'),
  titleKey: 'bi.nav.bi-data-source',
  code: 'bi-data-source',
  requiredPermissions: ['bi:data_source:read', 'bi:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'setting',
};

const datasetRoute: RouteConfigV2<DatasetPageProps> = {
  path: BI_PATHS.dataset,
  element: lazyWithRetry(() => import('@/pages/bi/DatasetPage'), 'DatasetPage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-dataset'),
  titleKey: 'bi.nav.bi-dataset',
  code: 'bi-dataset',
  requiredPermissions: ['bi:dataset:read', 'bi:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'setting',
};

const bIReportRoute: RouteConfigV2<BIReportPageProps> = {
  path: BI_PATHS.report,
  element: lazyWithRetry(() => import('@/pages/bi/BIReportPage'), 'BIReportPage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-report'),
  titleKey: 'bi.nav.bi-report',
  code: 'bi-report',
  requiredPermissions: ['bi:report:read', 'bi:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'analytics',
};

const bIVisualizationRoute: RouteConfigV2<BIVisualizationPageProps> = {
  path: BI_PATHS.visualization,
  element: lazyWithRetry(() => import('@/pages/bi/BIVisualizationPage'), 'BIVisualizationPage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-visualization'),
  titleKey: 'bi.nav.bi-visualization',
  code: 'bi-visualization',
  requiredPermissions: ['bi:visualization:read', 'bi:dashboard:read'],
  action: 'read',
  template: 'stats',
  group: 'analytics',
};

const reportBuilderRoute: RouteConfigV2<ReportBuilderPageProps> = {
  path: BI_PATHS.reportBuilder,
  element: lazyWithRetry(() => import('@/pages/bi/ReportBuilderPage'), 'ReportBuilderPage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-report-builder'),
  titleKey: 'bi.nav.bi-report-builder',
  code: 'bi-report-builder',
  requiredPermissions: ['bi:report:write', 'bi:dashboard:write'],
  action: 'write',
  template: 'form',
  group: 'analytics',
};

const biPermissionRoute: RouteConfigV2<BiPermissionPageProps> = {
  path: BI_PATHS.permission,
  element: lazyWithRetry(() => import('@/pages/bi/BiPermissionPage'), 'BiPermissionPage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-permission'),
  titleKey: 'bi.nav.bi-permission',
  code: 'bi-permission',
  requiredPermissions: ['bi:dashboard:admin'],
  action: 'admin',
  template: 'settings',
  group: 'setting',
};

const biIndexRoute: RouteConfigV2<BiIndexPageProps> = {
  path: BI_PATHS.index,
  element: lazyWithRetry(() => import('@/pages/bi/BiIndexPage'), 'BiIndexPage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-index'),
  titleKey: 'bi.nav.bi-index',
  code: 'bi-index',
  requiredPermissions: ['bi:index:read', 'bi:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'setting',
};

const bIModuleDetailRoute: RouteConfigV2<BIModuleDetailPageProps> = {
  path: BI_PATHS.moduleDetail,
  element: lazyWithRetry(() => import('@/pages/bi/BIModuleDetailPage'), 'BIModuleDetailPage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-module-detail'),
  titleKey: 'bi.nav.bi-module-detail',
  code: 'bi-module-detail',
  requiredPermissions: ['bi:dashboard:read'],
  action: 'read',
  template: 'detail',
  group: 'analytics',
};

const dataAnalysisRoute: RouteConfigV2<DataAnalysisPageProps> = {
  path: BI_PATHS.dataAnalysis,
  element: lazyWithRetry(() => import('@/pages/bi/DataAnalysisPage'), 'DataAnalysisPage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-data-analysis'),
  titleKey: 'bi.nav.bi-data-analysis',
  code: 'bi-data-analysis',
  requiredPermissions: ['bi:analytics:read', 'bi:dashboard:read'],
  action: 'read',
  template: 'stats',
  group: 'analytics',
};

const gisRoute: RouteConfigV2<GisPageProps> = {
  path: BI_PATHS.gis,
  element: lazyWithRetry(() => import('@/pages/bi/GisPage'), 'GisPage'),
  module: 'bi',
  title: i18n.t('bi.nav.bi-gis'),
  titleKey: 'bi.nav.bi-gis',
  code: 'bi-gis',
  requiredPermissions: ['bi:gis:read', 'bi:dashboard:read'],
  action: 'read',
  template: 'stats',
  group: 'analytics',
};

// ---- 路由配置（供路由系统使用） ----
export const biModuleConfig: RouteModuleConfig = {
  code: 'bi',
  name: i18n.t('shared.config.bi_name'),
  nameKey: 'shared.config.bi_name',
  icon: 'BarChart3',
  path: BI_PATHS.root,
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  frontendOnly: true,
  order: 9,
  description: i18n.t('bi.nav.module_name_desc'),
  permission: 'bi:dashboard:read',
  routes: [
    bIDashboardRoute,
    bIAnalyticsRoute,
    bIComparisonRoute,
    bIDataSourceRoute,
    datasetRoute,
    bIReportRoute,
    bIVisualizationRoute,
    reportBuilderRoute,
    biPermissionRoute,
    biIndexRoute,
    bIModuleDetailRoute,
    dataAnalysisRoute,
    gisRoute,
  ],
};
