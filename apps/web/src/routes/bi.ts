import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const BIDashboardPage = lazy(() => import("../pages/bi/BIDashboardPage"));
const BIAnalyticsPage = lazy(() => import("../pages/bi/BIAnalyticsPage"));
const BIComparisonPage = lazy(() => import("../pages/bi/BIComparisonPage"));
const BIReportPage = lazy(() => import("../pages/bi/BIReportPage"));
const BIDataSourcePage = lazy(() => import("../pages/bi/BIDataSourcePage"));
const BIVisualizationPage = lazy(
  () => import("../pages/bi/BIVisualizationPage"),
);
const BIModuleDetailPage = lazy(() => import("../pages/bi/BIModuleDetailPage"));

export const biRoutes: RouteConfig[] = [
  {
    path: "/bi",
    element: BIDashboardPage,
    requiredPermissions: [],
    module: "bi",
    action: "read",
  },
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
