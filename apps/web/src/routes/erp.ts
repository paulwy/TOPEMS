import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const AssetManagementPage = lazy(() => import("../pages/AssetManagementPage"));
const EquipmentManagementPage = lazy(
  () => import("../pages/EquipmentManagementPage"),
);
const FinanceExpensePage = lazy(() => import("../pages/FinanceExpensePage"));
const FinanceVoucherPage = lazy(() => import("../pages/FinanceVoucherPage"));
const FinanceReceivablePayablePage = lazy(
  () => import("../pages/FinanceReceivablePayablePage"),
);
const FinanceReportsPage = lazy(() => import("../pages/FinanceReportsPage"));
const FinanceBudgetPage = lazy(() => import("../pages/FinanceBudgetPage"));
const AdministrationPage = lazy(() => import("../pages/AdministrationPage"));
const BudgetManagementPage = lazy(
  () => import("../pages/BudgetManagementPage"),
);
const OfficeSuppliesManagementPage = lazy(
  () => import("../pages/OfficeSuppliesManagementPage"),
);
const MeetingRoomManagementPage = lazy(
  () => import("../pages/MeetingRoomManagementPage"),
);
const VehicleManagementPage = lazy(
  () => import("../pages/VehicleManagementPage"),
);
const AnnouncementManagementPage = lazy(
  () => import("../pages/AnnouncementManagementPage"),
);
const VoucherTemplatePage = lazy(() => import("../pages/VoucherTemplatePage"));
const FinancialReportsPage = lazy(
  () => import("../pages/FinancialReportsPage"),
);
const AccountManagementPage = lazy(
  () => import("../pages/AccountManagementPage"),
);
const BankAccountManagementPage = lazy(
  () => import("../pages/BankAccountManagementPage"),
);
const FixedAssetManagementPage = lazy(
  () => import("../pages/FixedAssetManagementPage"),
);
const ConsolidationScopePage = lazy(
  () => import("../pages/ConsolidationScopePage"),
);
const ConsolidationReportsPage = lazy(
  () => import("../pages/ConsolidationReportsPage"),
);
const CompanyStructurePage = lazy(
  () => import("../pages/CompanyStructurePage"),
);
const OpeningBalancePage = lazy(() => import("../pages/OpeningBalancePage"));

export const erpRoutes: RouteConfig[] = [
  {
    path: "/assets",
    element: React.createElement(AssetManagementPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/equipment",
    element: React.createElement(EquipmentManagementPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance",
    element: React.createElement(FinanceExpensePage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/vouchers",
    element: React.createElement(FinanceVoucherPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/receivable-payable",
    element: React.createElement(FinanceReceivablePayablePage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/reports",
    element: React.createElement(FinanceReportsPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/budget",
    element: React.createElement(FinanceBudgetPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/administration",
    element: React.createElement(AdministrationPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/budget",
    element: React.createElement(BudgetManagementPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/office-supplies",
    element: React.createElement(OfficeSuppliesManagementPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/meeting-rooms",
    element: React.createElement(MeetingRoomManagementPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/vehicles",
    element: React.createElement(VehicleManagementPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/announcements",
    element: React.createElement(AnnouncementManagementPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/voucher-templates",
    element: React.createElement(VoucherTemplatePage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/financial-reports",
    element: React.createElement(FinancialReportsPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/accounts",
    element: React.createElement(AccountManagementPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/bank-accounts",
    element: React.createElement(BankAccountManagementPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/fixed-assets",
    element: React.createElement(FixedAssetManagementPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/consolidation/scopes",
    element: React.createElement(ConsolidationScopePage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/consolidation/reports",
    element: React.createElement(ConsolidationReportsPage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/company-structure",
    element: React.createElement(CompanyStructurePage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/opening-balances",
    element: React.createElement(OpeningBalancePage),
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
];
