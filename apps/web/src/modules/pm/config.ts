import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

interface PmDashboardPageProps {}
interface PmProjectListPageProps {
  page?: number;
  pageSize?: number;
  status?: string;
}
interface PmProjectDetailPageProps {
  id?: string;
  projectId?: string;
  tab?: string;
}
interface PmProjectCreatePageProps {}
interface TaskBoardProps {
  projectId?: string;
  sprintId?: string;
  filters?: Record<string, unknown>;
}
interface PmContractListPageProps {}
interface PmContractDetailPageProps {
  id?: string;
}
interface PmContractCreatePageProps {}
interface ProjectTimelinePageProps {
  projectId?: string;
}

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 PM_PATHS.xxx，而非硬编码字符串
export const PM_PATHS = {
  root: '/pm',
  dashboard: '/pm/dashboard',
  projects: '/pm/projects',
  projectCreate: '/pm/projects/create',
  projectDetail: '/pm/projects/:id',
  contracts: '/pm/contracts',
  contractCreate: '/pm/contracts/create',
  contractDetail: '/pm/contracts/:id',
  resources: '/pm/resources',
  templates: '/pm/templates',
  reports: '/pm/reports',
  taskKanban: '/pm/task-kanban',
  projectWizard: '/pm/project-wizard',
  timeline: '/pm/timeline',
  projectList: '/pm/project-list',
} as const;

