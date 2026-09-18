import { lazyWithRetry } from '@/routes/utils';
import type {
  RouteConfigV2,
  RouteModuleConfig,
  ListPageProps,
  FormPageProps,
} from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import type { TaskQueryParams } from '@/api/workflow';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 WORKFLOW_PATHS.xxx，而非硬编码字符串

export const WORKFLOW_PATHS = {
  root: '/workflow',
  dashboard: '/workflow/dashboard',
  definitions: '/workflow/definitions',
  designer: '/workflow/designer',
  versionHistory: '/workflow/version-history/:id?',
  instances: '/workflow/instances',
  instanceDetail: '/workflow/instances/:id',
  approvals: '/workflow/approvals',
  approvalDetail: '/workflow/approvals/:id',
  notificationCenter: '/workflow/notification-center',
  monitor: '/workflow/monitor',
  statistics: '/workflow/statistics',
  templates: '/workflow/templates',
  settings: '/workflow/settings',
} as const;

// V259 TypeMap: list 页 extends ListPageProps，form 页 extends FormPageProps
// detail/empty 模板保留自定义 Props
interface WorkflowDashboardPageProps {}
interface WorkflowDefinitionsPageProps extends ListPageProps {}
interface WorkflowDesignerPageProps extends FormPageProps {}
interface WorkflowVersionHistoryPageProps extends ListPageProps {}
interface WorkflowInstancesPageProps extends ListPageProps {}

interface WorkflowInstanceDetailPageProps {
  id?: string;
  entityType?: string;
}

/** filters 对齐 TaskQueryParams（assignee/candidate/priority/due_date） */
interface WorkflowApprovalsPageProps extends ListPageProps<TaskQueryParams> {}

interface WorkflowApprovalDetailPageProps {
  id?: string;
  entityType?: string;
}

interface WorkflowNotificationCenterPageProps extends ListPageProps {}
interface WorkflowMonitorPageProps {}
interface WorkflowStatisticsPageProps {}
interface WorkflowTemplatePageProps extends ListPageProps {}
interface WorkflowSettingsPageProps {}

const workflowDashboardRoute: RouteConfigV2<WorkflowDashboardPageProps> = {
  path: WORKFLOW_PATHS.dashboard,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowDashboardPage'),
    'WorkflowDashboardPage'
  ),
  module: 'workflow',
  code: 'workflow-dashboard',
  title: i18n.t('workflow.nav.workflow-dashboard'),
  titleKey: 'workflow.nav.workflow-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['workflow:dashboard:read'],
  action: 'read',
};

const workflowDefinitionsRoute: RouteConfigV2<WorkflowDefinitionsPageProps> = {
  path: WORKFLOW_PATHS.definitions,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowDefinitionsPage'),
    'WorkflowDefinitionsPage'
  ),
  module: 'workflow',
  code: 'workflow-definitions',
  title: i18n.t('workflow.nav.workflow-definitions'),
  titleKey: 'workflow.nav.workflow-definitions',
  template: 'list',
  group: 'process',
  requiredPermissions: ['workflow:definition:read', 'workflow:dashboard:read'],
  action: 'read',
};

const workflowDesignerRoute: RouteConfigV2<WorkflowDesignerPageProps> = {
  path: WORKFLOW_PATHS.designer,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowDesignerPage'),
    'WorkflowDesignerPage'
  ),
  module: 'workflow',
  code: 'workflow-designer',
  title: i18n.t('workflow.nav.workflow-designer'),
  titleKey: 'workflow.nav.workflow-designer',
  template: 'form',
  group: 'process',
  requiredPermissions: ['workflow:definition:write', 'workflow:dashboard:write'],
  action: 'write',
};

const workflowVersionHistoryRoute: RouteConfigV2<WorkflowVersionHistoryPageProps> = {
  path: WORKFLOW_PATHS.versionHistory,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowVersionHistoryPage'),
    'WorkflowVersionHistoryPage'
  ),
  module: 'workflow',
  code: 'workflow-version-history',
  title: i18n.t('workflow.nav.workflow-version-history'),
  titleKey: 'workflow.nav.workflow-version-history',
  template: 'list',
  group: 'process',
  requiredPermissions: ['workflow:definition:read', 'workflow:dashboard:read'],
  action: 'read',
};

const workflowInstancesRoute: RouteConfigV2<WorkflowInstancesPageProps> = {
  path: WORKFLOW_PATHS.instances,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowInstancesPage'),
    'WorkflowInstancesPage'
  ),
  module: 'workflow',
  code: 'workflow-instances',
  title: i18n.t('workflow.nav.workflow-instances'),
  titleKey: 'workflow.nav.workflow-instances',
  template: 'list',
  group: 'process',
  requiredPermissions: ['workflow:instance:read', 'workflow:dashboard:read'],
  action: 'read',
};

