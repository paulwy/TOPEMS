import React, { lazy } from "react";
import type { RouteConfig } from "./utils";

const NotificationCenter = lazy(() => import("../pages/NotificationCenter"));
const NotificationTemplatesPage = lazy(
  () => import("../pages/NotificationTemplatesPage"),
);
const NotificationArchivePage = lazy(
  () => import("../pages/NotificationArchivePage"),
);
const NotificationStatsPage = lazy(
  () => import("../pages/NotificationStatsPage"),
);
const NotificationDetailPage = lazy(
  () => import("../pages/NotificationDetailPage"),
);

export const notificationRoutes: RouteConfig[] = [
  {
    path: "/notifications",
    element: NotificationCenter,
    requiredPermissions: [],
    module: "notification",
    action: "read",
  },
  {
    path: "/notifications/templates",
    element: NotificationTemplatesPage,
    requiredPermissions: [],
    module: "notification",
    action: "read",
  },
  {
    path: "/notifications/archive",
    element: NotificationArchivePage,
    requiredPermissions: [],
    module: "notification",
    action: "read",
  },
  {
    path: "/notifications/stats",
    element: NotificationStatsPage,
    requiredPermissions: [],
    module: "notification",
    action: "read",
  },
  {
    path: "/notifications/:id",
    element: NotificationDetailPage,
    requiredPermissions: [],
    module: "notification",
    action: "read",
  },
];
