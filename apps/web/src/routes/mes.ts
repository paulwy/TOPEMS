import React from "react";
import { Navigate } from "react-router-dom";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const ProductionOrderManagementPage = lazy(
  () => import("../pages/ProductionOrderManagementPage"),
);
const ProductionProcessPage = lazy(
  () => import("../pages/ProductionProcessPage"),
);
const WorkStationPage = lazy(() => import("../pages/WorkStationPage"));
const ProductionRecordPage = lazy(
  () => import("../pages/ProductionRecordPage"),
);

export const mesRoutes: RouteConfig[] = [
  {
    path: "/mes",
    element: React.createElement(Navigate, { to: "/mes/orders", replace: true }),
    requiredPermissions: ["mes:read"],
    module: "mes",
    action: "read",
  },
  {
    path: "/mes/orders",
    element: ProductionOrderManagementPage,
    requiredPermissions: ["mes:read"],
    module: "mes",
    action: "read",
  },
  {
    path: "/mes/processes",
    element: ProductionProcessPage,
    requiredPermissions: ["mes:read"],
    module: "mes",
    action: "read",
  },
  {
    path: "/mes/workstations",
    element: WorkStationPage,
    requiredPermissions: ["mes:read"],
    module: "mes",
    action: "read",
  },
  {
    path: "/mes/records",
    element: ProductionRecordPage,
    requiredPermissions: ["mes:read"],
    module: "mes",
    action: "read",
  },
];