const workflowInstanceDetailRoute: RouteConfigV2<WorkflowInstanceDetailPageProps> = {
  path: WORKFLOW_PATHS.instanceDetail,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowInstanceDetailPage'),
    'WorkflowInstanceDetailPage'
  ),
  module: 'workflow',
  code: 'workflow-instance-detail',
  title: i18n.t('workflow.nav.workflow-instance-detail'),
  titleKey: 'workflow.nav.workflow-instance-detail',
  template: 'detail',
  group: 'process',
  requiredPermissions: ['workflow:instance:read', 'workflow:dashboard:read'],
  action: 'read',
};

const workflowApprovalsRoute: RouteConfigV2<WorkflowApprovalsPageProps> = {
  path: WORKFLOW_PATHS.approvals,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowApprovalsPage'),
    'WorkflowApprovalsPage'
  ),
  module: 'workflow',
  code: 'workflow-approvals',
  title: i18n.t('workflow.nav.workflow-approvals'),
  titleKey: 'workflow.nav.workflow-approvals',
  template: 'list',
  group: 'process',
  requiredPermissions: ['workflow:approval:read', 'workflow:dashboard:read'],
  action: 'read',
};

const workflowApprovalDetailRoute: RouteConfigV2<WorkflowApprovalDetailPageProps> = {
  path: WORKFLOW_PATHS.approvalDetail,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowApprovalDetailPage'),
    'WorkflowApprovalDetailPage'
  ),
  module: 'workflow',
  code: 'workflow-approval-detail',
  title: i18n.t('workflow.nav.workflow-approval-detail'),
  titleKey: 'workflow.nav.workflow-approval-detail',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['workflow:approval:read', 'workflow:dashboard:read'],
  action: 'read',
};

const workflowNotificationCenterRoute: RouteConfigV2<WorkflowNotificationCenterPageProps> = {
  path: WORKFLOW_PATHS.notificationCenter,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowNotificationCenterPage'),
    'WorkflowNotificationCenterPage'
  ),
  module: 'workflow',
  code: 'workflow-notification-center',
  title: i18n.t('workflow.nav.workflow-notification-center'),
  titleKey: 'workflow.nav.workflow-notification-center',
  template: 'list',
  group: 'process',
  requiredPermissions: ['workflow:notification:read', 'workflow:dashboard:read'],
  action: 'read',
};

const workflowMonitorRoute: RouteConfigV2<WorkflowMonitorPageProps> = {
  path: WORKFLOW_PATHS.monitor,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowMonitorPage'),
    'WorkflowMonitorPage'
  ),
  module: 'workflow',
  code: 'workflow-monitor',
  title: i18n.t('workflow.nav.workflow-monitor'),
  titleKey: 'workflow.nav.workflow-monitor',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['workflow:monitor:read', 'workflow:dashboard:read'],
  action: 'read',
};

const workflowStatisticsRoute: RouteConfigV2<WorkflowStatisticsPageProps> = {
  path: WORKFLOW_PATHS.statistics,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowStatisticsPage'),
    'WorkflowStatisticsPage'
  ),
  module: 'workflow',
  code: 'workflow-statistics',
  title: i18n.t('workflow.nav.workflow-statistics'),
  titleKey: 'workflow.nav.workflow-statistics',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['workflow:statistics:read', 'workflow:dashboard:read'],
  action: 'read',
};

const workflowTemplateRoute: RouteConfigV2<WorkflowTemplatePageProps> = {
  path: WORKFLOW_PATHS.templates,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowTemplatePage'),
    'WorkflowTemplatePage'
  ),
  module: 'workflow',
  code: 'workflow-templates',
  title: i18n.t('workflow.nav.workflow-templates'),
  titleKey: 'workflow.nav.workflow-templates',
  template: 'list',
  group: 'setting',
  requiredPermissions: ['workflow:template:read', 'workflow:dashboard:read'],
  action: 'read',
};

const workflowSettingsRoute: RouteConfigV2<WorkflowSettingsPageProps> = {
  path: WORKFLOW_PATHS.settings,
  element: lazyWithRetry(
    () => import('@/pages/workflow/WorkflowSettingsPage'),
    'WorkflowSettingsPage'
  ),
  module: 'workflow',
  code: 'workflow-settings',
  title: i18n.t('workflow.nav.workflow-settings'),
  titleKey: 'workflow.nav.workflow-settings',
  template: 'settings',
  group: 'setting',
  requiredPermissions: ['workflow:dashboard:admin'],
  action: 'admin',
};

