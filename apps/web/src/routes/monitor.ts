import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const MonitorPage = lazy(() => import("../pages/MonitorPage"));

export const monitorRoutes: RouteConfig[] = [
  {
    path: "/monitor",
    element: MonitorPage,
    requiredPermissions: ["system:read"],
    module: "monitor",
    action: "read",
  },
];