import React from "react";
import { Navigate } from "react-router-dom";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const WarehouseManagementPage = lazy(
  () => import("../pages/WarehouseManagementPage"),
);
const InventoryPage = lazy(() => import("../pages/InventoryPage"));
const InboundOrderPage = lazy(() => import("../pages/InboundOrderPage"));
const OutboundOrderPage = lazy(() => import("../pages/OutboundOrderPage"));

export const wmsRoutes: RouteConfig[] = [
  {
    path: "/wms",
    element: React.createElement(Navigate, { to: "/wms/warehouses", replace: true }),
    requiredPermissions: ["wms:read"],
    module: "wms",
    action: "read",
  },
  {
    path: "/wms/warehouses",
    element: WarehouseManagementPage,
    requiredPermissions: ["wms:read"],
    module: "wms",
    action: "read",
  },
  {
    path: "/wms/inventory",
    element: InventoryPage,
    requiredPermissions: ["wms:read"],
    module: "wms",
    action: "read",
  },
  {
    path: "/wms/inbound-orders",
    element: InboundOrderPage,
    requiredPermissions: ["wms:read"],
    module: "wms",
    action: "read",
  },
  {
    path: "/wms/outbound-orders",
    element: OutboundOrderPage,
    requiredPermissions: ["wms:read"],
    module: "wms",
    action: "read",
  },
];
