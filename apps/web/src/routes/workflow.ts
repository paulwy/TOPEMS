import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const FlowWorkflowPage = lazy(() => import('../pages/FlowWorkflowPage'));
const WorkflowDesignerPage = lazy(() => import('../pages/WorkflowDesignerPage'));
const FlowInstanceListPage = lazy(() => import('../pages/FlowInstanceListPage'));
const FlowInstanceDetailPage = lazy(() => import('../pages/FlowInstanceDetailPage'));
const FlowApprovalPage = lazy(() => import('../pages/FlowApprovalPage'));
const FlowApprovalDetailPage = lazy(() => import('../pages/FlowApprovalDetailPage'));
const FlowNotificationCenter = lazy(() => import('../pages/FlowNotificationCenter'));
const FlowStatisticsPage = lazy(() => import('../pages/FlowStatisticsPage'));
const FlowVersionHistoryPage = lazy(() => import('../pages/FlowVersionHistoryPage'));

export const workflowRoutes: RouteConfig[] = [
  {
    path: '/workflows',
    element: React.createElement(FlowWorkflowPage),
    requiredPermissions: ['workflow:read'],
    module: 'workflow',
    action: 'read',
  },
  {
    path: '/workflow-designer',
    element: React.createElement(WorkflowDesignerPage),
    requiredPermissions: ['workflow:write'],
    module: 'workflow',
    action: 'write',
  },
  {
    path: '/flow/instances',
    element: React.createElement(FlowInstanceListPage),
    requiredPermissions: ['workflow:read'],
    module: 'workflow',
    action: 'read',
  },
  {
    path: '/flow/instance/:id',
    element: React.createElement(FlowInstanceDetailPage),
    requiredPermissions: ['workflow:read'],
    module: 'workflow',
    action: 'read',
  },
  {
    path: '/flow/approvals',
    element: React.createElement(FlowApprovalPage),
    requiredPermissions: ['workflow:read'],
    module: 'workflow',
    action: 'read',
  },
  {
    path: '/flow/approval/:id',
    element: React.createElement(FlowApprovalDetailPage),
    requiredPermissions: ['workflow:read'],
    module: 'workflow',
    action: 'read',
  },
  {
    path: '/flow/notifications',
    element: React.createElement(FlowNotificationCenter),
    requiredPermissions: [],
    module: 'workflow',
    action: 'read',
  },
  {
    path: '/flow/statistics',
    element: React.createElement(FlowStatisticsPage),
    requiredPermissions: ['workflow:read'],
    module: 'workflow',
    action: 'read',
  },
  {
    path: '/flow/history',
    element: React.createElement(FlowVersionHistoryPage),
    requiredPermissions: ['workflow:read'],
    module: 'workflow',
    action: 'read',
  },
];
