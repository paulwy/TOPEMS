import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const FlowWorkflowPage = lazy(() => import("../pages/FlowWorkflowPage"));
const WorkflowDesignerPage = lazy(
  () => import("../pages/WorkflowDesignerPage"),
);
const FlowInstanceListPage = lazy(
  () => import("../pages/FlowInstanceListPage"),
);
const FlowInstanceDetailPage = lazy(
  () => import("../pages/FlowInstanceDetailPage"),
);
const FlowApprovalPage = lazy(() => import("../pages/FlowApprovalPage"));
const FlowApprovalDetailPage = lazy(
  () => import("../pages/FlowApprovalDetailPage"),
);
const FlowNotificationCenter = lazy(
  () => import("../pages/FlowNotificationCenter"),
);
const FlowStatisticsPage = lazy(() => import("../pages/FlowStatisticsPage"));
const FlowVersionHistoryPage = lazy(
  () => import("../pages/FlowVersionHistoryPage"),
);

export const workflowRoutes: RouteConfig[] = [
  {
    path: "/workflows",
    element: FlowWorkflowPage,
    requiredPermissions: ["workflow:read"],
    module: "workflow",
    action: "read",
  },
  {
    path: "/workflow-designer",
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
