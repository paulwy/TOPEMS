import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const MobileSettingsPage = lazy(
  () => import("../pages/mobile/MobileSettingsPage"),
);
const OfflineSyncPage = lazy(() => import("../pages/mobile/OfflineSyncPage"));
const ScanSettingsPage = lazy(() => import("../pages/mobile/ScanSettingsPage"));
const NotificationSettingsPage = lazy(
  () => import("../pages/mobile/NotificationSettingsPage"),
);

export const mobileRoutes: RouteConfig[] = [
  {
    path: "/mobile",
    element: MobileSettingsPage,
    requiredPermissions: [],
    module: "mobile",
    action: "read",
  },
  {
    path: "/mobile/settings",
    element: MobileSettingsPage,
    requiredPermissions: [],
    module: "mobile",
    action: "read",
  },
  {
    path: "/mobile/offline-sync",
    element: OfflineSyncPage,
    requiredPermissions: [],
    module: "mobile",
    action: "read",
  },
  {
    path: "/mobile/scan",
    element: ScanSettingsPage,
    requiredPermissions: [],
    module: "mobile",
    action: "read",
  },
  {
    path: "/mobile/notifications",
    element: NotificationSettingsPage,
    requiredPermissions: [],
    module: "mobile",
    action: "read",
  },
];
