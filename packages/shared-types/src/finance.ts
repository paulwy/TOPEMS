import type { FinanceTypes } from './generated/api-types';

// ============================================================================
// OpenAPI 生成类型别名（推广阶段）
// ============================================================================
// 当前策略：保留手写类型作为主类型，生成类型作为参考。
// 手写类型字段更丰富（含业务扩展字段），生成类型字段更精简（仅含后端 Schema）。
//
// 已知差异（替换时需注意）：
// 1. 生成类型字段全可选（openapi-typescript 默认行为）
// 2. 手写 Account 用 category/balance_direction/status/isactive，生成 Account 用 account_type/isEnabled
// 3. 手写 Account 有大量业务扩展字段（dimensions/children/enable_quantity 等），生成类型无
// 4. 手写 Voucher 有 entries/voucher_number/total_amount 等扩展字段，生成类型精简
// 5. 手写 Voucher 字段命名与生成 Voucher 基本一致（voucher_no/voucher_type/voucher_date/status）
export type GeneratedAccount = FinanceTypes.Account;
export type GeneratedVoucher = FinanceTypes.Voucher;
export type GeneratedVoucherLine = FinanceTypes.VoucherLine;
export type GeneratedVoucherResponse = FinanceTypes.VoucherResponse;
export type GeneratedCreateAccountRequest = FinanceTypes.CreateAccountRequest;
export type GeneratedCreateVoucherRequest = FinanceTypes.CreateVoucherRequest;
export type GeneratedVoucherLineRequest = FinanceTypes.VoucherLineRequest;
export type GeneratedLedgerEntry = FinanceTypes.LedgerEntry;
export type GeneratedTrialBalance = FinanceTypes.TrialBalance;
export type GeneratedBalanceSheet = FinanceTypes.BalanceSheet;
export type GeneratedIncomeStatement = FinanceTypes.IncomeStatement;
export type GeneratedCashFlowStatement = FinanceTypes.CashFlowStatement;
export type GeneratedPeriod = FinanceTypes.Period;
export type GeneratedPayment = FinanceTypes.Payment;
export type GeneratedPaymentItem = FinanceTypes.PaymentItem;
export type GeneratedPaymentResponse = FinanceTypes.PaymentResponse;
export type GeneratedCreatePaymentRequest = FinanceTypes.CreatePaymentRequest;
export type GeneratedAuxType = FinanceTypes.AuxType;
export type GeneratedAuxiliaryAccount = FinanceTypes.AuxiliaryAccount;

// ============================================================================
// 适配类型：将生成类型字段重映射到手写命名（任务 2）
// ============================================================================
// 手写 Account 与生成 Account 字段差异较大：
// - isactive（手写） ↔ is_enabled（生成）—— 语义不同但都表示启用状态
// - category（手写 AccountCategory） ↔ account_type（生成 AccountType）—— 枚举值一致，字段名不同
// 由于手写 Account 有大量生成类型没有的业务扩展字段，这里仅做字段名映射演示，
// 完整替换需后端补充更多 Schema 字段（TODO）。

/** 生成类型 Account 的字段重映射：is_enabled → isactive, account_type → category */
export type AdaptedAccount = Omit<FinanceTypes.Account, 'is_enabled' | 'account_type'> & {
  isactive?: FinanceTypes.Account['is_enabled'];
  category?: FinanceTypes.Account['account_type'];
};

// ============================================================================
// 字段适配函数：生成类型实例 → 手写命名实例
// ============================================================================

/**
 * 将生成类型 Account 转换为手写命名的 AdaptedAccount。
 * 字段映射：is_enabled → isactive, account_type → category
 * 注意：手写 Account 还有 balance_direction/status/children 等扩展字段，需在业务层补充。
 */
export const adaptAccountFromGenerated = (
  generated: FinanceTypes.Account
): AdaptedAccount => {
  const { is_enabled, account_type, ...rest } = generated;
  return {
    ...rest,
    isactive: is_enabled,
    category: account_type,
  };
};

// ============================================================================
// 手写类型（当前主类型）
// ============================================================================

export type AccountCategory =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'cost'
  | 'expense'
  | 'income';

export type BalanceDirection = 'debit' | 'credit';

export type AccountingDimension =
  | 'company'
  | 'department'
  | 'project'
  | 'customer'
  | 'supplier'
  | 'employee'
  | 'product'
  | 'bank';

