/**
 * SRM财务整合API和类型定义
 * 包含供应商信用、应付款、采购发票等与财务相关的接口
 */

import { apiClient, downloadBlob } from './client';
import config from '../config/runtime';

// ============================================
// 一、类型定义
// ============================================

/**
 * 供应商财务信息
 */
export interface SupplierFinanceInfo {
  supplier_id: string;

  // 银行账户
  bank_name: string;
  bank_account: string;
  account_name: string;
  bank_code?: string;

  // 税务信息
  tax_number?: string;
  invoice_type: 'normal' | 'special';

  // 付款条款
  payment_terms: string;
  payment_days: number;
  credit_limit: number;

  // 应付款
  accounts_payable: number;
  overdue_payable: number;
  avg_payment_days: number;

  // 交易统计
  total_purchases: number;
  total_paid: number;
  last_transaction_date?: string;

  // 状态
  status: 'normal' | 'blocked' | 'inactive';

  created_at: string;
  updated_at: string;
}

/**
 * 采购发票（应付）
 */
export interface PurchaseInvoice {
  id: string;
  invoice_no: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code?: string;

  // 关联信息
  order_id?: string;
  receive_id?: string;
  project_id?: string;

  // 金额
  amount: number; // 不含税金额
  tax_amount: number; // 税额
  total_amount: number; // 含税金额
  paid_amount: number; // 已付款
  pending_amount: number; // 待付款

  // 发票信息
  invoice_date: string;
  due_date: string;
  invoice_type: 'normal' | 'special';

  // 凭证信息
  voucher_id?: string;
  voucher_no?: string;

  // 状态
  status: 'draft' | 'approved' | 'matched' | 'paid' | 'cancelled';
  overdue_days?: number;

  // 备注
  remark?: string;

  created_at: string;
  created_by?: string;
}

/**
 * 付款记录
 */
export interface PaymentRecord {
  id: string;
  payment_no: string;
  supplier_id: string;
  supplier_name: string;

  // 金额
  amount: number;
  payment_date: string;

  // 关联发票
  invoice_ids: string[];
  invoice_details?: {
    invoice_id: string;
    invoice_no: string;
    invoice_amount: number;
    allocated_amount: number;
  }[];

  // 付款方式
  payment_method: 'bank_transfer' | 'commercial_acceptance' | 'bank_acceptance' | 'cash';
  bank_account_id: string;

  // 凭证信息
  voucher_id?: string;
  voucher_no?: string;

  // 状态
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';

  // 审批信息
  approver_id?: string;
  approver_name?: string;
  approved_at?: string;

  // 备注
  remark?: string;

  created_at: string;
  created_by?: string;
}

/**
 * 付款申请
 */
export interface PaymentRequest {
  id: string;
  request_no: string;
  supplier_id: string;
  supplier_name: string;

  // 金额
  amount: number;

  // 关联发票
  invoice_ids: string[];

  // 付款信息
  payment_method: 'bank_transfer' | 'commercial_acceptance' | 'bank_acceptance';
  bank_account_id: string;
  bank_account_no?: string;
  bank_name?: string;

  // 付款用途
  purpose: string;

  // 状态
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paid';

  // 审批流程
  approvers?: {
    id: string;
    name: string;
    status: 'pending' | 'approved' | 'rejected';
    remark?: string;
    approved_at?: string;
  }[];

  // 备注
  remark?: string;

  created_at: string;
  created_by?: string;
}

/**
 * 应付账龄分析
 */
export interface PayableAging {
  supplier_id: string;
  supplier_name: string;

  // 金额
  total: number;
  current: number;
  over_30: number;
  over_60: number;
  over_90: number;
  over_180: number;

  // 预警
  risk_level: 'low' | 'medium' | 'high';
}

// ============================================
// 二、API接口
// ============================================

