import React, { lazy } from "react";
import type { RouteConfig } from "./utils";

const LoginPage = lazy(() => import("../pages/shared/LoginPage"));

export const authRoutes: RouteConfig[] = [
  {
    path: "/login",
    element: LoginPage,
  },
];