export interface Account {
  id: string;
  code: string;
  name: string;
  name_en?: string;
  full_name?: string;
  category: AccountCategory;
  balance_direction: BalanceDirection;
  type?: string;
  parentId?: string;
  parent_code?: string;
  level: number;
  haschildren: boolean;
  children?: Account[];
  dimensions: AccountingDimension[];
  is_cash_flow: boolean;
  enable_quantity: boolean;
  unit?: string;
  enable_foreign_currency: boolean;
  default_currency?: string;
  status: 'active' | 'disabled';
  isactive?: boolean;
  is_detail?: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  tenant_id: string;
  currency: string;
}

export interface AccountOpeningBalance {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  company_id?: string;
  department_id?: string;
  project_id?: string;
  customer_id?: string;
  supplier_id?: string;
  employee_id?: string;
  debit_balance: number;
  credit_balance: number;
  quantity?: number;
  period: string;
  year: number;
  month: number;
  created_at: string;
  updated_at: string;
}

export interface AccountBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  category: AccountCategory;
  balance_direction: BalanceDirection;
  company_id?: string;
  department_id?: string;
  project_id?: string;
  customer_id?: string;
  supplier_id?: string;
  debit_balance: number;
  credit_balance: number;
  quantity?: number;
  period: string;
  period_debit: number;
  period_credit: number;
  year_debit: number;
  year_credit: number;
}

export type VoucherStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'posted'
  | 'reversed';

export type VoucherType =
  | 'general'
  | 'payment'
  | 'receipt'
  | 'transfer';

export interface VoucherEntry {
  id: string;
  line_no: number;
  line_number?: number;
  account_id: string;
  account_code?: string;
  account_name?: string;
  subject_code: string;
  subject_name: string;
  debit_amount: number;
  credit_amount: number;
  quantity?: number;
  unit_price?: number;
  price?: number;
  unit?: string;
  currency_code?: string;
  exchange_rate?: number;
  foreign_amount?: number;
  company_id?: string;
  company_code?: string;
  company_name?: string;
  department_id?: string;
  department_code?: string;
  department_name?: string;
  project_id?: string;
  project_code?: string;
  project_name?: string;
  customer_id?: string;
  customer_code?: string;
  customer_name?: string;
  supplier_id?: string;
  supplier_code?: string;
  supplier_name?: string;
  employee_id?: string;
  employee_code?: string;
  employee_name?: string;
  bank_account_id?: string;
  bank_account_no?: string;
  bank_name?: string;
  summary?: string;
  voucher_id?: string;
}

export interface Voucher {
  id: string;
  voucher_no: string;
  voucher_number?: string;
  voucher_type: VoucherType;
  period: string;
  year: number;
  month: number;
  voucher_date: string;
  created_at: string;
  total_amount: number;
  total_debit: number;
  total_credit: number;
  currency_code: string;
  entries: VoucherEntry[];
  status: VoucherStatus;
  submitter_id?: string;
  submitter_name?: string;
  maker_id?: string;
  maker_name?: string;
  submitted_at?: string;
  approver_id?: string;
  approver_name?: string;
  checker_id?: string;
  checker_name?: string;
  approved_at?: string;
  poster_id?: string;
  poster_name?: string;
  bookkeeper_id?: string;
  bookkeeper_name?: string;
  posted_at?: string;
  is_reversed: boolean;
  reverse_voucher_id?: string;
  reversed_at?: string;
  attachment_count: number;
  summary?: string;
  source_module?: string;
  source_id?: string;
  created_by?: string;
  updated_by?: string;
  updated_at?: string;
  tenant_id: string;
  description?: string;
  approved_by?: string;
  posted_by?: string;
  template_id?: string;
}

export interface CreateVoucherRequest {
  voucher_type?: VoucherType;
  voucher_date: string;
  period: string;
  summary?: string;
  entries: CreateVoucherEntryRequest[];
  source_module?: string;
  source_id?: string;
}

export interface CreateVoucherEntryRequest {
  account_id?: string;
  account_code?: string;
  account_name?: string;
  subject_code: string;
  subject_name: string;
  debit_amount?: number;
  credit_amount?: number;
  quantity?: number;
  unit_price?: number;
  price?: number;
  unit?: string;
  currency_code?: string;
  exchange_rate?: number;
  foreign_amount?: number;
  company_id?: string;
  department_id?: string;
  project_id?: string;
  customer_id?: string;
  supplier_id?: string;
  employee_id?: string;
  bank_account_id?: string;
  summary?: string;
}

