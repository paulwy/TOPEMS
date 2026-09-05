export type {
  ApiResponse,
  PaginationParams,
  PaginatedResult,
  QueryParams,
  BatchOperationResult,
  AccountCategory,
  BalanceDirection,
  AccountingDimension,
  Account,
  AccountOpeningBalance,
  AccountBalance,
  VoucherStatus,
  VoucherType,
  VoucherEntry,
  Voucher,
  CreateVoucherRequest,
  CreateVoucherEntryRequest,
  CounterpartyType,
  BankAccount,
  CounterpartyFinanceInfo,
  Customer,
  Supplier,
  InvoiceStatus,
  SalesInvoice,
  PurchaseInvoice,
  CollectionRecord,
  PaymentRecord,
  BalanceSheetItem,
  BalanceSheetSection,
  BalanceSheet,
  IncomeStatementItem,
  IncomeStatementSection,
  IncomeStatement,
  CashFlowItem,
  CashFlowSection,
  CashFlowStatement,
  VoucherTemplateType,
  VoucherTemplateEntry,
  VoucherTemplate,
  VoucherQueryParams,
  ReportQueryParams,
  VoucherOperationResult,
} from '@topems/shared-types';

// === B1 API迁移: 从@/api/erp/types.ts迁移的14个类型定义 ===
// 这些类型暂未在 shared-types 中定义，本地声明以保证编译通过
export interface BusinessOverview {
  total_assets: number;
  total_liabilities: number;
  total_revenue: number;
  net_profit: number;
  [key: string]: unknown;
}
export interface ProjectFinancialSummary {
  project_name: string;
  contract_amount: number;
  received_amount: number;
  payable_amount: number;
  paid_amount: number;
  profit: number;
  margin: number;
  status: string;
  [key: string]: unknown;
}
export interface MonthlyTrend {
  month: string;
  profit: number;
  [key: string]: unknown;
}
export interface DepartmentFinancialSummary {
  department_name: string;
  total_expenses: number;
  budget_amount: number;
  budget_usage: number;
  expense_count: number;
  [key: string]: unknown;
}
export interface KeyRatios {
  [key: string]: unknown;
}
export interface AgingAnalysis {
  [key: string]: unknown;
}
export interface CashFlowAnalysis {
  [key: string]: unknown;
}
export interface DepartmentExpense {
  [key: string]: unknown;
}
export interface CategoryExpense {
  [key: string]: unknown;
}
export interface MonthlyExpense {
  [key: string]: unknown;
}
export interface ExpenseAnalysis {
  [key: string]: unknown;
}
export interface MonthlyProfit {
  [key: string]: unknown;
}
export interface ProfitAnalysis {
  [key: string]: unknown;
}
export interface FinancialOverview {
  [key: string]: unknown;
}
