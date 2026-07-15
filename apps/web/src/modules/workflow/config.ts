import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 WORKFLOW_PATHS.xxx，而非硬编码字符串
export const WORKFLOW_PATHS = {
  root: '/workflow',
  dashboard: '/workflow/dashboard',
  definitions: '/workflow/definitions',
  designer: '/workflow/designer',
  versionHistory: '/workflow/version-history',
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

// ---- 路由配置（供路由系统使用） ----
export const workflowModuleConfig: RouteModuleConfig = {
  code: 'workflow',
  name: '工作流',
  icon: 'Workflow',
  path: WORKFLOW_PATHS.root,
  source: 'core',
  status: 'online',
  order: 2,
  description: '流程设计、实例管理、审批任务、监控统计',
  permission: 'workflow:read',
  routes: [
    {
      path: WORKFLOW_PATHS.dashboard,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowDashboardPage'),
        'WorkflowDashboardPage'
      ),
      module: 'workflow',
      code: 'workflow-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['workflow:read'],
      action: 'read',
    },
    {
      path: WORKFLOW_PATHS.definitions,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowDefinitionsPage'),
        'WorkflowDefinitionsPage'
      ),
      module: 'workflow',
      code: 'workflow-definitions',
      title: '流程定义',
      template: 'list',
      group: 'design',
      requiredPermissions: ['workflow:definition:read', 'workflow:read'],
      action: 'read',
    },
    {
      path: WORKFLOW_PATHS.designer,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowDesignerPage'),
        'WorkflowDesignerPage'
      ),
      module: 'workflow',
      code: 'workflow-designer',
      title: '流程设计器',
      template: 'form',
      group: 'design',
      requiredPermissions: ['workflow:definition:write', 'workflow:write'],
      action: 'write',
    },
    {
      path: WORKFLOW_PATHS.versionHistory,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowVersionHistoryPage'),
        'WorkflowVersionHistoryPage'
      ),
      module: 'workflow',
      code: 'workflow-version-history',
      title: '版本历史',
      template: 'list',
      group: 'design',
      requiredPermissions: ['workflow:definition:read', 'workflow:read'],
      action: 'read',
    },
    {
      path: WORKFLOW_PATHS.instances,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowInstancesPage'),
        'WorkflowInstancesPage'
      ),
      module: 'workflow',
      code: 'workflow-instances',
      title: '流程实例',
      template: 'list',
      group: 'runtime',
      requiredPermissions: ['workflow:instance:read', 'workflow:read'],
      action: 'read',
    },
    {
      path: WORKFLOW_PATHS.instanceDetail,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowInstanceDetailPage'),
        'WorkflowInstanceDetailPage'
      ),
      module: 'workflow',
      code: 'workflow-instance-detail',
      title: '实例详情',
      template: 'detail',
      group: 'runtime',
      requiredPermissions: ['workflow:instance:read', 'workflow:read'],
      action: 'read',
    },
    {
      path: WORKFLOW_PATHS.approvals,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowApprovalsPage'),
        'WorkflowApprovalsPage'
      ),
      module: 'workflow',
      code: 'workflow-approvals',
      title: '审批任务',
      template: 'list',
      group: 'tasks',
      requiredPermissions: ['workflow:approval:read', 'workflow:read'],
      action: 'read',
    },
    {
      path: WORKFLOW_PATHS.approvalDetail,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowApprovalDetailPage'),
        'WorkflowApprovalDetailPage'
      ),
      module: 'workflow',
      code: 'workflow-approval-detail',
      title: '审批详情',
      template: 'detail',
      group: 'tasks',
      requiredPermissions: ['workflow:approval:read', 'workflow:read'],
      action: 'read',
    },
    {
      path: WORKFLOW_PATHS.notificationCenter,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowNotificationCenterPage'),
        'WorkflowNotificationCenterPage'
      ),
      module: 'workflow',
      code: 'workflow-notification-center',
      title: '通知中心',
      template: 'list',
      group: 'tasks',
      requiredPermissions: ['workflow:notification:read', 'workflow:read'],
      action: 'read',
    },
    {
      path: WORKFLOW_PATHS.monitor,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowMonitorPage'),
        'WorkflowMonitorPage'
      ),
      module: 'workflow',
      code: 'workflow-monitor',
      title: '流程监控',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['workflow:monitor:read', 'workflow:read'],
      action: 'read',
    },
    {
      path: WORKFLOW_PATHS.statistics,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowStatisticsPage'),
        'WorkflowStatisticsPage'
      ),
      module: 'workflow',
      code: 'workflow-statistics',
      title: '统计分析',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['workflow:statistics:read', 'workflow:read'],
      action: 'read',
    },
    {
      path: WORKFLOW_PATHS.templates,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowTemplatePage'),
        'WorkflowTemplatePage'
      ),
      module: 'workflow',
      code: 'workflow-templates',
      title: '流程模板',
      template: 'list',
      group: 'settings',
      requiredPermissions: ['workflow:template:read', 'workflow:read'],
      action: 'read',
    },
    {
      path: WORKFLOW_PATHS.settings,
      element: lazyWithRetry(
        () => import('@/pages/workflow/WorkflowSettingsPage'),
        'WorkflowSettingsPage'
      ),
      module: 'workflow',
      code: 'workflow-settings',
      title: '系统设置',
      template: 'settings',
      group: 'settings',
      requiredPermissions: ['workflow:admin'],
      action: 'admin',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const workflowNavConfig: ModuleNavConfig = {
  code: 'workflow',
  name: '工作流',
  icon: 'Workflow',
  path: WORKFLOW_PATHS.root,
  permission: 'workflow:read',
  source: 'core',
  status: 'online',
  order: 2,
  description: '流程设计、实例管理、审批任务、监控统计',
  navItems: [
    {
      code: 'workflow-dashboard',
      label: '仪表盘',
      icon: 'LayoutDashboard',
      path: WORKFLOW_PATHS.dashboard,
      permission: 'workflow:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: '工作流数据概览',
    },
    {
      code: 'workflow-definitions',
      label: '流程定义',
      icon: 'FileCode',
      path: WORKFLOW_PATHS.definitions,
      permission: 'workflow:definition:read',
      order: 1,
      group: 'design',
      showInTabs: true,
      description: '流程定义管理',
    },
    {
      code: 'workflow-designer',
      label: '流程设计器',
      icon: 'Pencil',
      path: WORKFLOW_PATHS.designer,
      permission: 'workflow:definition:write',
      order: 2,
      group: 'design',
      description: '流程设计器',
    },
    {
      code: 'workflow-instances',
      label: '流程实例',
      icon: 'PlaySquare',
      path: WORKFLOW_PATHS.instances,
      permission: 'workflow:instance:read',
      order: 1,
      group: 'runtime',
      showInTabs: true,
      description: '流程实例管理',
    },
    {
      code: 'workflow-approvals',
      label: '审批任务',
      icon: 'CheckSquare',
      path: WORKFLOW_PATHS.approvals,
      permission: 'workflow:approval:read',
      order: 1,
      group: 'tasks',
      showInTabs: true,
      description: '审批任务管理',
    },
    {
      code: 'workflow-notification-center',
      label: '通知中心',
      icon: 'Bell',
      path: WORKFLOW_PATHS.notificationCenter,
      permission: 'workflow:notification:read',
      order: 2,
      group: 'tasks',
      description: '流程通知管理',
    },
    {
      code: 'workflow-monitor',
      label: '流程监控',
      icon: 'Activity',
      path: WORKFLOW_PATHS.monitor,
      permission: 'workflow:monitor:read',
      order: 1,
      group: 'analytics',
      description: '流程监控',
    },
    {
      code: 'workflow-statistics',
      label: '统计分析',
      icon: 'BarChart3',
      path: WORKFLOW_PATHS.statistics,
      permission: 'workflow:statistics:read',
      order: 2,
      group: 'analytics',
      description: '流程统计分析',
    },
    {
      code: 'workflow-templates',
      label: '流程模板',
      icon: 'Layers',
      path: WORKFLOW_PATHS.templates,
      permission: 'workflow:template:read',
      order: 1,
      group: 'settings',
      description: '流程模板管理',
    },
    {
      code: 'workflow-settings',
      label: '系统设置',
      icon: 'Settings',
      path: WORKFLOW_PATHS.settings,
      permission: 'workflow:admin',
      order: 2,
      group: 'settings',
      description: '工作流系统设置',
    },
  ],
};
