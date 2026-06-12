import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

// RS 研发管理页面组件
const RsDashboardPage = lazy(() => import("../pages/rs/RsDashboardPage"));
const RsProjectListPage = lazy(() => import("../pages/rs/RsProjectListPage"));
const RsProjectDetailPage = lazy(
  () => import("../pages/rs/RsProjectDetailPage"),
);
const RsProjectCreatePage = lazy(
  () => import("../pages/rs/RsProjectCreatePage"),
);
const RsExperimentListPage = lazy(
  () => import("../pages/rs/RsExperimentListPage"),
);
const RsExperimentDetailPage = lazy(
  () => import("../pages/rs/RsExperimentDetailPage"),
);
const RsExperimentCreatePage = lazy(
  () => import("../pages/rs/RsExperimentCreatePage"),
);
const RsFormulaListPage = lazy(() => import("../pages/rs/RsFormulaListPage"));
const RsFormulaDetailPage = lazy(
  () => import("../pages/rs/RsFormulaDetailPage"),
);
const RsFormulaCreatePage = lazy(
  () => import("../pages/rs/RsFormulaCreatePage"),
);
const RsMaterialListPage = lazy(() => import("../pages/rs/RsMaterialListPage"));
const RsReportPage = lazy(() => import("../pages/rs/RsReportPage"));

export const rsRoutes: RouteConfig[] = [
  // RS 仪表盘
  {
    path: "/rs",
    element: React.createElement(RsDashboardPage),
    requiredPermissions: [],
    module: "rs",
    action: "read",
  },
  // 项目管理
  {
    path: "/rs/projects",
    element: React.createElement(RsProjectListPage),
    requiredPermissions: [],
    module: "rs",
    action: "read",
  },
  {
    path: "/rs/projects/create",
    element: React.createElement(RsProjectCreatePage),
    requiredPermissions: [],
    module: "rs",
    action: "write",
  },
  {
    path: "/rs/projects/:id",
    element: React.createElement(RsProjectDetailPage),
    requiredPermissions: [],
    module: "rs",
    action: "read",
  },
  {
    path: "/rs/projects/:id/edit",
    element: React.createElement(RsProjectCreatePage),
    requiredPermissions: [],
    module: "rs",
    action: "write",
  },
  // 试验管理
  {
    path: "/rs/experiments",
    element: React.createElement(RsExperimentListPage),
    requiredPermissions: [],
    module: "rs",
    action: "read",
  },
  {
    path: "/rs/experiments/create",
    element: React.createElement(RsExperimentCreatePage),
    requiredPermissions: [],
    module: "rs",
    action: "write",
  },
  {
    path: "/rs/experiments/:id",
    element: React.createElement(RsExperimentDetailPage),
    requiredPermissions: [],
    module: "rs",
    action: "read",
  },
  {
    path: "/rs/experiments/:id/edit",
    element: React.createElement(RsExperimentCreatePage),
    requiredPermissions: [],
    module: "rs",
    action: "write",
  },
  // 配方管理
  {
    path: "/rs/formulas",
    element: React.createElement(RsFormulaListPage),
    requiredPermissions: [],
    module: "rs",
    action: "read",
  },
  {
    path: "/rs/formulas/create",
    element: React.createElement(RsFormulaCreatePage),
    requiredPermissions: [],
    module: "rs",
    action: "write",
  },
  {
    path: "/rs/formulas/:id",
    element: React.createElement(RsFormulaDetailPage),
    requiredPermissions: [],
    module: "rs",
    action: "read",
  },
  {
    path: "/rs/formulas/:id/edit",
    element: React.createElement(RsFormulaCreatePage),
    requiredPermissions: [],
    module: "rs",
    action: "write",
  },
  // 物料管理
  {
    path: "/rs/materials",
    element: React.createElement(RsMaterialListPage),
    requiredPermissions: [],
    module: "rs",
    action: "read",
  },
  // 报表分析
  {
    path: "/rs/reports",
    element: React.createElement(RsReportPage),
    requiredPermissions: [],
    module: "rs",
    action: "read",
  },
];
