import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const CRMPage = lazy(() => import("../pages/CRMPage"));
const CRMDashboardPage = lazy(() => import("../pages/CRMDashboardPage"));
const CustomerManagementPage = lazy(
  () => import("../pages/CustomerManagementPage"),
);
const ContactManagementPage = lazy(
  () => import("../pages/ContactManagementPage"),
);
const OpportunityManagementPage = lazy(
  () => import("../pages/OpportunityManagementPage"),
);
const InteractionManagementPage = lazy(
  () => import("../pages/InteractionManagementPage"),
);
const CRMCustomerScoringPage = lazy(
  () => import("../pages/CRMCustomerScoringPage"),
);
const CRMSalesForecastPage = lazy(
  () => import("../pages/CRMSalesForecastPage"),
);
const CustomerDetailPage = lazy(() => import("../pages/CustomerDetailPage"));

export const crmRoutes: RouteConfig[] = [
  {
    path: "/crm",
    element: CRMPage,
    requiredPermissions: ["crm:read"],
    module: "crm",
    action: "read",
  },
  {
    path: "/crm/dashboard",
    element: CRMDashboardPage,
    requiredPermissions: ["crm:read"],
    module: "crm",
    action: "read",
  },
  {
    path: "/crm/customers",
    element: CustomerManagementPage,
    requiredPermissions: ["crm:read"],
    module: "crm",
    action: "read",
  },
  {
    path: "/crm/contacts",
    element: ContactManagementPage,
    requiredPermissions: ["crm:read"],
    module: "crm",
    action: "read",
  },
  {
    path: "/crm/opportunities",
    element: OpportunityManagementPage,
    requiredPermissions: ["crm:read"],
    module: "crm",
    action: "read",
  },
  {
    path: "/crm/interactions",
    element: InteractionManagementPage,
    requiredPermissions: ["crm:read"],
    module: "crm",
    action: "read",
  },
  {
    path: "/crm/scoring",
    element: CRMCustomerScoringPage,
    requiredPermissions: ["crm:read"],
    module: "crm",
    action: "read",
  },
  {
    path: "/crm/forecast",
    element: CRMSalesForecastPage,
    requiredPermissions: ["crm:read"],
    module: "crm",
    action: "read",
  },
  {
    path: "/crm/customers/:id",
    element: CustomerDetailPage,
    requiredPermissions: ["crm:read"],
    module: "crm",
    action: "read",
  },
];
