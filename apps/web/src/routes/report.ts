import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const ReportListPage = lazy(() => import("../pages/report/ReportListPage"));
const ReportDesignPage = lazy(() => import("../pages/report/ReportDesignPage"));
const ReportSchedulePage = lazy(() => import("../pages/report/ReportSchedulePage"));
const ReportSubscriptionPage = lazy(() => import("../pages/report/ReportSubscriptionPage"));

export const reportRoutes: RouteConfig[] = [
  {
    path: "/report/list",
    element: ReportListPage,
    requiredPermissions: [],
    module: "report",
    action: "read",
  },
  {
    path: "/report/design",
    element: ReportDesignPage,
    requiredPermissions: [],
    module: "report",
    action: "read",
  },
  {
    path: "/report/schedules",
    element: ReportSchedulePage,
    requiredPermissions: [],
    module: "report",
    action: "read",
  },
  {
    path: "/report/subscriptions",
    element: ReportSubscriptionPage,
    requiredPermissions: [],
    module: "report",
    action: "read",
  },
];