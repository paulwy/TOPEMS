import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const FinanceDashboardPage = lazy(
  () => import("../pages/finance/DashboardPage"),
);
const FinanceVoucherPage = lazy(
  () => import("../pages/finance/FinanceVoucherPage"),
);
const VoucherDetailPage = lazy(
  () => import("../pages/finance/VoucherDetailPage"),
);
const VoucherCreatePage = lazy(
  () => import("../pages/finance/VoucherCreatePage"),
);
const FinanceLedgerPage = lazy(
  () => import("../pages/finance/FinanceLedgerPage"),
);
const FinanceReceivablePayablePage = lazy(
  () => import("../pages/finance/FinanceReceivablePayablePage"),
);
const FinanceReceiptPage = lazy(
  () => import("../pages/finance/FinanceReceiptPage"),
);
const FinancePaymentPage = lazy(
  () => import("../pages/finance/FinancePaymentPage"),
);
const FinanceInvoicePage = lazy(
  () => import("../pages/finance/FinanceInvoicePage"),
);
const FinanceTaxPage = lazy(() => import("../pages/finance/FinanceTaxPage"));
const FinanceAssetPage = lazy(
  () => import("../pages/finance/FinanceAssetPage"),
);
const FinanceExpensePage = lazy(
  () => import("../pages/finance/FinanceExpensePage"),
);
const FinanceCostPage = lazy(() => import("../pages/finance/FinanceCostPage"));
const FinanceBudgetPage = lazy(
  () => import("../pages/finance/FinanceBudgetPage"),
);
const BudgetManagementPage = lazy(
  () => import("../pages/finance/BudgetManagementPage"),
);
const FinanceBudgetDetailPage = lazy(
  () => import("../pages/finance/FinanceBudgetDetailPage"),
);
const FinanceReportsPage = lazy(
  () => import("../pages/finance/FinanceReportsPage"),
);
const FinancialReportsPage = lazy(
  () => import("../pages/finance/FinancialReportsPage"),
);
const ConsolidationScopePage = lazy(
  () => import("../pages/finance/ConsolidationScopePage"),
);
const ConsolidationReportsPage = lazy(
  () => import("../pages/finance/ConsolidationReportsPage"),
);
const OpeningBalancePage = lazy(
  () => import("../pages/finance/OpeningBalancePage"),
);

export const financeRoutes: RouteConfig[] = [
  {
    path: "/finance",
    element: FinanceDashboardPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/vouchers",
    element: FinanceVoucherPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/voucher/:id",
    element: VoucherDetailPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/voucher/create",
    element: VoucherCreatePage,
    requiredPermissions: ["finance:write"],
    module: "finance",
    action: "write",
  },
  {
    path: "/finance/ledger",
    element: FinanceLedgerPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/receivable",
    element: FinanceReceivablePayablePage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/payable",
    element: FinanceReceivablePayablePage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/receipts",
    element: FinanceReceiptPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/payments",
    element: FinancePaymentPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/invoices",
    element: FinanceInvoicePage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/tax",
    element: FinanceTaxPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/assets",
    element: FinanceAssetPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/expense",
    element: FinanceExpensePage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/cost",
    element: FinanceCostPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/budget",
    element: FinanceBudgetPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/budget-management",
    element: BudgetManagementPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/budget/:id",
    element: FinanceBudgetDetailPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/reports",
    element: FinanceReportsPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/financial-reports",
    element: FinancialReportsPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/consolidation",
    element: ConsolidationScopePage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/consolidation-reports",
    element: ConsolidationReportsPage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
  {
    path: "/finance/opening-balance",
    element: OpeningBalancePage,
    requiredPermissions: ["finance:read"],
    module: "finance",
    action: "read",
  },
];
