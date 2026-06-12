import React, { lazy } from "react";
import type { RouteConfig } from "./utils";

const UserManagementPage = lazy(() => import("../pages/UserManagementPage"));
const RoleManagementPage = lazy(() => import("../pages/RoleManagementPage"));
const PermissionManagementPage = lazy(
  () => import("../pages/PermissionManagementPage"),
);
const AuditLogPage = lazy(() => import("../pages/AuditLogPage"));
const SystemManagementPage = lazy(
  () => import("../pages/SystemManagementPage"),
);
const DictionaryManagementPage = lazy(
  () => import("../pages/DictionaryManagementPage"),
);
const DatabaseStructurePage = lazy(
  () => import("../pages/DatabaseStructurePage"),
);
const MigrationAdminPage = lazy(() => import("../pages/MigrationAdminPage"));
const ConfigDebugPage = lazy(() => import("../pages/ConfigDebugPage"));

export const iamRoutes: RouteConfig[] = [
  {
    path: "/users",
    element: UserManagementPage,
    requiredPermissions: ["iam:admin"],
    module: "iam",
    action: "admin",
  },
  {
    path: "/roles",
    element: RoleManagementPage,
    requiredPermissions: ["iam:admin"],
    module: "iam",
    action: "admin",
  },
  {
    path: "/permissions",
    element: PermissionManagementPage,
    requiredPermissions: ["iam:admin"],
    module: "iam",
    action: "admin",
  },
  {
    path: "/audit",
    element: AuditLogPage,
    requiredPermissions: ["iam:admin"],
    module: "iam",
    action: "admin",
  },
  {
    path: "/system",
    element: SystemManagementPage,
    requiredPermissions: ["iam:admin"],
    module: "iam",
    action: "admin",
  },
  {
    path: "/dictionaries",
    element: DictionaryManagementPage,
    requiredPermissions: ["iam:admin"],
    module: "iam",
    action: "admin",
  },
  {
    path: "/database",
    element: DatabaseStructurePage,
    requiredPermissions: ["iam:admin"],
    module: "iam",
    action: "admin",
  },
  {
    path: "/migration",
    element: MigrationAdminPage,
    requiredPermissions: ["iam:admin"],
    module: "iam",
    action: "admin",
  },
  {
    path: "/debug",
    element: ConfigDebugPage,
    requiredPermissions: ["iam:admin"],
    module: "iam",
    action: "admin",
  },
];
