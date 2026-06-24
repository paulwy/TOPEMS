/**
 * Finance 业务 API
 * 包含科目、凭证、应收应付、财务报表、客户/供应商、预算、固定资产、费用报销、发票、票据模板等API
 *
 * 基础路径: /api/finance
 * 通过 @topems/shared-utils 的 createRequest 工厂方法创建 axios 实例
 */

import { createRequest } from '@topems/shared-utils';
import type { PaginatedResponse } from '@topems/shared-types';

// ============================================
// 基础类型（与 web 端 types/finance.ts 保持一致）
// ============================================

export type AccountCategory = 'asset' | 'liability' | 'equity' | 'cost' | 'expense' | 'income';
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
  parent_id?: string;
  parent_code?: string;
  level: number;
  has_children: boolean;
  children?: Account[];
  dimensions: AccountingDimension[];
  is_cash_flow: boolean;
  enable_quantity: boolean;
  unit?: string;
  enable_foreign_currency: boolean;
  default_currency?: string;
  status: 'active' | 'disabled';
  is_active?: boolean;
  is_detail?: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
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

export type VoucherStatus = 'draft' | 'submitted' | 'approved' | 'posted' | 'reversed';
export type VoucherType = 'general' | 'payment' | 'receipt' | 'transfer';

export interface VoucherEntry {
  id: string;
  line_no: number;
  account_id: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  quantity?: number;
  unit_price?: number;
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
  submitted_at?: string;
  approver_id?: string;
  approver_name?: string;
  approved_at?: string;
  poster_id?: string;
  poster_name?: string;
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
}

