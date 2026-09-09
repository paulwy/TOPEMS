/**
 * CRM客户关系财务API模块
 * 提供客户财务相关的API接口
 */

import { apiClient, handleResponse } from '../client';
import type { PaginatedResponse } from '@topems/shared-types';

// ============================================
// 类型定义
// ============================================

export interface CustomerFinanceInfo {
  customer_id: string;
  customer_name: string;
  credit_limit: number;
  credit_used: number;
  credit_available: number;
  credit_term_days: number;
  receivable_balance: number;
  accounts_receivable: number;
  overdue_amount: number;
  overdue_receivable: number;
  avg_collection_days: number;
  total_sales: number;
  total_received: number;
  last_transaction_date?: string;
  payment_terms: string;
  risklevel: 'low' | 'medium' | 'high';
  status: string;
  bank_name?: string;
  bank_account?: string;
  account_name?: string;
  tax_number?: string;
}

export interface SalesInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  invoice_type: 'tax' | '普通发票' | '专用发票';
}

export interface CollectionRecord {
  id: string;
  collection_number: string;
  customer_id: string;
  customer_name: string;
  invoice_id?: string;
  collection_date: string;
  amount: number;
  payment_method: 'bank_transfer' | 'cash' | 'check' | 'other';
  bank_account?: string;
  remark?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  confirmed_by?: string;
  confirmed_at?: string;
}

// ============================================
// API函数
// ============================================

export const crmFinanceApi = {
  // 获取客户财务信息
  getCustomerFinanceInfo: async (customerId: string) => {
    const response = await apiClient.crm.get<CustomerFinanceInfo>(
      `/customers/${customerId}/finance`
    );
    return handleResponse(response);
  },

  // 更新客户财务信息
  updateCustomerFinanceInfo: async (customerId: string, data: Partial<CustomerFinanceInfo>) => {
    const response = await apiClient.crm.put<CustomerFinanceInfo>(
      `/customers/${customerId}/finance`,
      data
    );
    return handleResponse(response);
  },

  // 获取销售发票列表
  getSalesInvoices: async (params?: {
    customer_id?: string;
    invoice_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }) => {
    const response = await apiClient.finance.get<PaginatedResponse<SalesInvoice>>(
      '/sales-invoices',
      { params }
    );
    return handleResponse(response);
  },

  // 获取销售发票详情
  getSalesInvoice: async (invoiceId: string) => {
    const response = await apiClient.finance.get<SalesInvoice>(`/sales-invoices/${invoiceId}`);
    return handleResponse(response);
  },

  // 创建销售发票
  createSalesInvoice: async (data: Partial<SalesInvoice>) => {
    const response = await apiClient.finance.post<SalesInvoice>('/sales-invoices', data);
    return handleResponse(response);
  },

  // 更新销售发票
  updateSalesInvoice: async (invoiceId: string, data: Partial<SalesInvoice>) => {
    const response = await apiClient.finance.put<SalesInvoice>(
      `/sales-invoices/${invoiceId}`,
      data
    );
    return handleResponse(response);
  },

  // 删除销售发票
  deleteSalesInvoice: async (invoiceId: string) => {
    const response = await apiClient.finance.delete(`/sales-invoices/${invoiceId}`);
    return handleResponse(response);
  },

  // 开具发票
  issueSalesInvoice: async (invoiceId: string) => {
    const response = await apiClient.finance.post<SalesInvoice>(
      `/sales-invoices/${invoiceId}/issue`
    );
    return handleResponse(response);
  },

  // 取消发票
  cancelSalesInvoice: async (invoiceId: string, reason: string) => {
    const response = await apiClient.finance.post<SalesInvoice>(
      `/sales-invoices/${invoiceId}/cancel`,
      { reason }
    );
    return handleResponse(response);
  },

  // 红冲发票
  redFlushSalesInvoice: async (invoiceId: string, reason?: string) => {
    const response = await apiClient.finance.post<SalesInvoice>(
      `/sales-invoices/${invoiceId}/red-flush`,
      { reason }
    );
    return handleResponse(response);
  },

  // 获取收款记录列表
  getCollectionRecords: async (params?: {
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    payment_method?: string;
    page?: number;
    pagesize?: number;
  }) => {
    const response = await apiClient.finance.get<PaginatedResponse<CollectionRecord>>(
      '/sales-collections',
      { params }
    );
    return handleResponse(response);
  },

  // 获取收款记录详情
  getCollectionRecord: async (recordId: string) => {
    const response = await apiClient.finance.get<CollectionRecord>(
      `/sales-collections/${recordId}`
    );
    return handleResponse(response);
  },

  // 创建收款记录
  createCollectionRecord: async (data: Partial<CollectionRecord>) => {
    const response = await apiClient.finance.post<CollectionRecord>('/sales-collections', data);
    return handleResponse(response);
  },

  // 确认收款
  confirmCollection: async (recordId: string) => {
    const response = await apiClient.finance.post<CollectionRecord>(
      `/sales-collections/${recordId}/confirm`
    );
    return handleResponse(response);
  },

  // 批量确认收款
  batchConfirmCollections: async (recordIds: string[]) => {
    const response = await apiClient.finance.post<{ success: number; failed: number }>(
      '/sales-collections/batch-confirm',
      { record_ids: recordIds }
    );
    return handleResponse(response);
  },

  // 获取应收账龄分析
  getReceivableAging: async (params: {
    company_id?: string;
    customer_ids?: string[];
    as_of_date: string;
  }) => {
    const response = await apiClient.finance.get('/reports/receivable-aging', {
      params,
    });
    return handleResponse(response);
  },

  // 获取客户应收账款汇总
  getReceivableSummary: async (customerId?: string) => {
    const response = await apiClient.finance.get('/reports/receivable-summary', {
      params: customerId ? { customer_id: customerId } : undefined,
    });
    return handleResponse(response);
  },

  // 获取逾期应收账款列表
  getOverdueReceivables: async (params?: {
    company_id?: string;
    customer_id?: string;
    min_overdue_days?: number;
    page?: number;
    pagesize?: number;
  }) => {
    const response = await apiClient.finance.get('/reports/overdue-receivables', {
      params,
    });
    return handleResponse(response);
  },

  // 导出销售发票
  exportSalesInvoices: async (params: {
    customer_id?: string;
    invoice_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    format: 'csv' | 'xlsx';
  }) => {
    const response = await apiClient.finance.get('/sales-invoices/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  // 导出收款记录
  exportCollectionRecords: async (params: {
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    format: 'csv' | 'xlsx';
  }) => {
    const response = await apiClient.finance.get('/sales-collections/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  // 导出应收账龄分析
  exportReceivableAging: async (params: {
    company_id?: string;
    customer_ids?: string[];
    as_of_date: string;
    format: 'csv' | 'xlsx';
  }) => {
    const response = await apiClient.finance.get('/reports/receivable-aging/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};

export default crmFinanceApi;
