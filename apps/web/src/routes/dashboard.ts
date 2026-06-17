import React, { lazy } from "react";
import type { RouteConfig } from "./utils";

const DashboardPage = lazy(() => import("../pages/shared/DashboardPage"));
const ProfilePage = lazy(() => import("../pages/shared/ProfilePage"));
const AddressbookPage = lazy(() => import("../pages/common/AddressbookPage"));

export const dashboardRoutes: RouteConfig[] = [
  {
    path: "/dashboard",
    element: DashboardPage,
  },
  {
    path: "/profile",
    element: ProfilePage,
  },
  {
    path: "/addressbook",
    element: AddressbookPage,
  },
];
