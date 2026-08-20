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
  title: i18n.t('shared.config.k2'),
  titleKey: 'shared.config.k2',
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
  title: i18n.t('shared.config.k3'),
  titleKey: 'shared.config.k3',
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
  title: i18n.t('shared.config.k4'),
  titleKey: 'shared.config.k4',
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
  title: i18n.t('shared.config.k5'),
  titleKey: 'shared.config.k5',
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
  title: i18n.t('shared.config.k6'),
  titleKey: 'shared.config.k6',
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
  title: i18n.t('shared.config.k7'),
  titleKey: 'shared.config.k7',
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
  title: i18n.t('shared.config.k8'),
  titleKey: 'shared.config.k8',
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
  title: i18n.t('shared.config.k9'),
  titleKey: 'shared.config.k9',
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
  title: i18n.t('shared.config.k10'),
  titleKey: 'shared.config.k10',
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
  title: i18n.t('shared.config.k11'),
  titleKey: 'shared.config.k11',
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
  title: i18n.t('shared.config.k12'),
  titleKey: 'shared.config.k12',
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
  title: i18n.t('shared.config.k13'),
  titleKey: 'shared.config.k13',
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
  title: i18n.t('shared.config.k14'),
  titleKey: 'shared.config.k14',
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
  title: i18n.t('shared.config.k15'),
  titleKey: 'shared.config.k15',
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
  title: i18n.t('shared.config.k16'),
  titleKey: 'shared.config.k16',
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
  title: i18n.t('shared.config.bug_0'),
  titleKey: 'shared.config.bug_0',
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
  title: i18n.t('shared.config.k17'),
  titleKey: 'shared.config.k17',
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
  title: i18n.t('shared.config.k18'),
  titleKey: 'shared.config.k18',
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
  title: i18n.t('shared.config.k19'),
  titleKey: 'shared.config.k19',
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
  title: i18n.t('shared.config.k20'),
  titleKey: 'shared.config.k20',
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
  title: i18n.t('shared.config.k21'),
  titleKey: 'shared.config.k21',
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
  title: i18n.t('shared.config.k22'),
  titleKey: 'shared.config.k22',
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
  title: i18n.t('shared.config.k23'),
  titleKey: 'shared.config.k23',
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
  description: i18n.t('shared.config.k1'),
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
  name: i18n.t('shared.config.k24'),
  nameKey: 'shared.config.k24',
  icon: 'FlaskConical',
  path: RD_PATHS.root,
  permission: 'rd:dashboard:read',
  source: 'plugin',
  suite: 'project',
  status: 'online',
  order: 18,
  description: i18n.t('shared.config.k25'),
  navItems: [
    {
      code: 'rd-dashboard',
      label: i18n.t('shared.config.k26'),
      labelKey: 'shared.config.k26',
      icon: 'LayoutDashboard',
      path: RD_PATHS.dashboard,
      permission: 'rd:dashboard:read',
      order: 1,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.k27'),
    },
    {
      code: 'rd-overview',
      label: i18n.t('shared.config.k28'),
      labelKey: 'shared.config.k28',
      icon: 'Grid3X3',
      path: RD_PATHS.overview,
      permission: 'rd:overview:read',
      order: 2,
      group: 'overview',
      description: i18n.t('shared.config.k29'),
    },
    {
      code: 'rd-project',
      label: i18n.t('shared.config.k30'),
      labelKey: 'shared.config.k30',
      icon: 'FolderKanban',
      path: RD_PATHS.project,
      permission: 'rd:project:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('shared.config.k31'),
    },
    {
      code: 'rd-experiment',
      label: i18n.t('shared.config.k32'),
      labelKey: 'shared.config.k32',
      icon: 'FlaskRound',
      path: RD_PATHS.experiment,
      permission: 'rd:experiment:read',
      order: 4,
      group: 'business',
      showInTabs: true,
      description: i18n.t('shared.config.k33'),
    },
    {
      code: 'rd-formula',
      label: i18n.t('shared.config.k34'),
      labelKey: 'shared.config.k34',
      icon: 'Beaker',
      path: RD_PATHS.formula,
      permission: 'rd:formula:read',
      order: 7,
      group: 'master',
      showInTabs: true,
      description: i18n.t('shared.config.k35'),
    },
    {
      code: 'rd-material',
      label: i18n.t('shared.config.k36'),
      labelKey: 'shared.config.k36',
      icon: 'Layers',
      path: RD_PATHS.material,
      permission: 'rd:material:read',
      order: 10,
      group: 'master',
      showInTabs: true,
      description: i18n.t('shared.config.k37'),
    },
    {
      code: 'rd-code',
      label: i18n.t('shared.config.k38'),
      labelKey: 'shared.config.k38',
      icon: 'Code2',
      path: RD_PATHS.code,
      permission: 'rd:code:read',
      order: 11,
      group: 'business',
      showInTabs: true,
      description: i18n.t('shared.config.k39'),
    },
    {
      code: 'rd-build',
      label: i18n.t('shared.config.k40'),
      labelKey: 'shared.config.k40',
      icon: 'Hammer',
      path: RD_PATHS.build,
      permission: 'rd:build:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.cicd_1'),
    },
    {
      code: 'rd-test',
      label: i18n.t('shared.config.k41'),
      labelKey: 'shared.config.k41',
      icon: 'Bug',
      path: RD_PATHS.test,
      permission: 'rd:test:read',
      order: 2,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k42'),
    },
    {
      code: 'rd-bug',
      label: i18n.t('shared.config.bug_2'),
      labelKey: 'shared.config.bug_2',
      icon: 'AlertTriangle',
      path: RD_PATHS.bug,
      permission: 'rd:bug:read',
      order: 3,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k43'),
    },
    {
      code: 'rd-review',
      label: i18n.t('shared.config.k44'),
      labelKey: 'shared.config.k44',
      icon: 'GitBranch',
      path: RD_PATHS.review,
      permission: 'rd:review:read',
      order: 4,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k45'),
    },
    {
      code: 'rd-deploy',
      label: i18n.t('shared.config.k46'),
      labelKey: 'shared.config.k46',
      icon: 'CloudUpload',
      path: RD_PATHS.deploy,
      permission: 'rd:deploy:read',
      order: 5,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k47'),
    },
    {
      code: 'rd-release',
      label: i18n.t('shared.config.k48'),
      labelKey: 'shared.config.k48',
      icon: 'Rocket',
      path: RD_PATHS.release,
      permission: 'rd:release:read',
      order: 6,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k49'),
    },
    {
      code: 'rd-milestone',
      label: i18n.t('shared.config.k50'),
      labelKey: 'shared.config.k50',
      icon: 'Flag',
      path: RD_PATHS.milestone,
      permission: 'rd:milestone:read',
      order: 7,
      group: 'process',
      description: i18n.t('shared.config.k51'),
    },
    {
      code: 'rd-doc',
      label: i18n.t('shared.config.k52'),
      labelKey: 'shared.config.k52',
      icon: 'FileText',
      path: RD_PATHS.doc,
      permission: 'rd:doc:read',
      order: 12,
      group: 'business',
      showInTabs: true,
      description: i18n.t('shared.config.k53'),
    },
    {
      code: 'rd-report',
      label: i18n.t('shared.config.k54'),
      labelKey: 'shared.config.k54',
      icon: 'BarChart3',
      path: RD_PATHS.report,
      permission: 'rd:report:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('shared.config.k55'),
    },
    {
      code: 'rd-settings',
      label: i18n.t('shared.config.k56'),
      labelKey: 'shared.config.k56',
      icon: 'Settings',
      path: RD_PATHS.settings,
      permission: 'rd:settings:read',
      order: 1,
      group: 'setting',
      description: i18n.t('shared.config.k57'),
    },
  ],
};
