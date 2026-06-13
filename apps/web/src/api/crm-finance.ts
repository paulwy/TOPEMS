/**
 * CRM财务整合API和类型定义
 * 包含客户信用、应收款、销售发票等与财务相关的接口
 */

import { apiClient, downloadBlob } from "./client";
import config from "../config/runtime";

// ============================================
// 一、类型定义
// ============================================

/**
 * 客户财务信息
 */
export interface CustomerFinanceInfo {
  customer_id: string;

  // 银行账户
  bank_name?: string;
  bank_account?: string;
  account_name?: string;

  // 税务信息
  tax_number?: string;
  invoice_title?: string;
  invoice_type: "normal" | "special";

  // 信用管理
  credit_limit: number;
  credit_term_days: number;
  payment_terms?: string;

  // 应收款
  accounts_receivable: number;
  overdue_receivable: number;
  avg_collection_days: number;

  // 交易统计
  total_sales: number;
  total_received: number;
  last_transaction_date?: string;

  // 状态
  status: "normal" | "blocked" | "inactive";

  created_at: string;
  updated_at: string;
}

/**
 * 销售发票
 */
export interface SalesInvoice {
  id: string;
  invoice_no: string;
  customer_id: string;
  customer_name?: string;

  // 金额
  amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;

  // 发票信息
  invoice_date: string;
  due_date: string;
  invoice_type: "normal" | "special";

  // 状态
  status:
    | "draft"
    | "approved"
    | "issued"
    | "partially_received"
    | "received"
    | "cancelled";

  // 凭证信息
  voucher_id?: string;
  voucher_no?: string;

  remark?: string;
  created_at: string;
}

/**
 * 收款记录
 */
export interface CollectionRecord {
  id: string;
  collection_no: string;
  customer_id: string;
  customer_name?: string;

  // 金额
  amount: number;
  collection_date: string;

  // 关联发票
  invoice_ids: string[];
  invoice_details?: {
    invoice_id: string;
    invoice_no: string;
    invoice_amount: number;
    allocated_amount: number;
  }[];

  // 收款方式
  payment_method: "bank_transfer" | "cash" | "credit" | "other";
  bank_account_id?: string;

  // 凭证信息
  voucher_id?: string;
  voucher_no?: string;

  // 状态
  status: "recorded" | "matched" | "cancelled";

  remark?: string;
  created_at: string;
  created_by?: string;
}

/**
 * 收款计划
 */
export interface CollectionPlan {
  id: string;
  plan_no: string;
  customer_id: string;
  customer_name?: string;

  // 金额
  planned_amount: number;
  planned_date: string;

  // 实际
  actual_amount?: number;
  actual_date?: string;

  // 状态
  status: "pending" | "completed" | "overdue" | "cancelled";

  // 来源
  source_type: "increase" | "decrease" | "set";
  source_id?: string;
  source_no?: string;

  // 备注
  remark?: string;

  created_at: string;
  updated_at: string;
}

/**
 * 应收账龄分析
 */
export interface ReceivableAging {
  customer_id: string;
  customer_name: string;

  // 金额
  total: number;
  current: number;
  over_30: number;
  over_60: number;
  over_90: number;
  over_180: number;

  // 占比
  current_ratio: number;
  overdue_ratio: number;

  // 预警
  risk_level: "low" | "medium" | "high" | "critical";
}

// ============================================
// 二、API接口
// ============================================

