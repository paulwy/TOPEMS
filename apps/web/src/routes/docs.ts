import React, { lazy } from "react";
import type { RouteConfig } from "./utils";

const DocumentsPage = lazy(() => import("../pages/DocumentsPage"));
const DocumentCenterPage = lazy(() => import("../pages/DocumentCenterPage"));
const KnowledgeBasePage = lazy(() => import("../pages/KnowledgeBasePage"));
const TemplateManagementPage = lazy(
  () => import("../pages/TemplateManagementPage"),
);
const HelpCenterPage = lazy(() => import("../pages/HelpCenterPage"));

export const docsRoutes: RouteConfig[] = [
  {
    path: "/documents",
    element: DocumentsPage,
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
