import apiClient from "./client";
import type { ApiResponse } from "./client";

export interface Asset {
  id: string;
  asset_number: string;
  name: string;
  category?: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
  purchase_amount?: number;
  location?: string;
  responsible_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
  // 设备专用字段
  serial_number?: string;
  manufacturer?: string;
  rated_power?: number;
  rated_voltage?: number;
  rated_current?: number;
  specifications?: any;
  image_url?: string;
  department?: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  applicant_name?: string;
  department_id?: string;
  expense_type: string;
  amount: number;
  description?: string;
  expense_date?: string;
  receipt_count?: number;
  status: string;
  approver_id?: string;
  approved_at?: string;
  reimbursed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  department_id?: string;
  budget_type?: string;
  fiscal_year?: string;
  total_budget: number;
  used_amount?: number;
  remaining_amount?: number;
  usage_rate?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Receivable {
  id: string;
  invoice_number: string;
  customer_name?: string;
  supplier_name?: string;
  project_name?: string;
  category?: string;
  amount: number;
  invoice_date?: string;
  due_date?: string;
  status: string;
  received_amount?: number;
  paid_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface Payable {
  id: string;
  invoice_number: string;
  supplier_name?: string;
  category?: string;
  amount: number;
  invoice_date?: string;
  due_date?: string;
  status: string;
  paid_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface AccountingSubject {
  id: string;
  code: string;
  name: string;
  category?: string;
  level: number;
  parent_code?: string;
  description?: string;
  is_cash_flow: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialVoucher {
  id: string;
  voucher_number: string;
  voucher_date: string;
  period: string;
  attachment_count?: number;
  summary?: string;
  maker_id?: string;
  maker_name?: string;
  checker_id?: string;
  checker_name?: string;
  bookkeeper_id?: string;
  bookkeeper_name?: string;
  status: string;
  total_debit: number;
  total_credit: number;
  source_system?: string;
  source_id?: string;
  project_id?: string;
  contract_id?: string;
  created_at: string;
  updated_at: string;
}

export interface VoucherItem {
  id: string;
  voucher_id: string;
  line_number: number;
  subject_code: string;
  subject_name: string;
  summary?: string;
  debit_amount: number;
  credit_amount: number;
  quantity?: number;
  unit?: string;
  price?: number;
  department_id?: string;
  project_id?: string;
  contract_id?: string;
  created_at: string;
  updated_at: string;
}

export interface VoucherItemRequest {
  line_number: number;
  subject_code: string;
  subject_name?: string;
  summary?: string;
  debit_amount: number;
  credit_amount: number;
  quantity?: number;
  unit?: string;
  price?: number;
  department_id?: string;
  project_id?: string;
  contract_id?: string;
}

export interface CreateFinancialVoucherRequest {
  voucher_number: string;
  voucher_date: string;
  period: string;
  attachment_count?: number;
  summary?: string;
  maker_id?: string;
  maker_name?: string;
  project_id?: string;
  contract_id?: string;
  items: VoucherItemRequest[];
}

export interface VoucherImportResult {
  success_count: number;
  failed_count: number;
  errors: string[];
  imported_vouchers: FinancialVoucher[];
}

export interface BalanceItem {
  code: string;
  name: string;
  amount: number;
  percentage: number;
}

export interface BalanceSheet {
  assets: BalanceItem[];
  liabilities: BalanceItem[];
  equity: BalanceItem[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  period: string;
}

export interface IncomeItem {
  code: string;
  name: string;
  amount: number;
  percentage: number;
}

export interface IncomeStatement {
  revenues: IncomeItem[];
  expenses: IncomeItem[];
  gross_profit: number;
  operating_profit: number;
  net_profit: number;
  period: string;
}

export interface CashFlowItem {
  code: string;
  name: string;
  amount: number;
}

export interface CashFlowStatement {
  operating_activities: CashFlowItem[];
  investing_activities: CashFlowItem[];
  financing_activities: CashFlowItem[];
  net_cash_flow: number;
  period: string;
}

export interface ProjectFinancialSummary {
  project_id: string;
  project_name: string;
  contract_amount: number;
  received_amount: number;
  payable_amount: number;
  paid_amount: number;
  profit: number;
  margin: number;
  status: string;
}

export interface KeyRatios {
  current_ratio: number;
  debt_ratio: number;
  return_on_equity: number;
  profit_margin: number;
  return_on_assets: number;
  earnings_per_share: number;
}

export interface BusinessOverview {
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  cash_flow: number;
  period: string;
  key_ratios: KeyRatios;
  receivable_turnover: number;
  inventory_turnover: number;
  asset_turnover: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  cash_flow: number;
  profit_margin: number;
}

export interface DepartmentFinancialSummary {
  department_id?: string;
  department_name: string;
  total_expenses: number;
  budget_amount: number;
  budget_usage: number;
  expense_count: number;
}

export interface AgingAnalysis {
  category: string;
  days_0_30: number;
  days_31_60: number;
  days_61_90: number;
  days_91_180: number;
  days_181: number;
  total: number;
}

export interface CashFlowAnalysis {
  period: string;
  operating_cash_flow: number;
  investing_cash_flow: number;
  financing_cash_flow: number;
  net_cash_flow: number;
  cash_flow_ratio: number;
  operating_cash_flow_to_revenue: number;
}

export interface ExpenseAnalysis {
  period: string;
  total_expenses: number;
  department_expenses: DepartmentExpense[];
  category_expenses: CategoryExpense[];
  monthly_trend: MonthlyExpense[];
}

export interface DepartmentExpense {
  department_id?: string;
  department_name: string;
  amount: number;
  percentage: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyExpense {
  month: string;
  amount: number;
  growth_rate: number;
}

export interface ProfitAnalysis {
  period: string;
  gross_profit: number;
  operating_profit: number;
  net_profit: number;
  gross_margin: number;
  operating_margin: number;
  net_margin: number;
  profit_trend: MonthlyProfit[];
}

export interface MonthlyProfit {
  month: string;
  gross_profit: number;
  operating_profit: number;
  net_profit: number;
}

export interface FinancialOverview {
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  operating_cash_flow: number;
  key_ratios: KeyRatios;
  profit_margin: number;
  return_on_assets: number;
  return_on_equity: number;
  debt_ratio: number;
  current_ratio: number;
}

export interface OfficeSupply {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  price?: number;
  location?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  location?: string;
  facilities?: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingBooking {
  id: string;
  room_id: string;
  room_name: string;
  title: string;
  organizer: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  brand?: string;
  model?: string;
  vehicle_type?: string;
  status: string;
  driver?: string;
  last_service?: string;
  mileage?: number;
  fuel_type?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleRequest {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  requester: string;
  purpose: string;
  start_time: string;
  end_time: string;
  driver_required: boolean;
  status: string;
  approved_by?: string;
  approved_at?: string;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface OpeningBalance {
  id: string;
  company_id: string;
  subject_code: string;
  subject_name: string;
  period: string;
  debit_balance: number;
  credit_balance: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOpeningBalanceRequest {
  company_id: string;
  subject_code: string;
  subject_name: string;
  period: string;
  debit_balance: number;
  credit_balance: number;
}

export interface CarryForwardRequest {
  from_period: string;
  to_period: string;
}

export interface FixedAsset {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  asset_category?: string;
  purchase_date: string;
  original_value: number;
  accumulated_depreciation: number;
  net_value: number;
  depreciation_method: string;
  expected_life: number;
  salvage_value: number;
  monthly_depreciation: number;
  location?: string;
  responsible_id?: string;
  department_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DepreciateRequest {
  period: string;
  asset_ids?: string[];
}

export interface DepreciationResult {
  depreciated_count: number;
  errors: string[];
  period: string;
}

export interface BankAccount {
  id: string;
  company_id: string;
  bank_name: string;
  branch_name?: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  account_id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description?: string;
  counterparty_account?: string;
  counterparty_name?: string;
  voucher_id?: string;
  created_at: string;
}

export interface CreateBankTransactionRequest {
  account_id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  description?: string;
  counterparty_account?: string;
  counterparty_name?: string;
  voucher_id?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content?: string;
  author: string;
  status: string;
  priority?: string;
  publish_at?: string;
  expire_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

function cleanEmptyUuids<T extends Record<string, any>>(data: T): T {
  const result = { ...data };
  if (result.parent_id === "") delete (result as any).parent_id;
  if (result.company_id === "") delete (result as any).company_id;
  if (result.department_id === "") delete (result as any).department_id;
  if (result.responsible_id === "") delete (result as any).responsible_id;
  return result;
}

export const assetApi = {
  async list(
    params?: PaginationParams,
  ): Promise<ApiResponse<PaginatedResult<Asset>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/assets${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<Asset>> {
    return apiClient.erp.get(`/api/erp/assets/${id}`);
  },

  async create(data: Partial<Asset>): Promise<ApiResponse<Asset>> {
    return apiClient.erp.post("/api/erp/assets", cleanEmptyUuids(data));
  },

  async update(id: string, data: Partial<Asset>): Promise<ApiResponse<Asset>> {
    return apiClient.erp.put(`/api/erp/assets/${id}`, cleanEmptyUuids(data));
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/assets/${id}`);
  },
};

export const erpApi = {
  async health(): Promise<ApiResponse<string>> {
    return apiClient.erp.get<string>("/health");
  },
};

export const expenseApi = {
  async list(
    params?: PaginationParams,
  ): Promise<ApiResponse<PaginatedResult<Expense>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/expenses${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<Expense>> {
    return apiClient.erp.get(`/api/erp/expenses/${id}`);
  },

  async create(data: Partial<Expense>): Promise<ApiResponse<Expense>> {
    return apiClient.erp.post("/api/erp/expenses", cleanEmptyUuids(data));
  },

  async update(
    id: string,
    data: Partial<Expense>,
  ): Promise<ApiResponse<Expense>> {
    return apiClient.erp.put(`/api/erp/expenses/${id}`, cleanEmptyUuids(data));
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/expenses/${id}`);
  },
};

export const budgetApi = {
  async list(
    params?: PaginationParams,
  ): Promise<ApiResponse<PaginatedResult<Budget>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/budgets${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<Budget>> {
    return apiClient.erp.get(`/api/erp/budgets/${id}`);
  },

  async create(data: Partial<Budget>): Promise<ApiResponse<Budget>> {
    return apiClient.erp.post("/api/erp/budgets", cleanEmptyUuids(data));
  },

  async update(
    id: string,
    data: Partial<Budget>,
  ): Promise<ApiResponse<Budget>> {
    return apiClient.erp.put(`/api/erp/budgets/${id}`, cleanEmptyUuids(data));
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/budgets/${id}`);
  },
};

export const receivableApi = {
  async list(
    params?: PaginationParams,
  ): Promise<ApiResponse<PaginatedResult<Receivable>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/receivables${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<Receivable>> {
    return apiClient.erp.get(`/api/erp/receivables/${id}`);
  },

  async create(data: Partial<Receivable>): Promise<ApiResponse<Receivable>> {
    return apiClient.erp.post("/api/erp/receivables", cleanEmptyUuids(data));
  },

  async update(
    id: string,
    data: Partial<Receivable>,
  ): Promise<ApiResponse<Receivable>> {
    return apiClient.erp.put(
      `/api/erp/receivables/${id}`,
      cleanEmptyUuids(data),
    );
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/receivables/${id}`);
  },
};

export const payableApi = {
  async list(
    params?: PaginationParams,
  ): Promise<ApiResponse<PaginatedResult<Payable>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/payables${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<Payable>> {
    return apiClient.erp.get(`/api/erp/payables/${id}`);
  },

  async create(data: Partial<Payable>): Promise<ApiResponse<Payable>> {
    return apiClient.erp.post("/api/erp/payables", cleanEmptyUuids(data));
  },

  async update(
    id: string,
    data: Partial<Payable>,
  ): Promise<ApiResponse<Payable>> {
    return apiClient.erp.put(`/api/erp/payables/${id}`, cleanEmptyUuids(data));
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/payables/${id}`);
  },
};

export const accountingSubjectApi = {
  async list(
    params?: PaginationParams,
  ): Promise<ApiResponse<PaginatedResult<AccountingSubject>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/accounting-subjects${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<AccountingSubject>> {
    return apiClient.erp.get(`/api/erp/accounting-subjects/${id}`);
  },

  async create(
    data: Partial<AccountingSubject>,
  ): Promise<ApiResponse<AccountingSubject>> {
    return apiClient.erp.post("/api/erp/accounting-subjects", data);
  },

  async update(
    id: string,
    data: Partial<AccountingSubject>,
  ): Promise<ApiResponse<AccountingSubject>> {
    return apiClient.erp.put(`/api/erp/accounting-subjects/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/accounting-subjects/${id}`);
  },
};

export const voucherApi = {
  async list(
    params?: PaginationParams & { period?: string },
  ): Promise<ApiResponse<PaginatedResult<FinancialVoucher>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.period) searchParams.set("period", params.period);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/vouchers${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<FinancialVoucher>> {
    return apiClient.erp.get(`/api/erp/vouchers/${id}`);
  },

  async getItems(id: string): Promise<ApiResponse<VoucherItem[]>> {
    return apiClient.erp.get(`/api/erp/vouchers/${id}/items`);
  },

  async create(
    data: CreateFinancialVoucherRequest,
  ): Promise<ApiResponse<FinancialVoucher>> {
    return apiClient.erp.post("/api/erp/vouchers", data);
  },

  async update(
    id: string,
    data: Partial<FinancialVoucher>,
  ): Promise<ApiResponse<FinancialVoucher>> {
    return apiClient.erp.put(`/api/erp/vouchers/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/vouchers/${id}`);
  },

  async importU8(data: {
    file_name: string;
    file_content: string;
    import_mode: string;
  }): Promise<ApiResponse<VoucherImportResult>> {
    return apiClient.erp.post("/api/erp/vouchers/import/u8", data);
  },
};

export const financeReportApi = {
  async balanceSheet(params?: {
    period?: string;
  }): Promise<ApiResponse<BalanceSheet>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set("period", params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/reports/balance-sheet${queryString ? "?" + queryString : ""}`,
    );
  },

  async incomeStatement(params?: {
    period?: string;
  }): Promise<ApiResponse<IncomeStatement>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set("period", params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/reports/income-statement${queryString ? "?" + queryString : ""}`,
    );
  },

  async cashFlowStatement(params?: {
    period?: string;
  }): Promise<ApiResponse<CashFlowStatement>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set("period", params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/reports/cash-flow${queryString ? "?" + queryString : ""}`,
    );
  },

  async businessOverview(params?: {
    period?: string;
  }): Promise<ApiResponse<BusinessOverview>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set("period", params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/reports/business-overview${queryString ? "?" + queryString : ""}`,
    );
  },

  async projectSummary(params?: {
    project_id?: string;
  }): Promise<ApiResponse<ProjectFinancialSummary[]>> {
    const searchParams = new URLSearchParams();
    if (params?.project_id) searchParams.set("project_id", params.project_id);
    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/reports/project-summary${queryString ? "?" + queryString : ""}`,
    );
  },

  async monthlyTrend(): Promise<ApiResponse<MonthlyTrend[]>> {
    return apiClient.erp.get("/api/erp/reports/monthly-trend");
  },

  async departmentSummary(params?: {
    department_id?: string;
  }): Promise<ApiResponse<DepartmentFinancialSummary[]>> {
    const searchParams = new URLSearchParams();
    if (params?.department_id)
      searchParams.set("department_id", params.department_id);
    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/reports/department-summary${queryString ? "?" + queryString : ""}`,
    );
  },

  async agingAnalysis(): Promise<ApiResponse<AgingAnalysis[]>> {
    return apiClient.erp.get("/api/erp/reports/aging-analysis");
  },

  async voucherStatistics(params?: {
    period?: string;
  }): Promise<ApiResponse<Record<string, any>>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set("period", params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/reports/voucher-statistics${queryString ? "?" + queryString : ""}`,
    );
  },

  async cashFlowAnalysis(params?: {
    period?: string;
  }): Promise<ApiResponse<CashFlowAnalysis>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set("period", params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/reports/cash-flow-analysis${queryString ? "?" + queryString : ""}`,
    );
  },

  async expenseAnalysis(params?: {
    period?: string;
  }): Promise<ApiResponse<ExpenseAnalysis>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set("period", params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/reports/expense-analysis${queryString ? "?" + queryString : ""}`,
    );
  },

  async profitAnalysis(params?: {
    period?: string;
  }): Promise<ApiResponse<ProfitAnalysis>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set("period", params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/reports/profit-analysis${queryString ? "?" + queryString : ""}`,
    );
  },

  async financialOverview(params?: {
    period?: string;
  }): Promise<ApiResponse<FinancialOverview>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set("period", params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/reports/financial-overview${queryString ? "?" + queryString : ""}`,
    );
  },
};

export const officeSupplyApi = {
  async list(
    params?: PaginationParams & { category?: string },
  ): Promise<ApiResponse<PaginatedResult<OfficeSupply>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.category) searchParams.set("category", params.category);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/office-supplies${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<OfficeSupply>> {
    return apiClient.erp.get(`/api/erp/office-supplies/${id}`);
  },

  async create(
    data: Partial<OfficeSupply>,
  ): Promise<ApiResponse<OfficeSupply>> {
    return apiClient.erp.post("/api/erp/office-supplies", data);
  },

  async update(
    id: string,
    data: Partial<OfficeSupply>,
  ): Promise<ApiResponse<OfficeSupply>> {
    return apiClient.erp.put(`/api/erp/office-supplies/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/office-supplies/${id}`);
  },
};

export const meetingRoomApi = {
  async list(
    params?: PaginationParams,
  ): Promise<ApiResponse<PaginatedResult<MeetingRoom>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/meeting-rooms${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<MeetingRoom>> {
    return apiClient.erp.get(`/api/erp/meeting-rooms/${id}`);
  },

  async create(data: Partial<MeetingRoom>): Promise<ApiResponse<MeetingRoom>> {
    return apiClient.erp.post("/api/erp/meeting-rooms", data);
  },

  async update(
    id: string,
    data: Partial<MeetingRoom>,
  ): Promise<ApiResponse<MeetingRoom>> {
    return apiClient.erp.put(`/api/erp/meeting-rooms/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/meeting-rooms/${id}`);
  },

  async getBookings(id: string): Promise<ApiResponse<MeetingBooking[]>> {
    return apiClient.erp.get(`/api/erp/meeting-rooms/${id}/bookings`);
  },
};

export const meetingBookingApi = {
  async list(
    params?: PaginationParams,
  ): Promise<ApiResponse<PaginatedResult<MeetingBooking>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/meeting-bookings${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<MeetingBooking>> {
    return apiClient.erp.get(`/api/erp/meeting-bookings/${id}`);
  },

  async create(
    data: Partial<MeetingBooking>,
  ): Promise<ApiResponse<MeetingBooking>> {
    return apiClient.erp.post("/api/erp/meeting-bookings", data);
  },

  async update(
    id: string,
    data: Partial<MeetingBooking>,
  ): Promise<ApiResponse<MeetingBooking>> {
    return apiClient.erp.put(`/api/erp/meeting-bookings/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/meeting-bookings/${id}`);
  },
};

export const vehicleApi = {
  async list(
    params?: PaginationParams & { vehicle_type?: string },
  ): Promise<ApiResponse<PaginatedResult<Vehicle>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.vehicle_type)
      searchParams.set("vehicle_type", params.vehicle_type);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/vehicles${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<Vehicle>> {
    return apiClient.erp.get(`/api/erp/vehicles/${id}`);
  },

  async create(data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    return apiClient.erp.post("/api/erp/vehicles", data);
  },

  async update(
    id: string,
    data: Partial<Vehicle>,
  ): Promise<ApiResponse<Vehicle>> {
    return apiClient.erp.put(`/api/erp/vehicles/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/vehicles/${id}`);
  },

  async getRequests(id: string): Promise<ApiResponse<VehicleRequest[]>> {
    return apiClient.erp.get(`/api/erp/vehicles/${id}/requests`);
  },
};

export const vehicleRequestApi = {
  async list(
    params?: PaginationParams,
  ): Promise<ApiResponse<PaginatedResult<VehicleRequest>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/vehicle-requests${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<VehicleRequest>> {
    return apiClient.erp.get(`/api/erp/vehicle-requests/${id}`);
  },

  async create(
    data: Partial<VehicleRequest>,
  ): Promise<ApiResponse<VehicleRequest>> {
    return apiClient.erp.post("/api/erp/vehicle-requests", data);
  },

  async update(
    id: string,
    data: Partial<VehicleRequest>,
  ): Promise<ApiResponse<VehicleRequest>> {
    return apiClient.erp.put(`/api/erp/vehicle-requests/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/vehicle-requests/${id}`);
  },
};

export const announcementApi = {
  async list(
    params?: PaginationParams & { priority?: string },
  ): Promise<ApiResponse<PaginatedResult<Announcement>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.priority) searchParams.set("priority", params.priority);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/announcements${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.get(`/api/erp/announcements/${id}`);
  },

  async create(
    data: Partial<Announcement>,
  ): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.post("/api/erp/announcements", data);
  },

  async update(
    id: string,
    data: Partial<Announcement>,
  ): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.put(`/api/erp/announcements/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/announcements/${id}`);
  },

  async publish(id: string): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.post(`/api/erp/announcements/${id}/publish`);
  },

  async unpublish(id: string): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.post(`/api/erp/announcements/${id}/unpublish`);
  },
};

export const openingBalanceApi = {
  async list(
    params?: PaginationParams & { period?: string; company_id?: string },
  ): Promise<ApiResponse<PaginatedResult<OpeningBalance>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.period) searchParams.set("period", params.period);
    if (params?.company_id) searchParams.set("company_id", params.company_id);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/finance/accounts/opening-balances${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<OpeningBalance>> {
    return apiClient.erp.get(`/api/erp/finance/accounts/opening-balances/${id}`);
  },

  async create(
    data: CreateOpeningBalanceRequest,
  ): Promise<ApiResponse<OpeningBalance>> {
    return apiClient.erp.post(
      "/api/erp/finance/accounts/opening-balances",
      data,
    );
  },

  async update(
    id: string,
    data: Partial<OpeningBalance>,
  ): Promise<ApiResponse<OpeningBalance>> {
    return apiClient.erp.put(
      `/api/erp/finance/accounts/opening-balances/${id}`,
      data,
    );
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(
      `/api/erp/finance/accounts/opening-balances/${id}`,
    );
  },

  async batchImport(
    data: CreateOpeningBalanceRequest[],
  ): Promise<ApiResponse<Record<string, any>>> {
    return apiClient.erp.post(
      "/api/erp/finance/accounts/opening-balances/batch",
      data,
    );
  },

  async carryForward(
    data: CarryForwardRequest,
  ): Promise<ApiResponse<Record<string, any>>> {
    return apiClient.erp.post(
      "/api/erp/finance/accounts/opening-balances/carry-forward",
      data,
    );
  },
};

export const fixedAssetApi = {
  async list(
    params?: PaginationParams & { department_id?: string; status?: string },
  ): Promise<ApiResponse<PaginatedResult<FixedAsset>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.department_id)
      searchParams.set("department_id", params.department_id);
    if (params?.status) searchParams.set("status", params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/fixed-assets${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<FixedAsset>> {
    return apiClient.erp.get(`/api/erp/fixed-assets/${id}`);
  },

  async create(data: Partial<FixedAsset>): Promise<ApiResponse<FixedAsset>> {
    return apiClient.erp.post("/api/erp/fixed-assets", data);
  },

  async update(
    id: string,
    data: Partial<FixedAsset>,
  ): Promise<ApiResponse<FixedAsset>> {
    return apiClient.erp.put(`/api/erp/fixed-assets/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/fixed-assets/${id}`);
  },

  async depreciate(
    data: DepreciateRequest,
  ): Promise<ApiResponse<DepreciationResult>> {
    return apiClient.erp.post("/api/erp/fixed-assets/depreciate", data);
  },
};

export const bankAccountApi = {
  async list(
    params?: PaginationParams & { company_id?: string; status?: string },
  ): Promise<ApiResponse<PaginatedResult<BankAccount>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.company_id) searchParams.set("company_id", params.company_id);
    if (params?.status) searchParams.set("status", params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/bank-accounts${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<BankAccount>> {
    return apiClient.erp.get(`/api/erp/bank-accounts/${id}`);
  },

  async create(data: Partial<BankAccount>): Promise<ApiResponse<BankAccount>> {
    return apiClient.erp.post("/api/erp/bank-accounts", data);
  },

  async update(
    id: string,
    data: Partial<BankAccount>,
  ): Promise<ApiResponse<BankAccount>> {
    return apiClient.erp.put(`/api/erp/bank-accounts/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/bank-accounts/${id}`);
  },
};

export const bankTransactionApi = {
  async list(
    params?: PaginationParams & {
      account_id?: string;
      transaction_date?: string;
    },
  ): Promise<ApiResponse<PaginatedResult<BankTransaction>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.account_id) searchParams.set("account_id", params.account_id);
    if (params?.transaction_date)
      searchParams.set("transaction_date", params.transaction_date);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/bank-transactions${queryString ? "?" + queryString : ""}`,
    );
  },

  async get(id: string): Promise<ApiResponse<BankTransaction>> {
    return apiClient.erp.get(`/api/erp/bank-transactions/${id}`);
  },

  async create(
    data: CreateBankTransactionRequest,
  ): Promise<ApiResponse<BankTransaction>> {
    return apiClient.erp.post("/api/erp/bank-transactions", data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/bank-transactions/${id}`);
  },
};
