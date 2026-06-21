import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const AssetManagementPage = lazy(
  () => import("../pages/fixed/AssetManagementPage"),
);
const EquipmentManagementPage = lazy(
  () => import("../pages/fixed/EquipmentManagementPage"),
);
const EquipmentInspectionPage = lazy(
  () => import("../pages/fixed/EquipmentInspectionPage"),
);
const EquipmentMaintenancePage = lazy(
  () => import("../pages/fixed/EquipmentMaintenancePage"),
);
const EquipmentDetailPage = lazy(
  () => import("../pages/equipment/EquipmentDetailPage"),
);
const FinanceExpensePage = lazy(
  () => import("../pages/finance/FinanceExpensePage"),
);
const FinanceVoucherPage = lazy(
  () => import("../pages/finance/FinanceVoucherPage"),
);
const FinanceReceivablePayablePage = lazy(
  () => import("../pages/finance/FinanceReceivablePayablePage"),
);
const FinanceReportsPage = lazy(
  () => import("../pages/finance/FinanceReportsPage"),
);
const FinanceBudgetPage = lazy(
  () => import("../pages/finance/FinanceBudgetPage"),
);
const AdministrationPage = lazy(
  () => import("../pages/admin/AdministrationPage"),
);
const BudgetManagementPage = lazy(
  () => import("../pages/finance/BudgetManagementPage"),
);
const OfficeSuppliesManagementPage = lazy(
  () => import("../pages/fixed/OfficeSuppliesManagementPage"),
);
const MeetingRoomManagementPage = lazy(
  () => import("../pages/common/MeetingRoomManagementPage"),
);
const VehicleManagementPage = lazy(
  () => import("../pages/fixed/VehicleManagementPage"),
);
const AnnouncementManagementPage = lazy(
  () => import("../pages/common/AnnouncementManagementPage"),
);
const VoucherTemplatePage = lazy(
  () => import("../pages/fixed/VoucherTemplatePage"),
);
const FinancialReportsPage = lazy(
  () => import("../pages/finance/FinancialReportsPage"),
);
const AccountManagementPage = lazy(
  () => import("../pages/admin/AccountManagementPage"),
);
const BankAccountManagementPage = lazy(
  () => import("../pages/admin/BankAccountManagementPage"),
);
const FixedAssetManagementPage = lazy(
  () => import("../pages/fixed/FixedAssetManagementPage"),
);
const ConsolidationScopePage = lazy(
  () => import("../pages/finance/ConsolidationScopePage"),
);
const ConsolidationReportsPage = lazy(
  () => import("../pages/finance/ConsolidationReportsPage"),
);
const CompanyStructurePage = lazy(
  () => import("../pages/admin/CompanyStructurePage"),
);
const OpeningBalancePage = lazy(
  () => import("../pages/finance/OpeningBalancePage"),
);

const ERPHomePage = lazy(() => import("../pages/erp/DashboardPage"));
export const erpRoutes: RouteConfig[] = [
  {
    path: "/erp",
    element: ERPHomePage,
    requiredPermissions: ["erp:read"],
    module: "erp",
    action: "read",
  },
  {
    path: "/assets",
    element: AssetManagementPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/equipment",
    element: EquipmentManagementPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/equipment/inspections",
    element: EquipmentInspectionPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/equipment/maintenances",
    element: EquipmentMaintenancePage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/equipment/:id",
    element: EquipmentDetailPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance",
    element: FinanceExpensePage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/vouchers",
    element: FinanceVoucherPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/receivable-payable",
    element: FinanceReceivablePayablePage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/reports",
    element: FinanceReportsPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/budget",
    element: FinanceBudgetPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/administration",
    element: AdministrationPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/budget",
    element: BudgetManagementPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/office-supplies",
    element: OfficeSuppliesManagementPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/meeting-rooms",
    element: MeetingRoomManagementPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/vehicles",
    element: VehicleManagementPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/announcements",
    element: AnnouncementManagementPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/voucher-templates",
    element: VoucherTemplatePage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/financial-reports",
    element: FinancialReportsPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/accounts",
    element: AccountManagementPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/bank-accounts",
    element: BankAccountManagementPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/fixed-assets",
    element: FixedAssetManagementPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/consolidation/scopes",
    element: ConsolidationScopePage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/consolidation/reports",
    element: ConsolidationReportsPage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/company-structure",
    element: CompanyStructurePage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
  {
    path: "/finance/opening-balances",
    element: OpeningBalancePage,
    requiredPermissions: ["erp:admin"],
    module: "erp",
    action: "admin",
  },
];
