import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 RD_PATHS.xxx，而非硬编码字符串

export const RD_PATHS = {
  root: '/rd',
  dashboard: '/rd/dashboard',
  overview: '/rd/overview',
  project: '/rd/project',
  projectCreate: '/rd/project/create',
  experiment: '/rd/experiment',
  experimentCreate: '/rd/experiment/create',
  formula: '/rd/formula',
  formulaCreate: '/rd/formula/create',
  material: '/rd/material',
  code: '/rd/code',
  build: '/rd/build',
  test: '/rd/test',
  bug: '/rd/bug',
  review: '/rd/review',
  deploy: '/rd/deploy',
  release: '/rd/release',
  milestone: '/rd/milestone',
  doc: '/rd/doc',
  report: '/rd/report',
  settings: '/rd/settings',
} as const;
export interface DashboardPageProps {}

interface RsOverviewPageProps {}

interface RsProjectListPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsProjectCreatePageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

interface RsProjectDetailPageProps {
  id?: string;
  entityType?: string;
}

interface RsExperimentListPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsExperimentCreatePageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

interface RsExperimentDetailPageProps {
  id?: string;
  entityType?: string;
}

interface RsFormulaListPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsFormulaCreatePageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

interface RsFormulaDetailPageProps {
  id?: string;
  entityType?: string;
}

interface RsMaterialListPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsCodePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsBuildPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsTestPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsBugPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsReviewPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsDeployPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsReleasePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsMilestonePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsDocPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RsReportPageProps {}

interface RsSettingsPageProps {}

