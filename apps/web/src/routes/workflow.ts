import React from "react";
import { Navigate } from "react-router-dom";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const FlowWorkflowPage = lazy(
  () => import("../pages/workflow/FlowWorkflowPage"),
);
const WorkflowDashboardPage = lazy(
  () => import("../pages/workflow/DashboardPage"),
);
const WorkflowDesignerPage = lazy(
  () => import("../pages/templates/WorkflowDesignerPage"),
);
const FlowInstanceListPage = lazy(
  () => import("../pages/workflow/FlowInstanceListPage"),
);
const FlowInstanceDetailPage = lazy(
  () => import("../pages/workflow/FlowInstanceDetailPage"),
);
const FlowApprovalPage = lazy(
  () => import("../pages/workflow/FlowApprovalPage"),
);
const FlowApprovalDetailPage = lazy(
  () => import("../pages/workflow/FlowApprovalDetailPage"),
);
const FlowNotificationCenter = lazy(
  () => import("../pages/workflow/FlowNotificationCenter"),
);
const FlowStatisticsPage = lazy(
  () => import("../pages/workflow/FlowStatisticsPage"),
);
const FlowVersionHistoryPage = lazy(
  () => import("../pages/workflow/FlowVersionHistoryPage"),
);

export const workflowRoutes: RouteConfig[] = [
  {
    path: "/flow",
    element: WorkflowDashboardPage,
    requiredPermissions: ["workflow:read"],
    module: "workflow",
    action: "read",
  },
  {
    path: "/flow/definitions",
    element: FlowWorkflowPage,
    requiredPermissions: ["workflow:read"],
    module: "workflow",
    action: "read",
  },
  {
    path: "/flow/designer",
    element: WorkflowDesignerPage,
    requiredPermissions: ["workflow:write"],
    module: "workflow",
    action: "write",
  },
  {
    path: "/flow/instances",
    element: FlowInstanceListPage,
    requiredPermissions: ["workflow:read"],
    module: "workflow",
    action: "read",
  },
  {
    path: "/flow/instance/:id",
    element: FlowInstanceDetailPage,
    requiredPermissions: ["workflow:read"],
    module: "workflow",
    action: "read",
  },
  {
    path: "/flow/approvals",
    element: FlowApprovalPage,
    requiredPermissions: ["workflow:read"],
    module: "workflow",
    action: "read",
  },
  {
    path: "/flow/approval/:id",
    element: FlowApprovalDetailPage,
    requiredPermissions: ["workflow:read"],
    module: "workflow",
    action: "read",
  },
  {
    path: "/flow/notifications",
    element: FlowNotificationCenter,
    requiredPermissions: [],
    module: "workflow",
    action: "read",
  },
  {
    path: "/flow/statistics",
    element: FlowStatisticsPage,
    requiredPermissions: ["workflow:read"],
    module: "workflow",
    action: "read",
  },
  {
    path: "/flow/history",
    element: FlowVersionHistoryPage,
    requiredPermissions: ["workflow:read"],
    module: "workflow",
    action: "read",
  },
];