export type CounterpartyType = 'customer' | 'supplier' | 'both';

export interface BankAccount {
  bank_name: string;
  account_number: string;
  account_name: string;
  bank_code?: string;
  is_default: boolean;
}

export interface CounterpartyFinanceInfo {
  id: string;
  counterparty_id: string;
  bank_accounts: BankAccount[];
  tax_number?: string;
  invoice_title?: string;
  invoice_type: 'normal' | 'special';
  credit_limit: number;
  credit_term_days: number;
  payment_terms?: string;
  accounts_receivable: number;
  accounts_payable: number;
  overdue_receivable: number;
  overdue_payable: number;
  total_sales?: number;
  total_purchases?: number;
  total_received?: number;
  total_paid?: number;
  status: 'normal' | 'blocked' | 'inactive';
  block_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  tenant_id?: string;
  code: string;
  name: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  industry?: string;
  business_scope?: string;
  finance_info?: CounterpartyFinanceInfo;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  tenant_id?: string;
  code: string;
  name: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  province?: string;
  city?: string;
  industry?: string;
  finance_info?: CounterpartyFinanceInfo;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus =
  | 'draft'
  | 'approved'
  | 'invoiced'
  | 'partial_received'
  | 'received'
  | 'overdue';

export interface SalesInvoice {
  id: string;
  invoice_no: string;
  customer_id: string;
  customer_code: string;
  customer_name: string;
  opportunity_id?: string;
  project_id?: string;
  contract_id?: string;
  voucher_id?: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  received_amount: number;
  pending_amount: number;
  invoice_date: string;
  due_date: string;
  invoice_type: 'normal' | 'special';
  status: InvoiceStatus;
  overdue_days?: number;
  created_at: string;
  created_by?: string;
}

export interface PurchaseInvoice {
  id: string;
  invoice_no: string;
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  order_id?: string;
  receive_id?: string;
  project_id?: string;
  voucher_id?: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  invoice_date: string;
  due_date: string;
  invoice_type: 'normal' | 'special';
  status: InvoiceStatus;
  overdue_days?: number;
  created_at: string;
  created_by?: string;
}

export interface CollectionRecord {
  id: string;
  collection_no: string;
  customer_id?: string;
  customer_name?: string;
  amount: number;
  collection_date: string;
  invoice_ids?: string[];
  invoice_amounts?: {
    invoice_id: string;
    amount: number;
  }[];
  bank_account_id?: string;
  bank_account_no?: string;
  bank_name?: string;
  voucher_id?: string;
  voucher_no?: string;
  status: 'recorded' | 'matched' | 'cancelled';
  created_at: string;
  created_by?: string;
}

export interface PaymentRecord {
  id: string;
  payment_no: string;
  supplier_id?: string;
  supplier_name?: string;
  amount: number;
  payment_date: string;
  invoice_ids?: string[];
  invoice_amounts?: {
    invoice_id: string;
    amount: number;
  }[];
  bank_account_id?: string;
  bank_account_no?: string;
  bank_name?: string;
  voucher_id?: string;
  voucher_no?: string;
  status: 'recorded' | 'matched' | 'cancelled';
  created_at: string;
  created_by?: string;
}

export interface BalanceSheetItem {
  account_code: string;
  account_name: string;
  amount: number;
  quantity?: number;
  company_id?: string;
  department_id?: string;
  project_id?: string;
}

export interface BalanceSheetSection {
  title: string;
  items: BalanceSheetItem[];
  total: number;
}

export interface BalanceSheet {
  id: string;
  report_no?: string;
  company_id: string;
  company_name: string;
  period: string;
  year: number;
  month: number;
  currency_code: string;
  currency_name: string;
  assets: {
    current: BalanceSheetSection;
    non_current: BalanceSheetSection;
    total: number;
  };
  liabilities: {
    current: BalanceSheetSection;
    non_current: BalanceSheetSection;
    total: number;
  };
  equity: {
    paid_in: BalanceSheetSection;
    reserves: BalanceSheetSection;
    retained_earnings: BalanceSheetSection;
    total: number;
  };
  total_liabilities_equity: number;
  balance_check: boolean;
  prepared_by?: string;
  prepared_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface IncomeStatementItem {
  account_code: string;
  account_name: string;
  amount: number;
  percentage?: number;
}

export interface IncomeStatementSection {
  title: string;
  items: IncomeStatementItem[];
  total: number;
}

export interface IncomeStatement {
  id: string;
  report_no?: string;
  company_id: string;
  company_name: string;
  period: string;
  year: number;
  month: number;
  currency_code: string;
  revenue: {
    main_revenue: IncomeStatementSection;
    other_revenue: IncomeStatementSection;
    total: number;
  };
  cost_of_sales: {
    main_cost: IncomeStatementSection;
    other_cost: IncomeStatementSection;
    total: number;
  };
  gross_profit: number;
  gross_margin: number;
  operating_expenses: {
    selling_expense: IncomeStatementSection;
    administrative_expense: IncomeStatementSection;
    rd_expense: IncomeStatementSection;
    financial_expense: IncomeStatementSection;
    total: number;
  };
  operating_profit: number;
  operating_margin: number;
  non_operating: {
    income: IncomeStatementSection;
    expenses: IncomeStatementSection;
    total: number;
  };
  total_profit: number;
  income_tax: number;
  net_profit: number;
  net_margin: number;
  eps: number;
  prepared_by?: string;
  prepared_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  approved_by?: string;
}

export interface CashFlowItem {
  description: string;
  amount: number;
  detail?: CashFlowItem[];
}

export interface CashFlowSection {
  title: string;
  items: CashFlowItem[];
  total: number;
}

export interface CashFlowStatement {
  id: string;
  report_no?: string;
  company_id: string;
  company_name: string;
  period: string;
  year: number;
  month: number;
  currency_code: string;
  operating: {
    inflows: CashFlowSection;
    outflows: CashFlowSection;
    net_flow: number;
  };
  investing: {
    inflows: CashFlowSection;
    outflows: CashFlowSection;
    net_flow: number;
  };
  financing: {
    inflows: CashFlowSection;
    outflows: CashFlowSection;
    net_flow: number;
  };
  net_cash_flow: number;
  beginning_cash: number;
  ending_cash: number;
  cash_equivalent_change: number;
  prepared_by?: string;
  prepared_at?: string;
  reviewed_by?: string;
  approved_by?: string;
}

export type VoucherTemplateType =
  | 'payroll'
  | 'sales_invoice'
  | 'purchase_invoice'
  | 'collection'
  | 'payment'
  | 'depreciation'
  | 'expense'
  | 'cost_allocation';

export interface VoucherTemplateEntry {
  id: string;
  line_no: number;
  account_rule_type: 'fixed' | 'dynamic';
  account_id?: string;
  account_code?: string;
  account_name?: string;
  account_expression?: string;
  amount_rule_type: 'fixed' | 'field' | 'expression';
  fixed_amount?: number;
  amount_field?: string;
  amount_expression?: string;
  direction_rule_type: 'fixed' | 'expression';
  fixed_direction?: 'debit' | 'credit';
  direction_expression?: string;
  dimension_rules?: {
    dimension: AccountingDimension;
    source_type: 'fixed' | 'field' | 'expression';
    fixed_value?: string;
    field?: string;
    expression?: string;
  }[];
  summary_rule_type: 'fixed' | 'field' | 'expression';
  fixed_summary?: string;
  summary_field?: string;
  summary_expression?: string;
  condition?: string;
}

export interface VoucherTemplate {
  id: string;
  code: string;
  name: string;
  type: VoucherTemplateType;
  description?: string;
  applicable_modules?: string[];
  applicable_companies?: string[];
  condition?: string;
  entries: VoucherTemplateEntry[];
  status: 'active' | 'inactive';
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface VoucherQueryParams {
  voucher_type?: VoucherType | VoucherType[];
  period?: string | string[];
  account_id?: string;
  department_id?: string;
  project_id?: string;
  customer_id?: string;
  supplier_id?: string;
  amount_min?: number;
  amount_max?: number;
}

export interface ReportQueryParams {
  org_id: string;
  period: string;
  year?: number;
  month?: number;
  compare_period?: string;
  currency_code?: string;
  include_detail?: boolean;
}

export interface VoucherOperationResult {
  success: boolean;
  voucher_id?: string;
  voucher_no?: string;
  message?: string;
}