export interface CreateVoucherEntryRequest {
  account_id: string;
  debit_amount?: number;
  credit_amount?: number;
  quantity?: number;
  unit_price?: number;
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

export interface CreateVoucherRequest {
  voucher_type?: VoucherType;
  voucher_date: string;
  period: string;
  summary?: string;
  entries: CreateVoucherEntryRequest[];
  source_module?: string;
  source_id?: string;
}

export interface Customer {
  id: string;
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
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
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
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface CounterpartyFinanceInfo {
  id: string;
  counterparty_id: string;
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
  customer_id: string;
  customer_name: string;
  amount: number;
  collection_date: string;
  invoice_ids: string[];
  bank_account_id: string;
  bank_account_no: string;
  bank_name: string;
  voucher_id?: string;
  voucher_no?: string;
  status: 'recorded' | 'matched' | 'cancelled';
  created_at: string;
  created_by?: string;
}

export interface PaymentRecord {
  id: string;
  payment_no: string;
  supplier_id: string;
  supplier_name: string;
  amount: number;
  payment_date: string;
  invoice_ids: string[];
  bank_account_id: string;
  bank_account_no: string;
  bank_name: string;
  voucher_id?: string;
  voucher_no?: string;
  status: 'recorded' | 'matched' | 'cancelled';
  created_at: string;
  created_by?: string;
}

export interface BalanceSheetSection {
  title: string;
  items: { account_code: string; account_name: string; amount: number }[];
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
  approved_by?: string;
}

export interface IncomeStatementSection {
  title: string;
  items: { account_code: string; account_name: string; amount: number; percentage?: number }[];
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
  reviewed_by?: string;
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
  operating: { inflows: BalanceSheetSection; outflows: BalanceSheetSection; net_flow: number };
  investing: { inflows: BalanceSheetSection; outflows: BalanceSheetSection; net_flow: number };
  financing: { inflows: BalanceSheetSection; outflows: BalanceSheetSection; net_flow: number };
  net_cash_flow: number;
  beginning_cash: number;
  ending_cash: number;
  cash_equivalent_change: number;
  prepared_by?: string;
  reviewed_by?: string;
}

export interface VoucherTemplate {
  id: string;
  code: string;
  name: string;
  type: string;
  description?: string;
  applicable_modules?: string[];
  applicable_companies?: string[];
  status: 'active' | 'inactive';
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface VoucherQueryParams {
  keyword?: string;
  status?: string | string[];
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
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
  company_id: string;
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

export interface BatchOperationResult {
  total: number;
  success: number;
  failed: number;
  errors: { id: string; error: string }[];
}

// 预算管理
export interface Budget {
  id: string;
  budget_no: string;
  name: string;
  period: string;
  year: number;
  department_id?: string;
  department_name?: string;
  category: AccountCategory;
  account_id?: string;
  account_name?: string;
  budget_amount: number;
  used_amount: number;
  remaining_amount: number;
  status: 'draft' | 'approved' | 'executing' | 'closed';
  created_at: string;
  updated_at: string;
}

// 固定资产
export interface FixedAsset {
  id: string;
  asset_no: string;
  name: string;
  category: string;
  spec?: string;
  unit?: string;
  quantity: number;
  original_value: number;
  net_value: number;
  depreciation_method: 'straight_line' | 'double_declining' | 'sum_of_years';
  useful_life_months: number;
  residual_rate: number;
  purchase_date: string;
  start_depreciation_date: string;
  status: 'in_use' | 'idle' | 'disposed' | 'scrapped';
  location?: string;
  custodian?: string;
  created_at: string;
  updated_at: string;
}

// 费用报销
export interface ExpenseReport {
  id: string;
  report_no: string;
  applicant_id: string;
  applicant_name: string;
  department_id?: string;
  department_name?: string;
  total_amount: number;
  expense_date: string;
  category: string;
  description?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  approver_id?: string;
  approver_name?: string;
  approved_at?: string;
  paid_at?: string;
  voucher_id?: string;
  created_at: string;
  updated_at: string;
}

// 发票
export interface Invoice {
  id: string;
  invoice_no: string;
  invoice_type: 'sales' | 'purchase';
  counterparty_id: string;
  counterparty_name: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  invoice_date: string;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
}

// 票据模板
export interface BillTemplate {
  id: string;
  name: string;
  type: 'receipt' | 'payment' | 'transfer';
  template_content: string;
  fields: string[];
  is_default: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ============================================
// 通用响应包装
// ============================================

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export type ApiResult<T> = ApiEnvelope<T>;

// ============================================
// 创建 request 客户端
// ============================================

const api = createRequest('/api/finance');

function unwrap<T>(promise: Promise<ApiEnvelope<T>>): Promise<T> {
  return promise.then((res) => res.data);
}

function unwrapPaginated<T>(
  promise: Promise<ApiEnvelope<PaginatedResponse<T>>>
): Promise<PaginatedResponse<T>> {
  return promise.then((res) => res.data);
}

// ============================================
// 一、科目管理 API
// ============================================

export const accountApi = {
  list: (params?: {
    category?: AccountCategory;
    parent_id?: string;
    level?: number;
    status?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
  }) => unwrapPaginated<Account>(api.get('/accounts', { params })),

  getTree: (params?: {
    category?: AccountCategory;
    status?: string;
    include_disabled?: boolean;
  }) => unwrap<Account[]>(api.get('/accounts/tree', { params })),

  get: (id: string) => unwrap<Account>(api.get(`/accounts/${id}`)),

  create: (data: Partial<Account>) => unwrap<Account>(api.post('/accounts', data)),

  update: (id: string, data: Partial<Account>) =>
    unwrap<Account>(api.put(`/accounts/${id}`, data)),

  delete: (id: string) => unwrap<void>(api.delete(`/accounts/${id}`)),

  batchCreateChildren: (parentId: string, accounts: Partial<Account>[]) =>
    unwrap<Account[]>(api.post(`/accounts/${parentId}/children-batch`, { accounts })),

  getBalances: (params: {
    account_ids?: string[];
    period: string;
    company_id?: string;
    department_id?: string;
    project_id?: string;
  }) => unwrap<AccountBalance[]>(api.get('/accounts/balances', { params })),

  getOpeningBalances: (params: {
    period: string;
    account_ids?: string[];
    company_id?: string;
  }) => unwrap<AccountOpeningBalance[]>(api.get('/accounts/opening-balances', { params })),

  setOpeningBalance: (accountId: string, data: Partial<AccountOpeningBalance>) =>
    unwrap<AccountOpeningBalance>(api.post(`/accounts/${accountId}/opening-balance`, data)),

  carryForwardOpeningBalance: (params: {
    from_period: string;
    to_period: string;
    company_id?: string;
  }) => unwrap<void>(api.post('/accounts/opening-balance/carry-forward', params)),
};

// ============================================
// 二、凭证管理 API
// ============================================

export const voucherApi = {
  list: (params?: VoucherQueryParams) =>
    unwrapPaginated<Voucher>(api.get('/vouchers', { params })),

  get: (id: string) => unwrap<Voucher>(api.get(`/vouchers/${id}`)),

  getWithEntries: (id: string) => unwrap<Voucher>(api.get(`/vouchers/${id}/entries`)),

  create: (data: CreateVoucherRequest) =>
    unwrap<VoucherOperationResult>(api.post('/vouchers', data)),

  batchCreate: (vouchers: CreateVoucherRequest[]) =>
    unwrap<{ results: VoucherOperationResult[] }>(api.post('/vouchers/batch', { vouchers })),

  update: (id: string, data: Partial<CreateVoucherRequest>) =>
    unwrap<VoucherOperationResult>(api.put(`/vouchers/${id}`, data)),

  delete: (id: string) => unwrap<void>(api.delete(`/vouchers/${id}`)),

  batchDelete: (ids: string[]) =>
    unwrap<BatchOperationResult>(api.post('/vouchers/batch-delete', { ids })),

  submit: (id: string) => unwrap<void>(api.post(`/vouchers/${id}/submit`, {})),

  approve: (id: string) => unwrap<void>(api.post(`/vouchers/${id}/approve`, {})),

  batchApprove: (ids: string[]) =>
    unwrap<BatchOperationResult>(api.post('/vouchers/batch-approve', { ids })),

  unapprove: (id: string) => unwrap<void>(api.post(`/vouchers/${id}/unapprove`, {})),

  post: (id: string) => unwrap<void>(api.post(`/vouchers/${id}/post`, {})),

  batchPost: (ids: string[]) =>
    unwrap<BatchOperationResult>(api.post('/vouchers/batch-post', { ids })),

  reverse: (id: string, reason?: string) =>
    unwrap<VoucherOperationResult>(api.post(`/vouchers/${id}/reverse`, { reason })),

  getNextVoucherNo: (params?: { period?: string; voucher_type?: VoucherType }) =>
    unwrap<{ voucher_no: string }>(api.get('/vouchers/next-no', { params })),

  generateByTemplate: (params: { template_id: string; source_data: Record<string, unknown> }) =>
    unwrap<Voucher>(api.post('/vouchers/generate', params)),

  import: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return unwrap<{ total: number; success: number; failed: number; errors: unknown[] }>(
      api.post('/vouchers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  },
};

// ============================================
// 三、应收应付 API
// ============================================

export const receivablePayableApi = {
  listSalesInvoices: (params?: {
    customer_id?: string;
    status?: string | string[];
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => unwrapPaginated<SalesInvoice>(api.get('/receivables', { params })),

  getSalesInvoice: (id: string) => unwrap<SalesInvoice>(api.get(`/receivables/${id}`)),

  createSalesInvoice: (data: Partial<SalesInvoice>) =>
    unwrap<SalesInvoice>(api.post('/receivables', data)),

  updateSalesInvoice: (id: string, data: Partial<SalesInvoice>) =>
    unwrap<SalesInvoice>(api.put(`/receivables/${id}`, data)),

  deleteSalesInvoice: (id: string) => unwrap<void>(api.delete(`/receivables/${id}`)),

  listPurchaseInvoices: (params?: {
    supplier_id?: string;
    status?: string | string[];
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => unwrapPaginated<PurchaseInvoice>(api.get('/payables', { params })),

  getPurchaseInvoice: (id: string) => unwrap<PurchaseInvoice>(api.get(`/payables/${id}`)),

  createPurchaseInvoice: (data: Partial<PurchaseInvoice>) =>
    unwrap<PurchaseInvoice>(api.post('/payables', data)),

  updatePurchaseInvoice: (id: string, data: Partial<PurchaseInvoice>) =>
    unwrap<PurchaseInvoice>(api.put(`/payables/${id}`, data)),

  deletePurchaseInvoice: (id: string) => unwrap<void>(api.delete(`/payables/${id}`)),

  listCollections: (params?: {
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => unwrapPaginated<CollectionRecord>(api.get('/ar/collections', { params })),

  createCollection: (data: Partial<CollectionRecord>) =>
    unwrap<CollectionRecord>(api.post('/ar/collections', data)),

  listPayments: (params?: {
    supplier_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => unwrapPaginated<PaymentRecord>(api.get('/ap/payments', { params })),

  createPayment: (data: Partial<PaymentRecord>) =>
    unwrap<PaymentRecord>(api.post('/ap/payments', data)),

  reconcile: (params: { type: 'ar' | 'ap'; invoice_id: string; record_ids: string[] }) =>
    unwrap<void>(api.post('/reconcile', params)),

  autoReconcile: (params: { type: 'ar' | 'ap'; entity_id: string; period: string }) =>
    unwrap<{ reconciled: number }>(api.post('/reconcile/auto', params)),

  getReceivableAging: (params: {
    company_id?: string;
    customer_ids?: string[];
    as_of_date: string;
  }) =>
    unwrap<{
      items: {
        customer_id: string;
        customer_name: string;
        total: number;
        current: number;
        over_30: number;
        over_60: number;
        over_90: number;
        over_180: number;
      }[];
      total: number;
    }>(api.get('/ar/aging', { params })),

  getPayableAging: (params: {
    company_id?: string;
    supplier_ids?: string[];
    as_of_date: string;
  }) =>
    unwrap<{
      items: {
        supplier_id: string;
        supplier_name: string;
        total: number;
        current: number;
        over_30: number;
        over_60: number;
        over_90: number;
        over_180: number;
      }[];
      total: number;
    }>(api.get('/ap/aging', { params })),
};

// ============================================
// 四、财务报表 API
// ============================================

export const reportApi = {
  getBalanceSheet: (params: ReportQueryParams) =>
    unwrap<BalanceSheet>(api.get('/reports/balance-sheet', { params })),

  getIncomeStatement: (params: ReportQueryParams) =>
    unwrap<IncomeStatement>(api.get('/reports/income-statement', { params })),

  getCashFlowStatement: (params: ReportQueryParams) =>
    unwrap<CashFlowStatement>(api.get('/reports/cash-flow', { params })),

  getAccountBalanceReport: (params: {
    company_id: string;
    period: string;
    account_ids?: string[];
    level?: number;
    show_zero_balance?: boolean;
  }) =>
    unwrap<{ items: AccountBalance[]; total_records: number }>(
      api.get('/reports/account-balance', { params })
    ),

  getAccountLedger: (params: {
    account_id: string;
    start_period: string;
    end_period: string;
    company_id?: string;
    department_id?: string;
    project_id?: string;
    page?: number;
    page_size?: number;
  }) =>
    unwrapPaginated<{
      date: string;
      voucher_no: string;
      summary: string;
      debit: number;
      credit: number;
      balance: number;
      counterparty?: string;
    }>(api.get('/reports/account-ledger', { params })),

  getDimensionDetail: (params: {
    dimension: string;
    dimension_id: string;
    start_period: string;
    end_period: string;
    company_id?: string;
  }) => unwrap<unknown>(api.get('/reports/dimension-detail', { params })),
};

// ============================================
// 五、凭证模板 API
// ============================================

export const voucherTemplateApi = {
  list: (params?: {
    type?: string;
    applicable_module?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => unwrapPaginated<VoucherTemplate>(api.get('/voucher-templates', { params })),

  get: (id: string) => unwrap<VoucherTemplate>(api.get(`/voucher-templates/${id}`)),

  create: (data: Partial<VoucherTemplate>) => unwrap<VoucherTemplate>(api.post('/voucher-templates', data)),

  update: (id: string, data: Partial<VoucherTemplate>) =>
    unwrap<VoucherTemplate>(api.put(`/voucher-templates/${id}`, data)),

  delete: (id: string) => unwrap<void>(api.delete(`/voucher-templates/${id}`)),

  copy: (id: string, newName: string) =>
    unwrap<VoucherTemplate>(api.post(`/voucher-templates/${id}/copy`, { name: newName })),

  preview: (id: string, sourceData: Record<string, unknown>) =>
    unwrap<Voucher>(api.post(`/voucher-templates/${id}/preview`, { source_data: sourceData })),

  setDefault: (id: string) =>
    unwrap<void>(api.post(`/voucher-templates/${id}/set-default`, {})),
};

// ============================================
// 六、会计期间 API
// ============================================

export const periodApi = {
  getCurrent: () =>
    unwrap<{ period: string; year: number; month: number }>(api.get('/period/current')),

  list: (params?: { year?: number; status?: string }) =>
    unwrap<{
      items: {
        period: string;
        year: number;
        month: number;
        start_date: string;
        end_date: string;
        status: 'open' | 'closed' | 'locked';
      }[];
    }>(api.get('/periods', { params })),

  open: (period: string) => unwrap<void>(api.post('/periods/open', { period })),

  close: (period: string) => unwrap<void>(api.post('/periods/close', { period })),

  closePeriodIncome: (period: string) =>
    unwrap<{ voucher_id: string }>(api.post('/periods/close-income', { period })),

  yearEndClose: (year: number) =>
    unwrap<{ vouchers: { voucher_id: string; description: string }[] }>(
      api.post('/periods/year-end-close', { year })
    ),
};

// ============================================
// 七、客户/供应商（往来单位）API
// ============================================

export const counterpartyApi = {
  getCustomerFinance: (customerId: string) =>
    unwrap<CounterpartyFinanceInfo>(api.get(`/counterparty/customers/${customerId}`)),

  updateCustomerFinance: (customerId: string, data: Partial<CounterpartyFinanceInfo>) =>
    unwrap<CounterpartyFinanceInfo>(api.put(`/counterparty/customers/${customerId}`, data)),

  getSupplierFinance: (supplierId: string) =>
    unwrap<CounterpartyFinanceInfo>(api.get(`/counterparty/suppliers/${supplierId}`)),

  updateSupplierFinance: (supplierId: string, data: Partial<CounterpartyFinanceInfo>) =>
    unwrap<CounterpartyFinanceInfo>(api.put(`/counterparty/suppliers/${supplierId}`, data)),

  listCustomers: (params?: { status?: string; page?: number; page_size?: number }) =>
    unwrapPaginated<Customer>(api.get('/customers', { params })),

  listSuppliers: (params?: { status?: string; page?: number; page_size?: number }) =>
    unwrapPaginated<Supplier>(api.get('/suppliers', { params })),

  getCustomer: (id: string) => unwrap<Customer>(api.get(`/customers/${id}`)),

  createCustomer: (data: Partial<Customer>) => unwrap<Customer>(api.post('/customers', data)),

  updateCustomer: (id: string, data: Partial<Customer>) =>
    unwrap<Customer>(api.put(`/customers/${id}`, data)),

  deleteCustomer: (id: string) => unwrap<void>(api.delete(`/customers/${id}`)),

  getSupplier: (id: string) => unwrap<Supplier>(api.get(`/suppliers/${id}`)),

  createSupplier: (data: Partial<Supplier>) => unwrap<Supplier>(api.post('/suppliers', data)),

  updateSupplier: (id: string, data: Partial<Supplier>) =>
    unwrap<Supplier>(api.put(`/suppliers/${id}`, data)),

  deleteSupplier: (id: string) => unwrap<void>(api.delete(`/suppliers/${id}`)),
};

// ============================================
// 八、预算管理 API
// ============================================

export const budgetApi = {
  list: (params?: {
    period?: string;
    department_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => unwrapPaginated<Budget>(api.get('/budgets', { params })),

  get: (id: string) => unwrap<Budget>(api.get(`/budgets/${id}`)),

  create: (data: Partial<Budget>) => unwrap<Budget>(api.post('/budgets', data)),

  update: (id: string, data: Partial<Budget>) =>
    unwrap<Budget>(api.put(`/budgets/${id}`, data)),

  delete: (id: string) => unwrap<void>(api.delete(`/budgets/${id}`)),

  approve: (id: string) => unwrap<void>(api.post(`/budgets/${id}/approve`, {})),

  getExecution: (id: string) =>
    unwrap<{ budget: Budget; used_amount: number; remaining: number; execution_rate: number }>(
      api.get(`/budgets/${id}/execution`)
    ),
};

// ============================================
// 九、固定资产 API
// ============================================

export const assetApi = {
  list: (params?: {
    category?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => unwrapPaginated<FixedAsset>(api.get('/assets', { params })),

  get: (id: string) => unwrap<FixedAsset>(api.get(`/assets/${id}`)),

  create: (data: Partial<FixedAsset>) => unwrap<FixedAsset>(api.post('/assets', data)),

  update: (id: string, data: Partial<FixedAsset>) =>
    unwrap<FixedAsset>(api.put(`/assets/${id}`, data)),

  delete: (id: string) => unwrap<void>(api.delete(`/assets/${id}`)),

  depreciate: (id: string, params: { period: string }) =>
    unwrap<{ depreciation_amount: number; voucher_id?: string }>(
      api.post(`/assets/${id}/depreciate`, params)
    ),
};

// ============================================
// 十、费用报销 API
// ============================================

export const expenseApi = {
  list: (params?: {
    applicant_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => unwrapPaginated<ExpenseReport>(api.get('/expenses', { params })),

  get: (id: string) => unwrap<ExpenseReport>(api.get(`/expenses/${id}`)),

  create: (data: Partial<ExpenseReport>) => unwrap<ExpenseReport>(api.post('/expenses', data)),

  update: (id: string, data: Partial<ExpenseReport>) =>
    unwrap<ExpenseReport>(api.put(`/expenses/${id}`, data)),

  delete: (id: string) => unwrap<void>(api.delete(`/expenses/${id}`)),

  submit: (id: string) => unwrap<void>(api.post(`/expenses/${id}/submit`, {})),

  approve: (id: string) => unwrap<void>(api.post(`/expenses/${id}/approve`, {})),

  reject: (id: string, reason: string) =>
    unwrap<void>(api.post(`/expenses/${id}/reject`, { reason })),
};

// ============================================
// 十一、发票管理 API
// ============================================

export const invoiceApi = {
  list: (params?: {
    invoice_type?: 'sales' | 'purchase';
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => unwrapPaginated<Invoice>(api.get('/invoices', { params })),

  get: (id: string) => unwrap<Invoice>(api.get(`/invoices/${id}`)),

  create: (data: Partial<Invoice>) => unwrap<Invoice>(api.post('/invoices', data)),

  update: (id: string, data: Partial<Invoice>) =>
    unwrap<Invoice>(api.put(`/invoices/${id}`, data)),

  delete: (id: string) => unwrap<void>(api.delete(`/invoices/${id}`)),
};

// ============================================
// 十二、票据模板 API
// ============================================

export const billTemplateApi = {
  list: (params?: {
    type?: 'receipt' | 'payment' | 'transfer';
    status?: string;
    page?: number;
    page_size?: number;
  }) => unwrapPaginated<BillTemplate>(api.get('/bill-templates', { params })),

  get: (id: string) => unwrap<BillTemplate>(api.get(`/bill-templates/${id}`)),

  create: (data: Partial<BillTemplate>) => unwrap<BillTemplate>(api.post('/bill-templates', data)),

  update: (id: string, data: Partial<BillTemplate>) =>
    unwrap<BillTemplate>(api.put(`/bill-templates/${id}`, data)),

  delete: (id: string) => unwrap<void>(api.delete(`/bill-templates/${id}`)),

  setDefault: (id: string) => unwrap<void>(api.post(`/bill-templates/${id}/set-default`, {})),
};

// ============================================
// 十三、税务管理 API
// ============================================

export const taxApi = {
  listDeclarations: (params?: {
    period?: string;
    tax_type?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) =>
    unwrapPaginated<{
      id: string;
      declaration_no: string;
      tax_type: string;
      period: string;
      amount: number;
      status: string;
      submitted_at?: string;
    }>(api.get('/tax/declarations', { params })),

  submitDeclaration: (data: { period: string; tax_type: string; amount: number }) =>
    unwrap<{ id: string }>(api.post('/tax/declarations', data)),

  calculateTax: (params: { period: string; tax_type: string }) =>
    unwrap<{ amount: number; details: unknown[] }>(api.get('/tax/calculate', { params })),
};

// ============================================
// 十四、成本管理 API
// ============================================

export const costApi = {
  list: (params?: {
    period?: string;
    product_id?: string;
    page?: number;
    page_size?: number;
  }) =>
    unwrapPaginated<{
      id: string;
      period: string;
      product_id: string;
      product_name: string;
      total_cost: number;
      unit_cost: number;
    }>(api.get('/costs', { params })),

  get: (id: string) =>
    unwrap<{
      id: string;
      period: string;
      product_id: string;
      product_name: string;
      total_cost: number;
      unit_cost: number;
      details: unknown[];
    }>(api.get(`/costs/${id}`)),

  calculate: (params: { period: string; product_ids?: string[] }) =>
    unwrap<{ calculated: number }>(api.post('/costs/calculate', params)),
};

// ============================================
// 统一导出
// ============================================

export const financeApi = {
  account: accountApi,
  voucher: voucherApi,
  receivablePayable: receivablePayableApi,
  report: reportApi,
  voucherTemplate: voucherTemplateApi,
  period: periodApi,
  counterparty: counterpartyApi,
  budget: budgetApi,
  asset: assetApi,
  expense: expenseApi,
  invoice: invoiceApi,
  billTemplate: billTemplateApi,
  tax: taxApi,
  cost: costApi,
};

export default financeApi;
