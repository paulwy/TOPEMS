import React, { lazy } from "react";
import type { RouteConfig } from "./utils";

const PluginManagementPage = lazy(
  () => import("../pages/admin/PluginManagementPage"),
);

export const pluginRoutes: RouteConfig[] = [
  {
    path: "/admin/plugins",
    element: PluginManagementPage,
    requiredPermissions: ["iam:system_read"],
    module: "iam",
    action: "read",
  },
];
