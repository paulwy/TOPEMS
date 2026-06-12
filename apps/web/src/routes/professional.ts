import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const Rspage = lazy(() => import("../pages/Rspage"));
const Limspage = lazy(() => import("../pages/Limspage"));
const Qmspage = lazy(() => import("../pages/Qmspage"));
const Ehspage = lazy(() => import("../pages/Ehspage"));
const Srmpage = lazy(() => import("../pages/Srmpage"));
const SupplierDetailPage = lazy(() => import("../pages/SupplierDetailPage"));
const Pdmpage = lazy(() => import("../pages/Pdmpage"));
const Gispage = lazy(() => import("../pages/Gispage"));
const Impage = lazy(() => import("../pages/Impage"));
const MailPage = lazy(() => import("../pages/MailPage"));
const IntegrationPage = lazy(() => import("../pages/IntegrationPage"));
const MobileWorkstationPage = lazy(
  () => import("../pages/MobileWorkstationPage"),
);
const PerformanceMonitorPage = lazy(
  () => import("../pages/PerformanceMonitorPage"),
);
const ExternalErpMappingPage = lazy(
  () => import("../pages/ExternalErpMappingPage"),
);
const ExternalErpConnectionsPage = lazy(
  () => import("../pages/ExternalErpConnectionsPage"),
);

const LimsSampleDetailPage = lazy(
  () => import("../pages/lims/LimsSampleDetailPage"),
);
const LimsTaskDetailPage = lazy(
  () => import("../pages/lims/LimsTaskDetailPage"),
);
const LimsInstrumentMaintenancePage = lazy(
  () => import("../pages/lims/LimsInstrumentMaintenancePage"),
);

const QmsStandardDetailPage = lazy(
  () => import("../pages/qms/QmsStandardDetailPage"),
);
const QmsAuditManagementPage = lazy(
  () => import("../pages/qms/QmsAuditManagementPage"),
);

const EhsHazardDetailPage = lazy(
  () => import("../pages/ehs/EhsHazardDetailPage"),
);
const EhsIncidentReportPage = lazy(
  () => import("../pages/ehs/EhsIncidentReportPage"),
);

export const professionalRoutes: RouteConfig[] = [
  {
    path: "/rs",
    element: Rspage,
    requiredPermissions: [],
    module: "rs",
    action: "read",
  },
  {
    path: "/lims",
    element: Limspage,
    requiredPermissions: [],
    module: "lims",
    action: "read",
  },
  {
    path: "/lims/sample/:id",
    element: LimsSampleDetailPage,
    requiredPermissions: [],
    module: "lims",
    action: "read",
  },
  {
    path: "/lims/task/:id",
    element: LimsTaskDetailPage,
    requiredPermissions: [],
    module: "lims",
    action: "read",
  },
  {
    path: "/lims/instrument/:id",
    element: LimsInstrumentMaintenancePage,
    requiredPermissions: [],
    module: "lims",
    action: "read",
  },
  {
    path: "/qms",
    element: Qmspage,
    requiredPermissions: ["qms:read"],
    module: "qms",
    action: "read",
  },
  {
    path: "/qms/standard/:id",
    element: QmsStandardDetailPage,
    requiredPermissions: ["qms:read"],
    module: "qms",
    action: "read",
  },
  {
    path: "/qms/audit",
    element: QmsAuditManagementPage,
    requiredPermissions: ["qms:read"],
    module: "qms",
    action: "read",
  },
  {
    path: "/ehs",
    element: Ehspage,
    requiredPermissions: ["ehs:read"],
    module: "ehs",
    action: "read",
  },
  {
    path: "/ehs/hazard/:id",
    element: EhsHazardDetailPage,
    requiredPermissions: ["ehs:read"],
    module: "ehs",
    action: "read",
  },
  {
    path: "/ehs/incident",
    element: EhsIncidentReportPage,
    requiredPermissions: ["ehs:read"],
    module: "ehs",
    action: "read",
  },
  {
    path: "/srm",
    element: Srmpage,
    requiredPermissions: ["srm:read"],
    module: "srm",
    action: "read",
  },
  {
    path: "/srm/suppliers/:id",
    element: SupplierDetailPage,
    requiredPermissions: ["srm:read"],
    module: "srm",
    action: "read",
  },
  {
    path: "/pdm",
    element: Pdmpage,
    requiredPermissions: ["pdm:read"],
    module: "pdm",
    action: "read",
  },
  {
    path: "/gis",
    element: Gispage,
    requiredPermissions: ["gis:read"],
    module: "gis",
    action: "read",
  },
  {
    path: "/im",
    element: Impage,
    requiredPermissions: ["im:read"],
    module: "im",
    action: "read",
  },
  {
    path: "/mail",
    element: MailPage,
    requiredPermissions: ["mail:read"],
    module: "mail",
    action: "read",
  },
  {
    path: "/integration/external-erp",
    element: ExternalErpConnectionsPage,
    requiredPermissions: [],
    module: "integration",
    action: "read",
  },
  {
    path: "/integration/external-erp/:connectionId/mappings",
    element: ExternalErpMappingPage,
    requiredPermissions: [],
    module: "integration",
    action: "read",
  },
  {
    path: "/integration",
    element: IntegrationPage,
    requiredPermissions: [],
    module: "integration",
    action: "read",
  },
  {
    path: "/mobile-workstation",
    element: MobileWorkstationPage,
    requiredPermissions: [],
    module: "mobile",
    action: "read",
  },
  {
    path: "/performance",
    element: PerformanceMonitorPage,
    requiredPermissions: [],
    module: "performance",
    action: "read",
  },
];
