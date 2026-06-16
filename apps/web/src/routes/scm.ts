import React from "react";
import { Navigate } from "react-router-dom";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const ScmSupplierPage = lazy(() => import("../pages/scm/ScmSupplierPage"));
const ScmPurchaseOrderPage = lazy(
  () => import("../pages/scm/ScmPurchaseOrderPage"),
);
const ScmPurchaseItemPage = lazy(
  () => import("../pages/scm/ScmPurchaseItemPage"),
);
const ScmEvaluationPage = lazy(() => import("../pages/scm/ScmEvaluationPage"));
const SupplierDetailPage = lazy(() => import("../pages/SupplierDetailPage"));

export const scmRoutes: RouteConfig[] = [
  {
    path: "/scm",
    element: React.createElement(Navigate, { to: "/scm/suppliers", replace: true }),
    requiredPermissions: ["scm:read"],
    module: "scm",
    action: "read",
  },
  {
    path: "/scm/suppliers",
    element: ScmSupplierPage,
    requiredPermissions: ["scm:read"],
    module: "scm",
    action: "read",
  },
  {
    path: "/scm/suppliers/:id",
    element: SupplierDetailPage,
    requiredPermissions: ["scm:read"],
    module: "scm",
    action: "read",
  },
  {
    path: "/scm/purchase-orders",
    element: ScmPurchaseOrderPage,
    requiredPermissions: ["scm:read"],
    module: "scm",
    action: "read",
  },
  {
    path: "/scm/purchase-items",
    element: ScmPurchaseItemPage,
    requiredPermissions: ["scm:read"],
    module: "scm",
    action: "read",
  },
  {
    path: "/scm/evaluations",
    element: ScmEvaluationPage,
    requiredPermissions: ["scm:read"],
    module: "scm",
    action: "read",
  },
];
