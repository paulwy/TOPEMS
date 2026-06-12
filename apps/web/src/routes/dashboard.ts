import React, { lazy } from "react";
import type { RouteConfig } from "./utils";

const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const AddressbookPage = lazy(() => import("../pages/AddressbookPage"));

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
