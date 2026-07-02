import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const WorkflowDashboardPage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowDashboardPage'),
  'WorkflowDashboardPage'
);
const WorkflowDefinitionsPage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowDefinitionsPage'),
  'WorkflowDefinitionsPage'
);
const WorkflowInstancesPage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowInstancesPage'),
  'WorkflowInstancesPage'
);
const WorkflowInstanceDetailPage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowInstanceDetailPage'),
  'WorkflowInstanceDetailPage'
);
const WorkflowApprovalsPage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowApprovalsPage'),
  'WorkflowApprovalsPage'
);
const WorkflowApprovalDetailPage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowApprovalDetailPage'),
  'WorkflowApprovalDetailPage'
);
const WorkflowMonitorPage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowMonitorPage'),
  'WorkflowMonitorPage'
);
const WorkflowStatisticsPage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowStatisticsPage'),
  'WorkflowStatisticsPage'
);
const WorkflowTemplatePage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowTemplatePage'),
  'WorkflowTemplatePage'
);
const WorkflowSettingsPage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowSettingsPage'),
  'WorkflowSettingsPage'
);
const WorkflowDesignerPage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowDesignerPage'),
  'WorkflowDesignerPage'
);
const WorkflowVersionHistoryPage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowVersionHistoryPage'),
  'WorkflowVersionHistoryPage'
);
const WorkflowNotificationCenterPage = lazyWithRetry(
  () => import('../../pages/workflow/WorkflowNotificationCenterPage'),
  'WorkflowNotificationCenterPage'
);

export const workflowModuleConfig: RouteModuleConfig = {
  code: 'workflow',
  name: '工作流',
  icon: 'Workflow',
  path: '/workflow',
  source: 'core',
  status: 'online',
  order: 2,
  description: '流程设计、实例管理、审批任务、监控统计',
  permission: 'workflow:read',
  routes: [
    {
      path: '/workflow/dashboard',
      element: WorkflowDashboardPage,
      module: 'workflow',
      code: 'workflow-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['workflow:read'],
    },
    {
      path: '/workflow/definitions',
      element: WorkflowDefinitionsPage,
      module: 'workflow',
      code: 'workflow-definitions',
      title: '流程定义',
      template: 'list',
      group: 'design',
      requiredPermissions: ['workflow:definition:read'],
    },
    {
      path: '/workflow/designer',
      element: WorkflowDesignerPage,
      module: 'workflow',
      code: 'workflow-designer',
      title: '流程设计器',
      template: 'form',
      group: 'design',
      requiredPermissions: ['workflow:definition:write'],
    },
    {
      path: '/workflow/version-history',
      element: WorkflowVersionHistoryPage,
      module: 'workflow',
      code: 'workflow-version-history',
      title: '版本历史',
      template: 'list',
      group: 'design',
      requiredPermissions: ['workflow:definition:read'],
    },
    {
      path: '/workflow/instances',
      element: WorkflowInstancesPage,
      module: 'workflow',
      code: 'workflow-instances',
      title: '流程实例',
      template: 'list',
      group: 'runtime',
      requiredPermissions: ['workflow:instance:read'],
    },
    {
      path: '/workflow/instances/:id',
      element: WorkflowInstanceDetailPage,
      module: 'workflow',
      code: 'workflow-instance-detail',
      title: '实例详情',
      template: 'detail',
      group: 'runtime',
      requiredPermissions: ['workflow:instance:read'],
    },
    {
      path: '/workflow/approvals',
      element: WorkflowApprovalsPage,
      module: 'workflow',
      code: 'workflow-approvals',
      title: '审批任务',
      template: 'list',
      group: 'tasks',
      requiredPermissions: ['workflow:approval:read'],
    },
    {
      path: '/workflow/approvals/:id',
      element: WorkflowApprovalDetailPage,
      module: 'workflow',
      code: 'workflow-approval-detail',
      title: '审批详情',
      template: 'detail',
      group: 'tasks',
      requiredPermissions: ['workflow:approval:read'],
    },
    {
      path: '/workflow/notification-center',
      element: WorkflowNotificationCenterPage,
      module: 'workflow',
      code: 'workflow-notification-center',
      title: '通知中心',
      template: 'list',
      group: 'tasks',
      requiredPermissions: ['workflow:notification:read'],
    },
    {
      path: '/workflow/monitor',
      element: WorkflowMonitorPage,
      module: 'workflow',
      code: 'workflow-monitor',
      title: '流程监控',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['workflow:monitor:read'],
    },
    {
      path: '/workflow/statistics',
      element: WorkflowStatisticsPage,
      module: 'workflow',
      code: 'workflow-statistics',
      title: '统计分析',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['workflow:statistics:read'],
    },
    {
      path: '/workflow/templates',
      element: WorkflowTemplatePage,
      module: 'workflow',
      code: 'workflow-templates',
      title: '流程模板',
      template: 'list',
      group: 'settings',
      requiredPermissions: ['workflow:template:read'],
    },
    {
      path: '/workflow/settings',
      element: WorkflowSettingsPage,
      module: 'workflow',
      code: 'workflow-settings',
      title: '系统设置',
      template: 'settings',
      group: 'settings',
      requiredPermissions: ['workflow:admin'],
    },
  ],
};
