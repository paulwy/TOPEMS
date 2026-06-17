import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const MonitorPage = lazy(() => import("../pages/system/MonitorPage"));

export const monitorRoutes: RouteConfig[] = [
  {
    path: "/monitor",
    element: MonitorPage,
    requiredPermissions: ["iam:system_read"],
    module: "monitor",
    action: "read",
  },
];
