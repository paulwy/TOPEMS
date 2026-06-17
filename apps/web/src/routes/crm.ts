import React from "react";
import { Navigate } from "react-router-dom";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const CRMDashboardPage = lazy(() => import("../pages/crm/CRMDashboardPage"));
const CustomerManagementPage = lazy(
  () => import("../pages/crm/CustomerManagementPage"),
);
const ContactManagementPage = lazy(
  () => import("../pages/crm/ContactManagementPage"),
);
const OpportunityManagementPage = lazy(
  () => import("../pages/crm/OpportunityManagementPage"),
);
const InteractionManagementPage = lazy(
  () => import("../pages/crm/InteractionManagementPage"),
);
const CRMCustomerScoringPage = lazy(
  () => import("../pages/crm/CRMCustomerScoringPage"),
);
const CRMSalesForecastPage = lazy(
  () => import("../pages/crm/CRMSalesForecastPage"),
);
const CRMBillingPage = lazy(() => import("../pages/crm/CRMBillingPage"));
const CustomerDetailPage = lazy(() => import("../pages/crm/CustomerDetailPage"));

export const crmRoutes: RouteConfig[] = [
  {
    path: "/crm",
    element: React.createElement(Navigate, {
      to: "/crm/dashboard",
      replace: true,
    }),
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
    path: "/crm/billing",
    element: CRMBillingPage,
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