const dashboardRoute: RouteConfigV2<DashboardPageProps> = {
  path: RD_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/rd/DashboardPage'), 'DashboardPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-dashboard'),
  titleKey: 'rd.nav.rd-dashboard',
  code: 'rd-dashboard',
  requiredPermissions: ['rd:dashboard:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'dashboard',
  group: 'overview',
};

const rsOverviewRoute: RouteConfigV2<RsOverviewPageProps> = {
  path: RD_PATHS.overview,
  element: lazyWithRetry(() => import('@/pages/rd/RsOverviewPage'), 'RsOverviewPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-overview'),
  titleKey: 'rd.nav.rd-overview',
  code: 'rd-overview',
  requiredPermissions: ['rd:overview:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'dashboard',
  group: 'overview',
};

const rsProjectListRoute: RouteConfigV2<RsProjectListPageProps> = {
  path: RD_PATHS.project,
  element: lazyWithRetry(() => import('@/pages/rd/RsProjectListPage'), 'RsProjectListPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-project'),
  titleKey: 'rd.nav.rd-project',
  code: 'rd-project',
  requiredPermissions: ['rd:project:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'business',
};

const rsProjectCreateRoute: RouteConfigV2<RsProjectCreatePageProps> = {
  path: RD_PATHS.projectCreate,
  element: lazyWithRetry(() => import('@/pages/rd/RsProjectCreatePage'), 'RsProjectCreatePage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-project-create'),
  titleKey: 'rd.nav.rd-project-create',
  code: 'rd-project-create',
  requiredPermissions: ['rd:project:write', 'rd:dashboard:write'],
  action: 'write',
  template: 'form',
  group: 'business',
};

const rsProjectDetailRoute: RouteConfigV2<RsProjectDetailPageProps> = {
  path: `${RD_PATHS.project}/:id`,
  element: lazyWithRetry(() => import('@/pages/rd/RsProjectDetailPage'), 'RsProjectDetailPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-project-detail'),
  titleKey: 'rd.nav.rd-project-detail',
  code: 'rd-project-detail',
  requiredPermissions: ['rd:project:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'detail',
  group: 'business',
};

const rsExperimentListRoute: RouteConfigV2<RsExperimentListPageProps> = {
  path: RD_PATHS.experiment,
  element: lazyWithRetry(() => import('@/pages/rd/RsExperimentListPage'), 'RsExperimentListPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-experiment'),
  titleKey: 'rd.nav.rd-experiment',
  code: 'rd-experiment',
  requiredPermissions: ['rd:experiment:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'business',
};

const rsExperimentCreateRoute: RouteConfigV2<RsExperimentCreatePageProps> = {
  path: RD_PATHS.experimentCreate,
  element: lazyWithRetry(
    () => import('@/pages/rd/RsExperimentCreatePage'),
    'RsExperimentCreatePage'
  ),
  module: 'rd',
  title: i18n.t('rd.nav.rd-experiment-create'),
  titleKey: 'rd.nav.rd-experiment-create',
  code: 'rd-experiment-create',
  requiredPermissions: ['rd:experiment:write', 'rd:dashboard:write'],
  action: 'write',
  template: 'form',
  group: 'business',
};

const rsExperimentDetailRoute: RouteConfigV2<RsExperimentDetailPageProps> = {
  path: `${RD_PATHS.experiment}/:id`,
  element: lazyWithRetry(
    () => import('@/pages/rd/RsExperimentDetailPage'),
    'RsExperimentDetailPage'
  ),
  module: 'rd',
  title: i18n.t('rd.nav.rd-experiment-detail'),
  titleKey: 'rd.nav.rd-experiment-detail',
  code: 'rd-experiment-detail',
  requiredPermissions: ['rd:experiment:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'detail',
  group: 'business',
};

const rsFormulaListRoute: RouteConfigV2<RsFormulaListPageProps> = {
  path: RD_PATHS.formula,
  element: lazyWithRetry(() => import('@/pages/rd/RsFormulaListPage'), 'RsFormulaListPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-formula'),
  titleKey: 'rd.nav.rd-formula',
  code: 'rd-formula',
  requiredPermissions: ['rd:formula:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const rsFormulaCreateRoute: RouteConfigV2<RsFormulaCreatePageProps> = {
  path: RD_PATHS.formulaCreate,
  element: lazyWithRetry(() => import('@/pages/rd/RsFormulaCreatePage'), 'RsFormulaCreatePage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-formula-create'),
  titleKey: 'rd.nav.rd-formula-create',
  code: 'rd-formula-create',
  requiredPermissions: ['rd:formula:write', 'rd:dashboard:write'],
  action: 'write',
  template: 'form',
  group: 'business',
};

const rsFormulaDetailRoute: RouteConfigV2<RsFormulaDetailPageProps> = {
  path: `${RD_PATHS.formula}/:id`,
  element: lazyWithRetry(() => import('@/pages/rd/RsFormulaDetailPage'), 'RsFormulaDetailPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-formula-detail'),
  titleKey: 'rd.nav.rd-formula-detail',
  code: 'rd-formula-detail',
  requiredPermissions: ['rd:formula:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'detail',
  group: 'business',
};

const rsMaterialListRoute: RouteConfigV2<RsMaterialListPageProps> = {
  path: RD_PATHS.material,
  element: lazyWithRetry(() => import('@/pages/rd/RsMaterialListPage'), 'RsMaterialListPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-material'),
  titleKey: 'rd.nav.rd-material',
  code: 'rd-material',
  requiredPermissions: ['rd:material:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const rsCodeRoute: RouteConfigV2<RsCodePageProps> = {
  path: RD_PATHS.code,
  element: lazyWithRetry(() => import('@/pages/rd/RsCodePage'), 'RsCodePage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-code'),
  titleKey: 'rd.nav.rd-code',
  code: 'rd-code',
  requiredPermissions: ['rd:code:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'business',
};

const rsBuildRoute: RouteConfigV2<RsBuildPageProps> = {
  path: RD_PATHS.build,
  element: lazyWithRetry(() => import('@/pages/rd/RsBuildPage'), 'RsBuildPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-build'),
  titleKey: 'rd.nav.rd-build',
  code: 'rd-build',
  requiredPermissions: ['rd:build:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'process',
};

const rsTestRoute: RouteConfigV2<RsTestPageProps> = {
  path: RD_PATHS.test,
  element: lazyWithRetry(() => import('@/pages/rd/RsTestPage'), 'RsTestPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-test'),
  titleKey: 'rd.nav.rd-test',
  code: 'rd-test',
  requiredPermissions: ['rd:test:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'process',
};

const rsBugRoute: RouteConfigV2<RsBugPageProps> = {
  path: RD_PATHS.bug,
  element: lazyWithRetry(() => import('@/pages/rd/RsBugPage'), 'RsBugPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-bug'),
  titleKey: 'rd.nav.rd-bug',
  code: 'rd-bug',
  requiredPermissions: ['rd:bug:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'process',
};

const rsReviewRoute: RouteConfigV2<RsReviewPageProps> = {
  path: RD_PATHS.review,
  element: lazyWithRetry(() => import('@/pages/rd/RsReviewPage'), 'RsReviewPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-review'),
  titleKey: 'rd.nav.rd-review',
  code: 'rd-review',
  requiredPermissions: ['rd:review:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'process',
};

const rsDeployRoute: RouteConfigV2<RsDeployPageProps> = {
  path: RD_PATHS.deploy,
  element: lazyWithRetry(() => import('@/pages/rd/RsDeployPage'), 'RsDeployPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-deploy'),
  titleKey: 'rd.nav.rd-deploy',
  code: 'rd-deploy',
  requiredPermissions: ['rd:deploy:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'process',
};

const rsReleaseRoute: RouteConfigV2<RsReleasePageProps> = {
  path: RD_PATHS.release,
  element: lazyWithRetry(() => import('@/pages/rd/RsReleasePage'), 'RsReleasePage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-release'),
  titleKey: 'rd.nav.rd-release',
  code: 'rd-release',
  requiredPermissions: ['rd:release:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'process',
};

const rsMilestoneRoute: RouteConfigV2<RsMilestonePageProps> = {
  path: RD_PATHS.milestone,
  element: lazyWithRetry(() => import('@/pages/rd/RsMilestonePage'), 'RsMilestonePage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-milestone'),
  titleKey: 'rd.nav.rd-milestone',
  code: 'rd-milestone',
  requiredPermissions: ['rd:milestone:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'process',
};

const rsDocRoute: RouteConfigV2<RsDocPageProps> = {
  path: RD_PATHS.doc,
  element: lazyWithRetry(() => import('@/pages/rd/RsDocPage'), 'RsDocPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-doc'),
  titleKey: 'rd.nav.rd-doc',
  code: 'rd-doc',
  requiredPermissions: ['rd:doc:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'business',
};

const rsReportRoute: RouteConfigV2<RsReportPageProps> = {
  path: RD_PATHS.report,
  element: lazyWithRetry(() => import('@/pages/rd/RsReportPage'), 'RsReportPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-report'),
  titleKey: 'rd.nav.rd-report',
  code: 'rd-report',
  requiredPermissions: ['rd:report:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'stats',
  group: 'analytics',
};

const rsSettingsRoute: RouteConfigV2<RsSettingsPageProps> = {
  path: RD_PATHS.settings,
  element: lazyWithRetry(() => import('@/pages/rd/RsSettingsPage'), 'RsSettingsPage'),
  module: 'rd',
  title: i18n.t('rd.nav.rd-settings'),
  titleKey: 'rd.nav.rd-settings',
  code: 'rd-settings',
  requiredPermissions: ['rd:settings:read', 'rd:dashboard:read'],
  action: 'read',
  template: 'settings',
  group: 'setting',
};

// ---- 路由配置（供路由系统使用） ----
export const rdModuleConfig: RouteModuleConfig = {
  code: 'rd',
  name: i18n.t('shared.config.rd_name'),
  nameKey: 'shared.config.rd_name',
  icon: 'FlaskConical',
  path: RD_PATHS.root,
  source: 'plugin',
  suite: 'project',
  status: 'online',
  order: 18,
  description: i18n.t('rd.nav.module_name_desc'),
  permission: 'rd:dashboard:read',
  routes: [
    dashboardRoute,
    rsOverviewRoute,
    rsProjectListRoute,
    rsProjectCreateRoute,
    rsProjectDetailRoute,
    rsExperimentListRoute,
    rsExperimentCreateRoute,
    rsExperimentDetailRoute,
    rsFormulaListRoute,
    rsFormulaCreateRoute,
    rsFormulaDetailRoute,
    rsMaterialListRoute,
    rsCodeRoute,
    rsBuildRoute,
    rsTestRoute,
    rsBugRoute,
    rsReviewRoute,
    rsDeployRoute,
    rsReleaseRoute,
    rsMilestoneRoute,
    rsDocRoute,
    rsReportRoute,
    rsSettingsRoute,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const rdNavConfig: ModuleNavConfig = {
  code: 'rd',
  name: i18n.t('rd.nav.module_name'),
  nameKey: 'rd.nav.module_name',
  icon: 'FlaskConical',
  path: RD_PATHS.root,
  permission: 'rd:dashboard:read',
  source: 'plugin',
  suite: 'project',
  status: 'online',
  order: 18,
  description: i18n.t('rd.nav.module_name_desc'),
  navItems: [
    {
      code: 'rd-dashboard',
      label: i18n.t('rd.nav.rd-dashboard'),
      labelKey: 'rd.nav.rd-dashboard',
      icon: 'LayoutDashboard',
      path: RD_PATHS.dashboard,
      permission: 'rd:dashboard:read',
      order: 1,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-dashboard_desc'),
    },
    {
      code: 'rd-overview',
      label: i18n.t('rd.nav.rd-overview'),
      labelKey: 'rd.nav.rd-overview',
      icon: 'Grid3X3',
      path: RD_PATHS.overview,
      permission: 'rd:overview:read',
      order: 2,
      group: 'overview',
      description: i18n.t('rd.nav.rd-overview_desc'),
    },
    {
      code: 'rd-project',
      label: i18n.t('rd.nav.rd-project'),
      labelKey: 'rd.nav.rd-project',
      icon: 'FolderKanban',
      path: RD_PATHS.project,
      permission: 'rd:project:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-project_desc'),
    },
    {
      code: 'rd-experiment',
      label: i18n.t('rd.nav.rd-experiment'),
      labelKey: 'rd.nav.rd-experiment',
      icon: 'FlaskRound',
      path: RD_PATHS.experiment,
      permission: 'rd:experiment:read',
      order: 4,
      group: 'business',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-experiment_desc'),
    },
    {
      code: 'rd-formula',
      label: i18n.t('rd.nav.rd-formula'),
      labelKey: 'rd.nav.rd-formula',
      icon: 'Beaker',
      path: RD_PATHS.formula,
      permission: 'rd:formula:read',
      order: 7,
      group: 'master',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-formula_desc'),
    },
    {
      code: 'rd-material',
      label: i18n.t('rd.nav.rd-material'),
      labelKey: 'rd.nav.rd-material',
      icon: 'Layers',
      path: RD_PATHS.material,
      permission: 'rd:material:read',
      order: 10,
      group: 'master',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-material_desc'),
    },
    {
      code: 'rd-code',
      label: i18n.t('rd.nav.rd-code'),
      labelKey: 'rd.nav.rd-code',
      icon: 'Code2',
      path: RD_PATHS.code,
      permission: 'rd:code:read',
      order: 11,
      group: 'business',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-code_desc'),
    },
    {
      code: 'rd-build',
      label: i18n.t('rd.nav.rd-build'),
      labelKey: 'rd.nav.rd-build',
      icon: 'Hammer',
      path: RD_PATHS.build,
      permission: 'rd:build:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-build_desc'),
    },
    {
      code: 'rd-test',
      label: i18n.t('rd.nav.rd-test'),
      labelKey: 'rd.nav.rd-test',
      icon: 'Bug',
      path: RD_PATHS.test,
      permission: 'rd:test:read',
      order: 2,
      group: 'process',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-test_desc'),
    },
    {
      code: 'rd-bug',
      label: i18n.t('rd.nav.rd-bug'),
      labelKey: 'rd.nav.rd-bug',
      icon: 'AlertTriangle',
      path: RD_PATHS.bug,
      permission: 'rd:bug:read',
      order: 3,
      group: 'process',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-bug_desc'),
    },
    {
      code: 'rd-review',
      label: i18n.t('rd.nav.rd-review'),
      labelKey: 'rd.nav.rd-review',
      icon: 'GitBranch',
      path: RD_PATHS.review,
      permission: 'rd:review:read',
      order: 4,
      group: 'process',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-review_desc'),
    },
    {
      code: 'rd-deploy',
      label: i18n.t('rd.nav.rd-deploy'),
      labelKey: 'rd.nav.rd-deploy',
      icon: 'CloudUpload',
      path: RD_PATHS.deploy,
      permission: 'rd:deploy:read',
      order: 5,
      group: 'process',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-deploy_desc'),
    },
    {
      code: 'rd-release',
      label: i18n.t('rd.nav.rd-release'),
      labelKey: 'rd.nav.rd-release',
      icon: 'Rocket',
      path: RD_PATHS.release,
      permission: 'rd:release:read',
      order: 6,
      group: 'process',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-release_desc'),
    },
    {
      code: 'rd-milestone',
      label: i18n.t('rd.nav.rd-milestone'),
      labelKey: 'rd.nav.rd-milestone',
      icon: 'Flag',
      path: RD_PATHS.milestone,
      permission: 'rd:milestone:read',
      order: 7,
      group: 'process',
      description: i18n.t('rd.nav.rd-milestone_desc'),
    },
    {
      code: 'rd-doc',
      label: i18n.t('rd.nav.rd-doc'),
      labelKey: 'rd.nav.rd-doc',
      icon: 'FileText',
      path: RD_PATHS.doc,
      permission: 'rd:doc:read',
      order: 12,
      group: 'business',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-doc_desc'),
    },
    {
      code: 'rd-report',
      label: i18n.t('rd.nav.rd-report'),
      labelKey: 'rd.nav.rd-report',
      icon: 'BarChart3',
      path: RD_PATHS.report,
      permission: 'rd:report:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('rd.nav.rd-report_desc'),
    },
    {
      code: 'rd-settings',
      label: i18n.t('rd.nav.rd-settings'),
      labelKey: 'rd.nav.rd-settings',
      icon: 'Settings',
      path: RD_PATHS.settings,
      permission: 'rd:settings:read',
      order: 1,
      group: 'setting',
      description: i18n.t('rd.nav.rd-settings_desc'),
    },
  ],
};
