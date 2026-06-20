/**
 * ERP财务API接口定义
 * 包含科目、凭证、应收应付、财务报表等API
 */

import { apiClient, downloadBlob } from "./client";
import type {
  Account,
  AccountBalance,
  AccountOpeningBalance,
  Voucher,
  CreateVoucherRequest,
  VoucherQueryParams,
  Customer,
  Supplier,
  CounterpartyFinanceInfo,
  SalesInvoice,
  PurchaseInvoice,
  CollectionRecord,
  PaymentRecord,
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  ReportQueryParams,
  VoucherTemplate,
  VoucherOperationResult,
  PaginatedResult,
  ApiResponse,
  BatchOperationResult,
} from "../types/erp-finance";
import config from "../config/runtime";

// 创建API客户端实例的基础配置
const createApiClient = () => {
  return apiClient.erp;
};

// ============================================
// 一、会计科目API
// ============================================

export const accountApi = {
  /**
   * 获取科目列表
   */
  list: (params?: {
    category?: string;
    parent_id?: string;
    level?: number;
    status?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResult<Account>>> => {
    return createApiClient().get("/api/finance/accounts", { params });
  },

  /**
   * 获取科目树
   */
  getTree: (params?: {
    category?: string;
    status?: string;
    include_disabled?: boolean;
  }): Promise<ApiResponse<Account[]>> => {
    return createApiClient().get("/api/finance/accounts/tree", { params });
  },

  /**
   * 获取科目详情
   */
  get: (id: string): Promise<ApiResponse<Account>> => {
    return createApiClient().get(`/api/finance/accounts/${id}`);
  },

  /**
   * 创建科目
   */
  create: (data: Partial<Account>): Promise<ApiResponse<Account>> => {
    return createApiClient().post("/api/finance/accounts", data);
  },

  /**
   * 更新科目
   */
  update: (
    id: string,
    data: Partial<Account>,
  ): Promise<ApiResponse<Account>> => {
    return createApiClient().put(`/api/finance/accounts/${id}`, data);
  },

  /**
   * 删除科目
   */
  delete: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().delete(`/api/finance/accounts/${id}`);
  },

  /**
   * 批量创建下级科目
   */
  batchCreateChildren: (
    parentId: string,
    accounts: Partial<Account>[],
  ): Promise<ApiResponse<Account[]>> => {
    return createApiClient().post(
      `/api/finance/accounts/${parentId}/children-batch`,
      { accounts },
    );
  },

  /**
   * 获取科目余额
   */
  getBalances: (params: {
    account_ids?: string[];
    period: string;
    company_id?: string;
    department_id?: string;
    project_id?: string;
  }): Promise<ApiResponse<AccountBalance[]>> => {
    return createApiClient().get("/api/finance/accounts/balances", {
      params,
    });
  },

  /**
   * 获取科目期初余额
   */
  getOpeningBalances: (params: {
    period: string;
    account_ids?: string[];
    company_id?: string;
  }): Promise<ApiResponse<AccountOpeningBalance[]>> => {
    return createApiClient().get("/api/finance/accounts/opening-balances", {
      params,
    });
  },

  /**
   * 设置科目期初余额
   */
  setOpeningBalance: (
    accountId: string,
    data: Partial<AccountOpeningBalance>,
  ): Promise<ApiResponse<AccountOpeningBalance>> => {
    return createApiClient().post(
      `/api/finance/accounts/${accountId}/opening-balance`,
      data,
    );
  },

  /**
   * 结转期初余额
   */
  carryForwardOpeningBalance: (params: {
    from_period: string;
    to_period: string;
    company_id?: string;
  }): Promise<ApiResponse<void>> => {
    return createApiClient().post(
      "/api/finance/accounts/opening-balance/carry-forward",
      params,
    );
  },
};

// ============================================
// 二、凭证管理API
// ============================================

export const voucherApi = {
  /**
   * 获取凭证列表
   */
  list: (
    params?: VoucherQueryParams,
  ): Promise<ApiResponse<PaginatedResult<Voucher>>> => {
    return createApiClient().get("/api/finance/vouchers", { params });
  },

  /**
   * 获取凭证详情
   */
  get: (id: string): Promise<ApiResponse<Voucher>> => {
    return createApiClient().get(`/api/finance/vouchers/${id}`);
  },

  /**
   * 获取凭证详情（包含分录详情）
   */
  getWithEntries: (id: string): Promise<ApiResponse<Voucher>> => {
    return createApiClient().get(`/api/finance/vouchers/${id}/entries`);
  },

  /**
   * 创建凭证
   */
  create: (
    data: CreateVoucherRequest,
  ): Promise<ApiResponse<VoucherOperationResult>> => {
    return createApiClient().post("/api/finance/vouchers", data);
  },

  /**
   * 批量创建凭证
   */
  batchCreate: (
    vouchers: CreateVoucherRequest[],
  ): Promise<ApiResponse<{ results: VoucherOperationResult[] }>> => {
    return createApiClient().post("/api/finance/vouchers/batch", {
      vouchers,
    });
  },

  /**
   * 更新凭证
   */
  update: (
    id: string,
    data: Partial<CreateVoucherRequest>,
  ): Promise<ApiResponse<VoucherOperationResult>> => {
    return createApiClient().put(`/api/finance/vouchers/${id}`, data);
  },

  /**
   * 删除凭证
   */
  delete: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().delete(`/api/finance/vouchers/${id}`);
  },

  /**
   * 批量删除凭证
   */
  batchDelete: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return createApiClient().post("/api/finance/vouchers/batch-delete", {
      ids,
    });
  },

  /**
   * 提交凭证
   */
  submit: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().post(`/api/finance/vouchers/${id}/submit`, {});
  },

  /**
   * 审核凭证
   */
  approve: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().post(`/api/finance/vouchers/${id}/approve`, {});
  },

  /**
   * 批量审核凭证
   */
  batchApprove: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return createApiClient().post("/api/finance/vouchers/batch-approve", {
      ids,
    });
  },

  /**
   * 反审核凭证
   */
  unapprove: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().post(`/api/finance/vouchers/${id}/unapprove`, {});
  },

  /**
   * 过账凭证
   */
  post: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().post(`/api/finance/vouchers/${id}/post`, {});
  },

  /**
   * 批量过账凭证
   */
  batchPost: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return createApiClient().post("/api/finance/vouchers/batch-post", {
      ids,
    });
  },

  /**
   * 冲销凭证
   */
  reverse: (
    id: string,
    reason?: string,
  ): Promise<ApiResponse<VoucherOperationResult>> => {
    return createApiClient().post(`/api/finance/vouchers/${id}/reverse`, {
      reason,
    });
  },

  /**
   * 获取下一个凭证号
   */
  getNextVoucherNo: (params?: {
    period?: string;
    voucher_type?: string;
  }): Promise<ApiResponse<{ voucher_no: string }>> => {
    return createApiClient().get("/api/finance/vouchers/next-no", {
      params,
    });
  },

  /**
   * 按模板生成凭证
   */
  generateByTemplate: (params: {
    template_id: string;
    source_data: Record<string, any>;
  }): Promise<ApiResponse<Voucher>> => {
    return createApiClient().post("/api/finance/vouchers/generate", params);
  },

  /**
   * 导入凭证
   */
  import: (
    file: File,
  ): Promise<
    ApiResponse<{
      total: number;
      success: number;
      failed: number;
      errors: any[];
    }>
  > => {
    const formData = new FormData();
    formData.append("file", file);
    return createApiClient().post("/api/finance/vouchers/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /**
   * 导出凭证
   */
  export: async (params: VoucherQueryParams): Promise<Blob> => {
    const baseURL =
      (apiClient.erp as any).defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, "/api/finance/vouchers/export", {
      params,
    });
  },
};

