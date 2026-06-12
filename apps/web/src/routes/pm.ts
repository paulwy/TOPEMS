import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const PmDashboardPage = lazy(() => import("../pages/PmDashboardPage"));
const PmProjectListPage = lazy(() => import("../pages/PmProjectListPage"));
const PmProjectDetailPage = lazy(() => import("../pages/PmProjectDetailPage"));
const PmProjectCreatePage = lazy(() => import("../pages/PmProjectCreatePage"));
const PmContractListPage = lazy(() => import("../pages/PmContractListPage"));
const PmContractDetailPage = lazy(
  () => import("../pages/PmContractDetailPage"),
);
const PmContractCreatePage = lazy(
  () => import("../pages/PmContractCreatePage"),
);
const PmTemplatePage = lazy(() => import("../pages/PmTemplatePage"));
const PmReportPage = lazy(() => import("../pages/PmReportPage"));
const ProjectDashboardPage = lazy(
  () => import("../pages/ProjectDashboardPage"),
);

export const pmRoutes: RouteConfig[] = [
  {
    path: "/pm",
    element: PmDashboardPage,
    requiredPermissions: [],
    module: "pm",
    action: "read",
  },
  {
    path: "/pm/projects",
    element: PmProjectListPage,
    requiredPermissions: [],
    module: "pm",
    action: "read",
  },
  {
    path: "/pm/projects/create",
    element: PmProjectCreatePage,
    requiredPermissions: [],
    module: "pm",
    action: "write",
  },
  {
    path: "/pm/projects/:id",
    element: PmProjectDetailPage,
    requiredPermissions: [],
    module: "pm",
    action: "read",
  },
  {
    path: "/pm/projects/:id/edit",
    element: PmProjectCreatePage,
    requiredPermissions: [],
    module: "pm",
    action: "write",
  },
  {
    path: "/pm/contracts",
    element: PmContractListPage,
    requiredPermissions: [],
    module: "pm",
    action: "read",
  },
  {
    path: "/pm/contracts/create",
    element: PmContractCreatePage,
    requiredPermissions: [],
    module: "pm",
    action: "write",
  },
  {
    path: "/pm/contracts/:id",
    element: PmContractDetailPage,
    requiredPermissions: [],
    module: "pm",
    action: "read",
  },
  {
    path: "/pm/dashboard",
    element: ProjectDashboardPage,
    requiredPermissions: [],
    module: "pm",
    action: "read",
  },
  {
    path: "/pm/templates",
    element: PmTemplatePage,
    requiredPermissions: [],
    module: "pm",
    action: "read",
  },
  {
    path: "/pm/reports",
    element: PmReportPage,
    requiredPermissions: [],
    module: "pm",
    action: "read",
  },
  {
    path: "/pm/reports/:projectId",
    element: PmReportPage,
    requiredPermissions: [],
    module: "pm",
    action: "read",
  },
];