// ---- 路由配置（供路由系统使用） ----
export const workflowModuleConfig: RouteModuleConfig = {
  code: 'workflow',
  name: i18n.t('shared.config.workflow_name'),
  nameKey: 'shared.config.workflow_name',
  icon: 'Workflow',
  path: WORKFLOW_PATHS.root,
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 2,
  description: i18n.t('workflow.nav.module_name_desc'),
  permission: 'workflow:dashboard:read',
  routes: [
    workflowDashboardRoute,
    workflowDefinitionsRoute,
    workflowDesignerRoute,
    workflowVersionHistoryRoute,
    workflowInstancesRoute,
    workflowInstanceDetailRoute,
    workflowApprovalsRoute,
    workflowApprovalDetailRoute,
    workflowNotificationCenterRoute,
    workflowMonitorRoute,
    workflowStatisticsRoute,
    workflowTemplateRoute,
    workflowSettingsRoute,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const workflowNavConfig: ModuleNavConfig = {
  code: 'workflow',
  name: i18n.t('workflow.nav.module_name'),
  nameKey: 'workflow.nav.module_name',
  icon: 'Workflow',
  path: WORKFLOW_PATHS.root,
  permission: 'workflow:dashboard:read',
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 2,
  description: i18n.t('workflow.nav.module_name_desc'),
  navItems: [
    {
      code: 'workflow-dashboard',
      label: i18n.t('workflow.nav.workflow-dashboard'),
      labelKey: 'workflow.nav.workflow-dashboard',
      icon: 'LayoutDashboard',
      path: WORKFLOW_PATHS.dashboard,
      permission: 'workflow:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('workflow.nav.workflow-dashboard_desc'),
    },
    {
      code: 'workflow-definitions',
      label: i18n.t('workflow.nav.workflow-definitions'),
      labelKey: 'workflow.nav.workflow-definitions',
      icon: 'FileCode',
      path: WORKFLOW_PATHS.definitions,
      permission: 'workflow:definition:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('workflow.nav.workflow-definitions_desc'),
    },
    {
      code: 'workflow-designer',
      label: i18n.t('workflow.nav.workflow-designer'),
      labelKey: 'workflow.nav.workflow-designer',
      icon: 'Pencil',
      path: WORKFLOW_PATHS.designer,
      permission: 'workflow:definition:write',
      order: 2,
      group: 'process',
      description: i18n.t('workflow.nav.workflow-designer_desc'),
    },
    {
      code: 'workflow-version-history',
      label: i18n.t('workflow.nav.workflow-version-history'),
      labelKey: 'workflow.nav.workflow-version-history',
      icon: 'History',
      path: WORKFLOW_PATHS.versionHistory,
      permission: 'workflow:definition:read',
      order: 3,
      group: 'process',
      description: i18n.t('workflow.nav.workflow-version-history_desc'),
    },
    {
      code: 'workflow-instances',
      label: i18n.t('workflow.nav.workflow-instances'),
      labelKey: 'workflow.nav.workflow-instances',
      icon: 'PlaySquare',
      path: WORKFLOW_PATHS.instances,
      permission: 'workflow:instance:read',
      order: 4,
      group: 'process',
      showInTabs: true,
      description: i18n.t('workflow.nav.workflow-instances_desc'),
    },
    {
      code: 'workflow-approvals',
      label: i18n.t('workflow.nav.workflow-approvals'),
      labelKey: 'workflow.nav.workflow-approvals',
      icon: 'CheckSquare',
      path: WORKFLOW_PATHS.approvals,
      permission: 'workflow:approval:read',
      order: 5,
      group: 'process',
      showInTabs: true,
      description: i18n.t('workflow.nav.workflow-approvals_desc'),
    },
    {
      code: 'workflow-notification-center',
      label: i18n.t('workflow.nav.workflow-notification-center'),
      labelKey: 'workflow.nav.workflow-notification-center',
      icon: 'Bell',
      path: WORKFLOW_PATHS.notificationCenter,
      permission: 'workflow:notification:read',
      order: 6,
      group: 'process',
      description: i18n.t('workflow.nav.workflow-notification-center_desc'),
    },
    {
      code: 'workflow-monitor',
      label: i18n.t('workflow.nav.workflow-monitor'),
      labelKey: 'workflow.nav.workflow-monitor',
      icon: 'Activity',
      path: WORKFLOW_PATHS.monitor,
      permission: 'workflow:monitor:read',
      order: 1,
      group: 'analytics',
      description: i18n.t('workflow.nav.workflow-monitor_desc'),
    },
    {
      code: 'workflow-statistics',
      label: i18n.t('workflow.nav.workflow-statistics'),
      labelKey: 'workflow.nav.workflow-statistics',
      icon: 'BarChart3',
      path: WORKFLOW_PATHS.statistics,
      permission: 'workflow:statistics:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('workflow.nav.workflow-statistics_desc'),
    },
    {
      code: 'workflow-templates',
      label: i18n.t('workflow.nav.workflow-templates'),
      labelKey: 'workflow.nav.workflow-templates',
      icon: 'Layers',
      path: WORKFLOW_PATHS.templates,
      permission: 'workflow:template:read',
      order: 1,
      group: 'setting',
      description: i18n.t('workflow.nav.workflow-templates_desc'),
    },
    {
      code: 'workflow-settings',
      label: i18n.t('workflow.nav.workflow-settings'),
      labelKey: 'workflow.nav.workflow-settings',
      icon: 'Settings',
      path: WORKFLOW_PATHS.settings,
      permission: 'workflow:dashboard:admin',
      order: 2,
      group: 'setting',
      description: i18n.t('workflow.nav.workflow-settings_desc'),
    },
  ],
};
