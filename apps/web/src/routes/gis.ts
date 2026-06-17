import React, { lazy } from "react";
import type { RouteConfig } from "./utils";

const GisMapPage = lazy(() => import("../pages/gis/index"));

export const gisRoutes: RouteConfig[] = [
  {
    path: "/gis",
    element: GisMapPage,
  },
  {
    path: "/gis/map",
    element: GisMapPage,
  },
];