// ---- 路由配置（供路由系统使用） ----
// P34-4: PM 默认所有路由为 basic 层级；advanced 模块（project_approval/service_integration/...）
// 在前端未提供独立页面，故不在此配置。
const pmDashboardRoute: RouteConfigV2<PmDashboardPageProps> = {
  path: PM_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/pm/DashboardPage'), 'DashboardPage'),
  module: 'pm',
  code: 'pm-dashboard',
  title: i18n.t('shared.config.k2'),
  titleKey: 'shared.config.k2',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['pm:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const pmProjectListRoute: RouteConfigV2<PmProjectListPageProps> = {
  path: PM_PATHS.projects,
  element: lazyWithRetry(() => import('@/pages/pm/PmProjectListPage'), 'PmProjectListPage'),
  module: 'pm',
  code: 'pm-projects',
  title: i18n.t('shared.config.k3'),
  titleKey: 'shared.config.k3',
  template: 'list',
  group: 'business',
  requiredPermissions: ['pm:project:read', 'pm:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const pmProjectDetailRoute: RouteConfigV2<PmProjectDetailPageProps> = {
  path: PM_PATHS.projectDetail,
  element: lazyWithRetry(() => import('@/pages/pm/PmProjectDetailPage'), 'PmProjectDetailPage'),
  module: 'pm',
  code: 'pm-project-detail',
  title: i18n.t('shared.config.k5'),
  titleKey: 'shared.config.k5',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['pm:project:read', 'pm:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const taskKanbanRoute: RouteConfigV2<TaskBoardProps> = {
  path: PM_PATHS.taskKanban,
  element: lazyWithRetry(() => import('@/pages/pm/ProjectTaskKanbanPage'), 'ProjectTaskKanbanPage'),
  module: 'pm',
  code: 'pm-task-kanban',
  title: i18n.t('shared.config.k12'),
  titleKey: 'shared.config.k12',
  template: 'kanban',
  group: 'business',
  requiredPermissions: ['pm:task:read', 'pm:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const pmContractListRoute: RouteConfigV2<PmContractListPageProps> = {
  path: PM_PATHS.contracts,
  element: lazyWithRetry(() => import('@/pages/pm/PmContractListPage'), 'PmContractListPage'),
  module: 'pm',
  code: 'pm-contracts',
  title: i18n.t('shared.config.k6'),
  titleKey: 'shared.config.k6',
  template: 'list',
  group: 'business',
  requiredPermissions: ['pm:contract:read', 'pm:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const pmContractDetailRoute: RouteConfigV2<PmContractDetailPageProps> = {
  path: PM_PATHS.contractDetail,
  element: lazyWithRetry(() => import('@/pages/pm/PmContractDetailPage'), 'PmContractDetailPage'),
  module: 'pm',
  code: 'pm-contract-detail',
  title: i18n.t('shared.config.k8'),
  titleKey: 'shared.config.k8',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['pm:contract:read', 'pm:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const projectTimelineRoute: RouteConfigV2<ProjectTimelinePageProps> = {
  path: PM_PATHS.timeline,
  element: lazyWithRetry(() => import('@/pages/pm/ProjectTimelinePage'), 'ProjectTimelinePage'),
  module: 'pm',
  code: 'pm-timeline',
  title: i18n.t('shared.config.k14'),
  titleKey: 'shared.config.k14',
  template: 'timeline',
  group: 'analytics',
  requiredPermissions: ['pm:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const pmRoutes: RouteConfigV2[] = [
  pmDashboardRoute,
  pmProjectListRoute,
  {
    path: PM_PATHS.projectCreate,
    element: lazyWithRetry(() => import('@/pages/pm/PmProjectCreatePage'), 'PmProjectCreatePage'),
    module: 'pm',
    code: 'pm-project-create',
    title: i18n.t('shared.config.k4'),
    titleKey: 'shared.config.k4',
    template: 'form',
    group: 'business',
    requiredPermissions: ['pm:project:create', 'pm:dashboard:write'],
    action: 'write',
    tier: 'basic',
  } as RouteConfigV2<PmProjectCreatePageProps>,
  pmProjectDetailRoute,
  pmContractListRoute,
  {
    path: PM_PATHS.contractCreate,
    element: lazyWithRetry(() => import('@/pages/pm/PmContractCreatePage'), 'PmContractCreatePage'),
    module: 'pm',
    code: 'pm-contract-create',
    title: i18n.t('shared.config.k7'),
    titleKey: 'shared.config.k7',
    template: 'form',
    group: 'business',
    requiredPermissions: ['pm:contract:create', 'pm:dashboard:write'],
    action: 'write',
    tier: 'basic',
  } as RouteConfigV2<PmContractCreatePageProps>,
  pmContractDetailRoute,
  {
    path: PM_PATHS.resources,
    element: lazyWithRetry(() => import('@/pages/pm/PmResourcePage'), 'PmResourcePage'),
    module: 'pm',
    code: 'pm-resources',
    title: i18n.t('shared.config.k9'),
    titleKey: 'shared.config.k9',
    template: 'list',
    group: 'process',
    requiredPermissions: ['pm:resource:read', 'pm:dashboard:read'],
    action: 'read',
    tier: 'basic',
  },
  {
    path: PM_PATHS.templates,
    element: lazyWithRetry(() => import('@/pages/pm/PmTemplatePage'), 'PmTemplatePage'),
    module: 'pm',
    code: 'pm-templates',
    title: i18n.t('shared.config.k10'),
    titleKey: 'shared.config.k10',
    template: 'list',
    group: 'process',
    requiredPermissions: ['pm:template:read', 'pm:dashboard:read'],
    action: 'read',
    tier: 'basic',
  },
  {
    path: PM_PATHS.reports,
    element: lazyWithRetry(() => import('@/pages/pm/PmReportPage'), 'PmReportPage'),
    module: 'pm',
    code: 'pm-reports',
    title: i18n.t('shared.config.k11'),
    titleKey: 'shared.config.k11',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['pm:report:read', 'pm:dashboard:read'],
    action: 'read',
    tier: 'basic',
  },
  taskKanbanRoute,
  {
    path: PM_PATHS.projectWizard,
    element: lazyWithRetry(
      () => import('@/pages/pm/ProjectCreateWizardPage'),
      'ProjectCreateWizardPage'
    ),
    module: 'pm',
    code: 'pm-project-wizard',
    title: i18n.t('shared.config.k13'),
    titleKey: 'shared.config.k13',
    template: 'wizard',
    group: 'business',
    requiredPermissions: ['pm:project:create', 'pm:dashboard:write'],
    action: 'write',
    tier: 'basic',
  },
  projectTimelineRoute,
  {
    path: PM_PATHS.projectList,
    element: lazyWithRetry(
      () => import('@/pages/pm/ProjectMasterDetailPage'),
      'ProjectMasterDetailPage'
    ),
    module: 'pm',
    code: 'pm-project-list',
    title: i18n.t('shared.config.k15'),
    titleKey: 'shared.config.k15',
    template: 'master-detail',
    group: 'business',
    requiredPermissions: ['pm:project:read', 'pm:dashboard:read'],
    action: 'read',
    tier: 'basic',
  },
];

export const pmModuleConfig: RouteModuleConfig = {
  code: 'pm',
  name: i18n.t('shared.config.pm_name'),
  nameKey: 'shared.config.pm_name',
  icon: 'FolderKanban',
  path: PM_PATHS.root,
  source: 'core',
  suite: 'project',
  status: 'online',
  order: 13,
  description: i18n.t('shared.config.k1'),
  permission: 'pm:dashboard:read',
  tier: 'basic',
  routes: pmRoutes,
};

// ---- 导航配置（供导航注册表使用） ----
export const pmNavConfig: ModuleNavConfig = {
  code: 'pm',
  name: i18n.t('shared.config.k16'),
  nameKey: 'shared.config.k16',
  icon: 'FolderKanban',
  path: PM_PATHS.root,
  permission: 'pm:dashboard:read',
  source: 'core',
  suite: 'project',
  status: 'online',
  order: 13,
  description: i18n.t('shared.config.k17'),
  navItems: [
    {
      code: 'pm-dashboard',
      label: i18n.t('shared.config.k18'),
      labelKey: 'shared.config.k18',
      icon: 'LayoutDashboard',
      path: PM_PATHS.dashboard,
      permission: 'pm:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.pm_0'),
    },
    {
      code: 'pm-projects',
      label: i18n.t('shared.config.k19'),
      labelKey: 'shared.config.k19',
      icon: 'FolderKanban',
      path: PM_PATHS.projects,
      permission: 'pm:project:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('shared.config.k20'),
    },
    {
      code: 'pm-project-list',
      label: i18n.t('shared.config.pm_7'),
      labelKey: 'shared.config.pm_7',
      icon: 'ListTree',
      path: PM_PATHS.projectList,
      permission: 'pm:project:read',
      order: 2,
      group: 'business',
      description: i18n.t('shared.config.pm_8'),
    },
    {
      code: 'pm-task-kanban',
      label: i18n.t('shared.config.pm_1'),
      labelKey: 'shared.config.pm_1',
      icon: 'SquareKanban',
      path: PM_PATHS.taskKanban,
      permission: 'pm:task:read',
      order: 3,
      group: 'business',
      showInTabs: true,
      description: i18n.t('shared.config.pm_2'),
    },
    {
      code: 'pm-project-wizard',
      label: i18n.t('shared.config.pm_3'),
      labelKey: 'shared.config.pm_3',
      icon: 'Wand2',
      path: PM_PATHS.projectWizard,
      permission: 'pm:project:create',
      order: 4,
      group: 'business',
      description: i18n.t('shared.config.pm_4'),
    },
    {
      code: 'pm-contracts',
      label: i18n.t('shared.config.k21'),
      labelKey: 'shared.config.k21',
      icon: 'FileText',
      path: PM_PATHS.contracts,
      permission: 'pm:contract:read',
      order: 5,
      group: 'business',
      description: i18n.t('shared.config.k22'),
    },
    {
      code: 'pm-resources',
      label: i18n.t('shared.config.k23'),
      labelKey: 'shared.config.k23',
      icon: 'Users',
      path: PM_PATHS.resources,
      permission: 'pm:resource:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k24'),
    },
    {
      code: 'pm-templates',
      label: i18n.t('shared.config.k25'),
      labelKey: 'shared.config.k25',
      icon: 'LayoutTemplate',
      path: PM_PATHS.templates,
      permission: 'pm:template:read',
      order: 2,
      group: 'process',
      description: i18n.t('shared.config.k26'),
    },
    {
      code: 'pm-reports',
      label: i18n.t('shared.config.k27'),
      labelKey: 'shared.config.k27',
      icon: 'BarChart3',
      path: PM_PATHS.reports,
      permission: 'pm:report:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('shared.config.k28'),
    },
    {
      code: 'pm-timeline',
      label: i18n.t('shared.config.pm_5'),
      labelKey: 'shared.config.pm_5',
      icon: 'Clock',
      path: PM_PATHS.timeline,
      permission: 'pm:dashboard:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('shared.config.pm_6'),
    },
  ],
};