export const srmFinanceApi = {
  // -------- 供应商财务信息 --------

  /**
   * 获取供应商财务信息
   */
  getSupplierFinanceInfo: (supplierId: string) =>
    apiClient.srm.get(`/api/srm/suppliers/${supplierId}/finance`),

  /**
   * 更新供应商财务信息
   */
  updateSupplierFinanceInfo: (supplierId: string, data: Partial<SupplierFinanceInfo>) =>
    apiClient.srm.put(`/api/srm/suppliers/${supplierId}/finance`, data),

  /**
   * 获取供应商列表（带财务信息）
   */
  listSuppliersWithFinance: (params?: { status?: string; page?: number; page_size?: number }) =>
    apiClient.srm.get('/api/srm/suppliers/with-finance', { params }),

  // -------- 采购发票 --------

  /**
   * 获取采购发票列表
   */
  getPurchaseInvoices: (params?: {
    supplier_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.srm.get('/api/srm/invoices', { params }),

  /**
   * 获取采购发票详情
   */
  getPurchaseInvoice: (id: string) => apiClient.srm.get(`/api/srm/invoices/${id}`),

  /**
   * 创建采购发票
   */
  createPurchaseInvoice: (data: Partial<PurchaseInvoice>) =>
    apiClient.srm.post('/api/srm/invoices', data),

  /**
   * 更新采购发票
   */
  updatePurchaseInvoice: (id: string, data: Partial<PurchaseInvoice>) =>
    apiClient.srm.put(`/api/srm/invoices/${id}`, data),

  /**
   * 删除采购发票
   */
  deletePurchaseInvoice: (id: string) => apiClient.srm.delete(`/api/srm/invoices/${id}`),

  /**
   * 审核采购发票
   */
  approvePurchaseInvoice: (id: string) => apiClient.srm.post(`/api/srm/invoices/${id}/approve`, {}),

  /**
   * 确认收到发票
   */
  confirmPurchaseInvoice: (id: string) => apiClient.srm.post(`/api/srm/invoices/${id}/confirm`, {}),

  /**
   * 验证发票
   */
  verifyPurchaseInvoice: (id: string) => apiClient.srm.post(`/api/srm/invoices/${id}/verify`, {}),

  /**
   * 匹配发票与入库单
   */
  matchInvoiceWithReceive: (data: { invoice_id: string; receive_id: string; amount: number }) =>
    apiClient.srm.post('/api/srm/invoices/match', data),

  /**
   * 作废发票
   */
  cancelPurchaseInvoice: (id: string, reason: string) =>
    apiClient.srm.post(`/api/srm/invoices/${id}/cancel`, { reason }),

  // -------- 付款管理 --------

  /**
   * 获取付款记录列表
   */
  getPaymentRecords: (params?: {
    supplier_id?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.srm.get('/api/srm/payments', { params }),

  /**
   * 创建付款记录
   */
  createPaymentRecord: (data: Partial<PaymentRecord>) =>
    apiClient.srm.post('/api/srm/payments', data),

  /**
   * 审核付款记录
   */
  approvePayment: (id: string, approved: boolean, remark?: string) =>
    apiClient.srm.post(`/api/srm/payments/${id}/approve`, {
      approved,
      remark,
    }),

  /**
   * 确认付款
   */
  confirmPayment: (id: string, bank_reference?: string) =>
    apiClient.srm.post(`/api/srm/payments/${id}/confirm`, {
      bank_reference,
    }),

  // -------- 付款申请 --------

  /**
   * 获取付款申请列表
   */
  getPaymentRequests: (params?: {
    supplier_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.srm.get('/api/srm/payment-requests', { params }),

  /**
   * 获取付款申请详情
   */
  getPaymentRequest: (id: string) => apiClient.srm.get(`/api/srm/payment-requests/${id}`),

  /**
   * 创建付款申请
   */
  createPaymentRequest: (data: Partial<PaymentRequest>) =>
    apiClient.srm.post('/api/srm/payment-requests', data),

  /**
   * 更新付款申请
   */
  updatePaymentRequest: (id: string, data: Partial<PaymentRequest>) =>
    apiClient.srm.put(`/api/srm/payment-requests/${id}`, data),

  /**
   * 删除付款申请
   */
  deletePaymentRequest: (id: string) => apiClient.srm.delete(`/api/srm/payment-requests/${id}`),

  /**
   * 提交付款申请
   */
  submitPaymentRequest: (id: string) =>
    apiClient.srm.post(`/api/srm/payment-requests/${id}/submit`, {}),

  /**
   * 审批付款申请
   */
  approvePaymentRequest: (id: string, approved: boolean, remark?: string) =>
    apiClient.srm.post(`/api/srm/payment-requests/${id}/approve`, {
      approved,
      remark,
    }),

  // -------- 账龄分析 --------

  /**
   * 获取应付账龄分析
   */
  getPayableAging: (params: { company_id?: string; supplier_ids?: string[]; as_of_date: string }) =>
    apiClient.srm.get('/api/srm/reports/payable-aging', { params }),

  /**
   * 获取逾期应付款汇总
   */
  getOverduePayables: (params?: { company_id?: string; supplier_ids?: string[] }) =>
    apiClient.srm.get('/api/srm/reports/overdue-payables', { params }),

  /**
   * 获取到期应付列表
   */
  getDuePayables: (params?: {
    company_id?: string;
    supplier_id?: string;
    due_within_days?: number;
    page?: number;
    page_size?: number;
  }) => apiClient.srm.get('/api/srm/reports/due-payables', { params }),

  /**
   * 获取供应商应付汇总
   */
  getPayableSummary: (params?: {
    company_id?: string;
    supplier_ids?: string[];
    as_of_date?: string;
  }) => apiClient.srm.get('/api/srm/reports/payable-summary', { params }),

  // -------- 报表 --------

  /**
   * 获取采购付款统计
   */
  getPaymentStatistics: (params: {
    start_date: string;
    end_date: string;
    group_by?: 'supplier' | 'category' | 'month';
  }) => apiClient.srm.get('/api/srm/reports/payment-statistics', { params }),

  // -------- 导出 --------

  /**
   * 导出采购发票
   */
  exportPurchaseInvoices: async (params: {
    supplier_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    format: 'csv' | 'xlsx';
  }): Promise<Blob> => {
    const baseURL = (apiClient.srm as any).defaults?.baseURL || config.services.srm;
    return downloadBlob(baseURL, '/api/srm/exports/invoices', { params });
  },

  /**
   * 导出付款申请
   */
  exportPaymentRequests: async (params: {
    supplier_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    format: 'csv' | 'xlsx';
  }): Promise<Blob> => {
    const baseURL = (apiClient.srm as any).defaults?.baseURL || config.services.srm;
    return downloadBlob(baseURL, '/api/srm/exports/payment-requests', {
      params,
    });
  },

  /**
   * 导出应付账龄分析
   */
  exportPayableAging: async (params: {
    company_id?: string;
    supplier_ids?: string[];
    as_of_date: string;
    format: 'csv' | 'xlsx';
  }): Promise<Blob> => {
    const baseURL = (apiClient.srm as any).defaults?.baseURL || config.services.srm;
    return downloadBlob(baseURL, '/api/srm/exports/payable-aging', {
      params,
    });
  },
};

export default srmFinanceApi;