// ============================================
// 三、应收应付API
// ============================================

export const receivablePayableApi = {
  // -------- 销售发票（应收） --------
  listSalesInvoices: (params?: {
    customer_id?: string;
    status?: string | string[];
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResult<SalesInvoice>>> => {
    return createApiClient().get("/api/finance/ar/invoices", { params });
  },

  getSalesInvoice: (id: string): Promise<ApiResponse<SalesInvoice>> => {
    return createApiClient().get(`/api/finance/ar/invoices/${id}`);
  },

  createSalesInvoice: (
    data: Partial<SalesInvoice>,
  ): Promise<ApiResponse<SalesInvoice>> => {
    return createApiClient().post("/api/finance/ar/invoices", data);
  },

  updateSalesInvoice: (
    id: string,
    data: Partial<SalesInvoice>,
  ): Promise<ApiResponse<SalesInvoice>> => {
    return createApiClient().put(`/api/finance/ar/invoices/${id}`, data);
  },

  deleteSalesInvoice: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().delete(`/api/finance/ar/invoices/${id}`);
  },

  // -------- 采购发票（应付）--------
  listPurchaseInvoices: (params?: {
    supplier_id?: string;
    status?: string | string[];
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResult<PurchaseInvoice>>> => {
    return createApiClient().get("/api/finance/ap/invoices", { params });
  },

  getPurchaseInvoice: (id: string): Promise<ApiResponse<PurchaseInvoice>> => {
    return createApiClient().get(`/api/finance/ap/invoices/${id}`);
  },

  createPurchaseInvoice: (
    data: Partial<PurchaseInvoice>,
  ): Promise<ApiResponse<PurchaseInvoice>> => {
    return createApiClient().post("/api/finance/ap/invoices", data);
  },

  updatePurchaseInvoice: (
    id: string,
    data: Partial<PurchaseInvoice>,
  ): Promise<ApiResponse<PurchaseInvoice>> => {
    return createApiClient().put(`/api/finance/ap/invoices/${id}`, data);
  },

  deletePurchaseInvoice: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().delete(`/api/finance/ap/invoices/${id}`);
  },

  // -------- 收款记录 --------
  listCollections: (params?: {
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResult<CollectionRecord>>> => {
    return createApiClient().get("/api/finance/ar/collections", { params });
  },

  createCollection: (
    data: Partial<CollectionRecord>,
  ): Promise<ApiResponse<CollectionRecord>> => {
    return createApiClient().post("/api/finance/ar/collections", data);
  },

  // -------- 付款记录 --------
  listPayments: (params?: {
    supplier_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResult<PaymentRecord>>> => {
    return createApiClient().get("/api/finance/ap/payments", { params });
  },

  createPayment: (
    data: Partial<PaymentRecord>,
  ): Promise<ApiResponse<PaymentRecord>> => {
    return createApiClient().post("/api/finance/ap/payments", data);
  },

  // -------- 核销 --------
  reconcile: (params: {
    type: "ar" | "ap";
    invoice_id: string;
    record_ids: string[];
  }): Promise<ApiResponse<void>> => {
    return createApiClient().post("/api/finance/reconcile", params);
  },

  autoReconcile: (params: {
    type: "ar" | "ap";
    entity_id: string; // customer_id or supplier_id
    period: string;
  }): Promise<ApiResponse<{ reconciled: number }>> => {
    return createApiClient().post("/api/finance/reconcile/auto", params);
  },

  // -------- 账龄分析 --------
  getReceivableAging: (params: {
    company_id?: string;
    customer_ids?: string[];
    as_of_date: string;
  }): Promise<
    ApiResponse<{
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
    }>
  > => {
    return createApiClient().get("/api/finance/ar/aging", { params });
  },

  getPayableAging: (params: {
    company_id?: string;
    supplier_ids?: string[];
    as_of_date: string;
  }): Promise<
    ApiResponse<{
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
    }>
  > => {
    return createApiClient().get("/api/finance/ap/aging", { params });
  },
};

// ============================================
// 四、财务报表API
// ============================================

export const reportApi = {
  /**
   * 获取资产负债表
   */
  getBalanceSheet: (
    params: ReportQueryParams,
  ): Promise<ApiResponse<BalanceSheet>> => {
    return createApiClient().get("/api/finance/reports/balance-sheet", {
      params,
    });
  },

  /**
   * 获取利润表
   */
  getIncomeStatement: (
    params: ReportQueryParams,
  ): Promise<ApiResponse<IncomeStatement>> => {
    return createApiClient().get("/api/finance/reports/income-statement", {
      params,
    });
  },

  /**
   * 获取现金流量表
   */
  getCashFlowStatement: (
    params: ReportQueryParams,
  ): Promise<ApiResponse<CashFlowStatement>> => {
    return createApiClient().get("/api/finance/reports/cash-flow", {
      params,
    });
  },

  /**
   * 获取科目余额表
   */
  getAccountBalanceReport: (params: {
    company_id: string;
    period: string;
    account_ids?: string[];
    level?: number;
    show_zero_balance?: boolean;
  }): Promise<
    ApiResponse<{
      items: AccountBalance[];
      total_records: number;
    }>
  > => {
    return createApiClient().get("/api/finance/reports/account-balance", {
      params,
    });
  },

  /**
   * 获取明细账
   */
  getAccountLedger: (params: {
    account_id: string;
    start_period: string;
    end_period: string;
    company_id?: string;
    department_id?: string;
    project_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<
    ApiResponse<
      PaginatedResult<{
        date: string;
        voucher_no: string;
        summary: string;
        debit: number;
        credit: number;
        balance: number;
        counterparty?: string;
      }>
    >
  > => {
    return createApiClient().get("/api/finance/reports/account-ledger", {
      params,
    });
  },

  /**
   * 获取辅助核算明细表
   */
  getDimensionDetail: (params: {
    dimension: string;
    dimension_id: string;
    start_period: string;
    end_period: string;
    company_id?: string;
  }): Promise<ApiResponse<any>> => {
    return createApiClient().get("/api/finance/reports/dimension-detail", {
      params,
    });
  },

  /**
   * 导出资产负债表
   */
  exportBalanceSheet: async (params: ReportQueryParams): Promise<Blob> => {
    const baseURL =
      (apiClient.erp as any).defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, "/api/finance/reports/balance-sheet/export", {
      params,
    });
  },

  /**
   * 导出利润表
   */
  exportIncomeStatement: async (params: ReportQueryParams): Promise<Blob> => {
    const baseURL =
      (apiClient.erp as any).defaults?.baseURL || config.services.erp;
    return downloadBlob(
      baseURL,
      "/api/finance/reports/income-statement/export",
      { params },
    );
  },

  /**
   * 导出现金流量表
   */
  exportCashFlowStatement: async (params: ReportQueryParams): Promise<Blob> => {
    const baseURL =
      (apiClient.erp as any).defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, "/api/finance/reports/cash-flow/export", {
      params,
    });
  },
};

// ============================================
// 五、凭证模板API
// ============================================

export const voucherTemplateApi = {
  /**
   * 获取模板列表
   */
  list: (params?: {
    type?: string;
    applicable_module?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResult<VoucherTemplate>>> => {
    return createApiClient().get("/api/finance/voucher-templates", {
      params,
    });
  },

  /**
   * 获取模板详情
   */
  get: (id: string): Promise<ApiResponse<VoucherTemplate>> => {
    return createApiClient().get(`/api/finance/voucher-templates/${id}`);
  },

  /**
   * 创建模板
   */
  create: (
    data: Partial<VoucherTemplate>,
  ): Promise<ApiResponse<VoucherTemplate>> => {
    return createApiClient().post("/api/finance/voucher-templates", data);
  },

  /**
   * 更新模板
   */
  update: (
    id: string,
    data: Partial<VoucherTemplate>,
  ): Promise<ApiResponse<VoucherTemplate>> => {
    return createApiClient().put(`/api/finance/voucher-templates/${id}`, data);
  },

  /**
   * 删除模板
   */
  delete: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().delete(`/api/finance/voucher-templates/${id}`);
  },

  /**
   * 复制模板
   */
  copy: (
    id: string,
    newName: string,
  ): Promise<ApiResponse<VoucherTemplate>> => {
    return createApiClient().post(`/api/finance/voucher-templates/${id}/copy`, {
      name: newName,
    });
  },

  /**
   * 预览模板生成的凭证
   */
  preview: (
    id: string,
    sourceData: Record<string, any>,
  ): Promise<ApiResponse<Voucher>> => {
    return createApiClient().post(
      `/api/finance/voucher-templates/${id}/preview`,
      {
        source_data: sourceData,
      },
    );
  },

  /**
   * 设为默认模板
   */
  setDefault: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().post(
      `/api/finance/voucher-templates/${id}/set-default`,
      {},
    );
  },
};

// ============================================
// 六、会计期间API
// ============================================

export const periodApi = {
  /**
   * 获取当前期间
   */
  getCurrent: (): Promise<
    ApiResponse<{ period: string; year: number; month: number }>
  > => {
    return createApiClient().get("/api/finance/period/current");
  },

  /**
   * 获取期间列表
   */
  list: (params?: {
    year?: number;
    status?: string;
  }): Promise<
    ApiResponse<{
      items: {
        period: string;
        year: number;
        month: number;
        start_date: string;
        end_date: string;
        status: "open" | "closed" | "locked";
      }[];
    }>
  > => {
    return createApiClient().get("/api/finance/periods", { params });
  },

  /**
   * 开启期间
   */
  open: (period: string): Promise<ApiResponse<void>> => {
    return createApiClient().post("/api/finance/periods/open", { period });
  },

  /**
   * 关闭期间
   */
  close: (period: string): Promise<ApiResponse<void>> => {
    return createApiClient().post("/api/finance/periods/close", { period });
  },

  /**
   * 结转本期损益
   */
  closePeriodIncome: (
    period: string,
  ): Promise<ApiResponse<{ voucher_id: string }>> => {
    return createApiClient().post("/api/finance/periods/close-income", {
      period,
    });
  },

  /**
   * 年末结账
   */
  yearEndClose: (
    year: number,
  ): Promise<
    ApiResponse<{
      vouchers: { voucher_id: string; description: string }[];
    }>
  > => {
    return createApiClient().post("/api/finance/periods/year-end-close", {
      year,
    });
  },
};

// ============================================
// 七、往来单位财务信息API
// ============================================

export const counterpartyFinanceApi = {
  /**
   * 获取客户财务信息
   */
  getCustomerFinance: (
    customerId: string,
  ): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return createApiClient().get(
      `/api/finance/counterparty/customers/${customerId}`,
    );
  },

  /**
   * 更新客户财务信息
   */
  updateCustomerFinance: (
    customerId: string,
    data: Partial<CounterpartyFinanceInfo>,
  ): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return createApiClient().put(
      `/api/finance/counterparty/customers/${customerId}`,
      data,
    );
  },

  /**
   * 获取供应商财务信息
   */
  getSupplierFinance: (
    supplierId: string,
  ): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return createApiClient().get(
      `/api/finance/counterparty/suppliers/${supplierId}`,
    );
  },

  /**
   * 更新供应商财务信息
   */
  updateSupplierFinance: (
    supplierId: string,
    data: Partial<CounterpartyFinanceInfo>,
  ): Promise<ApiResponse<CounterpartyFinanceInfo>> => {
    return createApiClient().put(
      `/api/finance/counterparty/suppliers/${supplierId}`,
      data,
    );
  },

  /**
   * 获取客户列表（带财务信息）
   */
  listCustomersWithFinance: (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<
    ApiResponse<
      PaginatedResult<Customer & { finance_info?: CounterpartyFinanceInfo }>
    >
  > => {
    return createApiClient().get("/api/finance/counterparty/customers", {
      params,
    });
  },

  /**
   * 获取供应商列表（带财务信息）
   */
  listSuppliersWithFinance: (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<
    ApiResponse<
      PaginatedResult<Supplier & { finance_info?: CounterpartyFinanceInfo }>
    >
  > => {
    return createApiClient().get("/api/finance/counterparty/suppliers", {
      params,
    });
  },
};

// ============================================
// 八、导出所有API
// ============================================

export const financeApi = {
  account: accountApi,
  voucher: voucherApi,
  receivablePayable: receivablePayableApi,
  report: reportApi,
  voucherTemplate: voucherTemplateApi,
  period: periodApi,
  counterparty: counterpartyFinanceApi,
};

export default financeApi;
