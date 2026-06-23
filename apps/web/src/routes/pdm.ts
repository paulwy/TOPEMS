import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const PdmStatsPage = lazy(() => import("../pages/pdm/PdmStatsPage"));
const PdmFormulaPage = lazy(() => import("../pages/pdm/PdmFormulaPage"));
const PdmProcessPage = lazy(() => import("../pages/pdm/PdmProcessPage"));
const PdmBatchPage = lazy(() => import("../pages/pdm/PdmBatchPage"));
const PdmStepPage = lazy(() => import("../pages/pdm/PdmStepPage"));
const PdmBomPage = lazy(() => import("../pages/pdm/PdmBomPage"));
const PdmVersionPage = lazy(() => import("../pages/pdm/PdmVersionPage"));
const PdmProductConfigPage = lazy(() => import("../pages/pdm/PdmProductConfigPage"));

export const pdmRoutes: RouteConfig[] = [
  {
    path: "/pdm",
    element: PdmStatsPage,
    requiredPermissions: [],
    module: "pdm",
    action: "read",
  },
  {
    path: "/pdm/stats",
    element: PdmStatsPage,
    requiredPermissions: [],
    module: "pdm",
    action: "read",
  },
  {
    path: "/pdm/formula",
    element: PdmFormulaPage,
    requiredPermissions: [],
    module: "pdm",
    action: "read",
  },
  {
    path: "/pdm/process",
    element: PdmProcessPage,
    requiredPermissions: [],
    module: "pdm",
    action: "read",
  },
  {
    path: "/pdm/batch",
    element: PdmBatchPage,
    requiredPermissions: [],
    module: "pdm",
    action: "read",
  },
  {
    path: "/pdm/step",
    element: PdmStepPage,
    requiredPermissions: [],
    module: "pdm",
    action: "read",
  },
  {
    path: "/pdm/bom",
    element: PdmBomPage,
    requiredPermissions: [],
    module: "pdm",
    action: "read",
  },
  {
    path: "/pdm/version",
    element: PdmVersionPage,
    requiredPermissions: [],
    module: "pdm",
    action: "read",
  },
  {
    path: "/pdm/product-config",
    element: PdmProductConfigPage,
    requiredPermissions: [],
    module: "pdm",
    action: "read",
  },
];