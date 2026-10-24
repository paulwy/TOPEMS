import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
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

// ---- 导航配置（供导航注册表使用） ----
export const biNavConfig: ModuleNavConfig = {
  code: 'bi',
  name: i18n.t('bi.nav.module_name'),
  nameKey: 'bi.nav.module_name',
  icon: 'BarChart3',
  path: BI_PATHS.root,
  permission: 'bi:dashboard:read',
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  order: 9,
  description: i18n.t('bi.nav.module_name_desc'),
  navItems: [
    {
      code: 'bi-dashboard',
      label: i18n.t('bi.nav.bi-dashboard'),
      labelKey: 'bi.nav.bi-dashboard',
      icon: 'LayoutDashboard',
      path: BI_PATHS.dashboard,
      permission: 'bi:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('bi.nav.bi-dashboard_desc'),
    },
    {
      code: 'bi-analytics',
      label: i18n.t('bi.nav.bi-analytics'),
      labelKey: 'bi.nav.bi-analytics',
      icon: 'TrendingUp',
      path: BI_PATHS.analytics,
      permission: 'bi:analytics:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('bi.nav.bi-analytics_desc'),
    },
    {
      code: 'bi-comparison',
      label: i18n.t('bi.nav.bi-comparison'),
      labelKey: 'bi.nav.bi-comparison',
      icon: 'GitCompare',
      path: BI_PATHS.comparison,
      permission: 'bi:comparison:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('bi.nav.bi-comparison_desc'),
    },
    {
      code: 'bi-data-source',
      label: i18n.t('bi.nav.bi-data-source'),
      labelKey: 'bi.nav.bi-data-source',
      icon: 'Database',
      path: BI_PATHS.dataSource,
      permission: 'bi:data_source:read',
      order: 1,
      group: 'setting',
      description: i18n.t('bi.nav.bi-data-source_desc'),
    },
    {
      code: 'bi-dataset',
      label: i18n.t('bi.nav.bi-dataset'),
      labelKey: 'bi.nav.bi-dataset',
      icon: 'Table',
      path: BI_PATHS.dataset,
      permission: 'bi:dataset:read',
      order: 2,
      group: 'setting',
      description: i18n.t('bi.nav.bi-dataset_desc'),
    },
    {
      code: 'bi-report',
      label: i18n.t('bi.nav.bi-report'),
      labelKey: 'bi.nav.bi-report',
      icon: 'FileSpreadsheet',
      path: BI_PATHS.report,
      permission: 'bi:report:read',
      order: 3,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('bi.nav.bi-report_desc'),
    },
    {
      code: 'bi-visualization',
      label: i18n.t('bi.nav.bi-visualization'),
      labelKey: 'bi.nav.bi-visualization',
      icon: 'PieChart',
      path: BI_PATHS.visualization,
      permission: 'bi:visualization:read',
      order: 4,
      group: 'analytics',
      description: i18n.t('bi.nav.bi-visualization_desc'),
    },
    {
      code: 'bi-report-builder',
      label: i18n.t('bi.nav.bi-report-builder'),
      labelKey: 'bi.nav.bi-report-builder',
      icon: 'Wand2',
      path: BI_PATHS.reportBuilder,
      permission: 'bi:report:write',
      order: 5,
      group: 'analytics',
      description: i18n.t('bi.nav.bi-report-builder_desc'),
    },
    {
      code: 'bi-permission',
      label: i18n.t('bi.nav.bi-permission'),
      labelKey: 'bi.nav.bi-permission',
      icon: 'Lock',
      path: BI_PATHS.permission,
      permission: 'bi:dashboard:admin',
      order: 3,
      group: 'setting',
      description: i18n.t('bi.nav.bi-permission_desc'),
    },
    {
      code: 'bi-index',
      label: i18n.t('bi.nav.bi-index'),
      labelKey: 'bi.nav.bi-index',
      icon: 'Target',
      path: BI_PATHS.index,
      permission: 'bi:index:read',
      order: 4,
      group: 'setting',
      description: i18n.t('bi.nav.bi-index_desc'),
    },
    {
      code: 'bi-gis',
      label: i18n.t('bi.nav.bi-gis'),
      labelKey: 'bi.nav.bi-gis',
      icon: 'Map',
      path: BI_PATHS.gis,
      permission: 'bi:gis:read',
      order: 6,
      group: 'analytics',
      description: i18n.t('bi.nav.bi-gis_desc'),
    },
    {
      code: 'bi-data-analysis',
      label: i18n.t('bi.nav.bi-data-analysis'),
      labelKey: 'bi.nav.bi-data-analysis',
      icon: 'LineChart',
      path: BI_PATHS.dataAnalysis,
      permission: 'bi:analytics:read',
      order: 7,
      group: 'analytics',
      description: i18n.t('bi.nav.bi-data-analysis_desc'),
    },
  ],
};