export const crmFinanceApi = {
  // -------- 客户财务信息 --------

  /**
   * 获取客户财务信息
   */
  getCustomerFinanceInfo: (customerId: string) =>
    apiClient.crm.get(`/api/v1/crm/customers/${customerId}/finance`),

  /**
   * 更新客户财务信息
   */
  updateCustomerFinanceInfo: (
    customerId: string,
    data: Partial<CustomerFinanceInfo>,
  ) => apiClient.crm.put(`/api/v1/crm/customers/${customerId}/finance`, data),

  /**
   * 获取客户列表（带财务信息）
   */
  listCustomersWithFinance: (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.crm.get("/api/v1/crm/customers/with-finance", { params }),

  // -------- 信用管理 --------

  /**
   * 申请信用调整
   */
  applyCreditAdjustment: (data: {
    customer_id: string;
    adjustment_type: "increase" | "decrease" | "set";
    amount: number;
    reason: string;
  }) => apiClient.crm.post("/api/v1/crm/credit-adjustments", data),

  /**
   * 审批信用调整
   */
  approveCreditAdjustment: (id: string, approved: boolean, remark?: string) =>
    apiClient.crm.post(`/api/v1/crm/credit-adjustments/${id}/approve`, {
      approved,
      remark,
    }),

  /**
   * 获取信用调整记录
   */
  getCreditAdjustments: (params?: {
    customer_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.crm.get("/api/v1/crm/credit-adjustments", { params }),

  // -------- 销售发票 --------

  /**
   * 获取销售发票列表
   */
  getSalesInvoices: (params?: {
    customer_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.crm.get("/api/v1/crm/invoices", { params }),

  /**
   * 获取销售发票详情
   */
  getSalesInvoice: (id: string) =>
    apiClient.crm.get(`/api/v1/crm/invoices/${id}`),

  /**
   * 创建销售发票
   */
  createSalesInvoice: (data: Partial<SalesInvoice>) =>
    apiClient.crm.post("/api/v1/crm/invoices", data),

  /**
   * 更新销售发票
   */
  updateSalesInvoice: (id: string, data: Partial<SalesInvoice>) =>
    apiClient.crm.put(`/api/v1/crm/invoices/${id}`, data),

  /**
   * 删除销售发票
   */
  deleteSalesInvoice: (id: string) =>
    apiClient.crm.delete(`/api/v1/crm/invoices/${id}`),

  /**
   * 审核销售发票
   */
  approveSalesInvoice: (id: string) =>
    apiClient.crm.post(`/api/v1/crm/invoices/${id}/approve`, {}),

  /**
   * 开具发票
   */
  issueSalesInvoice: (id: string) =>
    apiClient.crm.post(`/api/v1/crm/invoices/${id}/issue`, {}),

  /**
   * 作废发票
   */
  cancelSalesInvoice: (id: string, reason: string) =>
    apiClient.crm.post(`/api/v1/crm/invoices/${id}/cancel`, { reason }),

  /**
   * 红冲发票
   */
  redFlushSalesInvoice: (id: string, reason?: string) =>
    apiClient.crm.post(`/api/v1/crm/invoices/${id}/red-flush`, { reason }),

  // -------- 收款管理 --------

  /**
   * 获取收款记录列表
   */
  getCollectionRecords: (params?: {
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.crm.get("/api/v1/crm/collections", { params }),

  /**
   * 获取收款记录详情
   */
  getCollectionRecord: (id: string) =>
    apiClient.crm.get(`/api/v1/crm/collections/${id}`),

  /**
   * 创建收款记录
   */
  createCollectionRecord: (data: Partial<CollectionRecord>) =>
    apiClient.crm.post("/api/v1/crm/collections", data),

  /**
   * 确认收款
   */
  confirmCollection: (id: string) =>
    apiClient.crm.post(`/api/v1/crm/collections/${id}/confirm`, {}),

  /**
   * 批量确认收款
   */
  batchConfirmCollections: (ids: string[]) =>
    apiClient.crm.post("/api/v1/crm/collections/batch-confirm", { ids }),

  /**
   * 核销发票
   */
  reconcileInvoices: (data: {
    collection_id: string;
    invoice_ids: string[];
    amounts: number[];
  }) => apiClient.crm.post("/api/v1/crm/collections/reconcile", data),

  // -------- 收款计划 --------

  /**
   * 获取收款计划列表
   */
  getCollectionPlans: (params?: {
    customer_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.crm.get("/api/v1/crm/collection-plans", { params }),

  /**
   * 创建收款计划
   */
  createCollectionPlan: (data: Partial<CollectionPlan>) =>
    apiClient.crm.post("/api/v1/crm/collection-plans", data),

  /**
   * 更新收款计划
   */
  updateCollectionPlan: (id: string, data: Partial<CollectionPlan>) =>
    apiClient.crm.put(`/api/v1/crm/collection-plans/${id}`, data),

  /**
   * 完成收款计划
   */
  completeCollectionPlan: (
    id: string,
    actual_amount: number,
    actual_date: string,
  ) =>
    apiClient.crm.post(`/api/v1/crm/collection-plans/${id}/complete`, {
      actual_amount,
      actual_date,
    }),

  // -------- 账龄分析 --------

  /**
   * 获取应收账龄分析
   */
  getReceivableAging: (params: {
    company_id?: string;
    customer_ids?: string[];
    as_of_date: string;
  }) => apiClient.crm.get("/api/v1/crm/reports/receivable-aging", { params }),

  /**
   * 获取逾期应收账款列表
   */
  getOverdueReceivables: (params?: {
    company_id?: string;
    customer_id?: string;
    min_overdue_days?: number;
    page?: number;
    page_size?: number;
  }) =>
    apiClient.crm.get("/api/v1/crm/reports/overdue-receivables", { params }),

  /**
   * 获取应收账款汇总
   */
  getReceivableSummary: (customerId?: string) =>
    apiClient.crm.get("/api/v1/crm/reports/receivable-summary", {
      params: { customer_id: customerId },
    }),

  /**
   * 获取收款统计
   */
  getCollectionStatistics: (params: {
    start_date: string;
    end_date: string;
    group_by: "customer" | "salesperson" | "month";
  }) =>
    apiClient.crm.get("/api/v1/crm/reports/collection-statistics", { params }),

  // -------- 导出 --------

  /**
   * 导出销售发票
   */
  exportSalesInvoices: async (params: {
    customer_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    format: "csv" | "xlsx";
  }): Promise<Blob> => {
    const baseURL =
      (apiClient.crm as any).defaults?.baseURL || config.services.crm;
    return downloadBlob(baseURL, "/api/v1/crm/exports/invoices", { params });
  },

  /**
   * 导出收款记录
   */
  exportCollectionRecords: async (params: {
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    format: "csv" | "xlsx";
  }): Promise<Blob> => {
    const baseURL =
      (apiClient.crm as any).defaults?.baseURL || config.services.crm;
    return downloadBlob(baseURL, "/api/v1/crm/exports/collections", {
      params,
    });
  },

  /**
   * 导出应收账龄分析
   */
  exportReceivableAging: async (params: {
    company_id?: string;
    customer_ids?: string[];
    as_of_date: string;
    format: "csv" | "xlsx";
  }): Promise<Blob> => {
    const baseURL =
      (apiClient.crm as any).defaults?.baseURL || config.services.crm;
    return downloadBlob(baseURL, "/api/v1/crm/exports/receivable-aging", {
      params,
    });
  },
};
