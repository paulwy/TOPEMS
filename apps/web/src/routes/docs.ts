import React, { lazy } from "react";
import type { RouteConfig } from "./utils";

const DocumentsPage = lazy(() => import("../pages/common/DocumentsPage"));
const DocumentsDashboardPage = lazy(() => import("../pages/common/DashboardPage"));
const DocumentCenterPage = lazy(() => import("../pages/common/DocumentCenterPage"));
const KnowledgeBasePage = lazy(() => import("../pages/common/KnowledgeBasePage"));
const TemplateManagementPage = lazy(
  () => import("../pages/templates/TemplateManagementPage"),
);
const HelpCenterPage = lazy(() => import("../pages/shared/HelpCenterPage"));

export const docsRoutes: RouteConfig[] = [
  {
    path: "/documents",
    element: DocumentsDashboardPage,
    requiredPermissions: ["doc:read"],
    module: "doc",
    action: "read",
  },
  {
    path: "/document-center",
    element: DocumentCenterPage,
    requiredPermissions: ["doc:read"],
    module: "doc",
    action: "read",
  },
  {
    path: "/knowledge-base",
    element: KnowledgeBasePage,
    requiredPermissions: ["ai:read"],
    module: "ai",
    action: "read",
  },
  {
    path: "/templates",
    element: TemplateManagementPage,
    requiredPermissions: ["doc:admin"],
    module: "doc",
    action: "admin",
  },
  {
    path: "/help",
    element: HelpCenterPage,
    requiredPermissions: [],
    module: "help",
    action: "read",
  },
];
