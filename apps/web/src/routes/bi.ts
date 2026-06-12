import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const BIDashboardPage = lazy(() => import("../pages/BIDashboardPage"));
const BIAnalyticsPage = lazy(() => import("../pages/BIAnalyticsPage"));
const BIComparisonPage = lazy(() => import("../pages/BIComparisonPage"));
const BIReportPage = lazy(() => import("../pages/BIReportPage"));
const BIDataSourcePage = lazy(() => import("../pages/BIDataSourcePage"));
const BIVisualizationPage = lazy(() => import("../pages/BIVisualizationPage"));
const BIModuleDetailPage = lazy(() => import("../pages/BIModuleDetailPage"));

export const biRoutes: RouteConfig[] = [
  {
    path: "/bi/dashboard",
    element: BIDashboardPage,
    requiredPermissions: [],
    module: "bi",
    action: "read",
  },
  {
    path: "/bi/analytics",
    element: BIAnalyticsPage,
    requiredPermissions: [],
    module: "bi",
    action: "read",
  },
  {
    path: "/bi/comparison",
    element: BIComparisonPage,
    requiredPermissions: [],
    module: "bi",
    action: "read",
  },
  {
    path: "/bi/reports",
    element: BIReportPage,
    requiredPermissions: [],
    module: "bi",
    action: "read",
  },
  {
    path: "/bi/datasources",
    element: BIDataSourcePage,
    requiredPermissions: [],
    module: "bi",
    action: "read",
  },
  {
    path: "/bi/visualizations",
    element: BIVisualizationPage,
    requiredPermissions: [],
    module: "bi",
    action: "read",
  },
  {
    path: "/bi/module/:moduleId",
    element: BIModuleDetailPage,
    requiredPermissions: [],
    module: "bi",
    action: "read",
  },
];
