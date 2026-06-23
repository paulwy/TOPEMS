import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const MonitorDashboardPage = lazy(
  () => import("../pages/monitor/MonitorDashboardPage"),
);
const MonitorMetricsPage = lazy(
  () => import("../pages/monitor/MonitorMetricsPage"),
);
const MonitorAlertsPage = lazy(
  () => import("../pages/monitor/MonitorAlertsPage"),
);

export const monitorRoutes: RouteConfig[] = [
  {
    path: "/monitor",
    element: MonitorDashboardPage,
    requiredPermissions: [],
    module: "monitor",
    action: "read",
  },
  {
    path: "/monitor/dashboard",
    element: MonitorDashboardPage,
    requiredPermissions: [],
    module: "monitor",
    action: "read",
  },
  {
    path: "/monitor/metrics",
    element: MonitorMetricsPage,
    requiredPermissions: [],
    module: "monitor",
    action: "read",
  },
  {
    path: "/monitor/alerts",
    element: MonitorAlertsPage,
    requiredPermissions: [],
    module: "monitor",
    action: "read",
  },
];
