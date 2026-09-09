import { apiClient } from '../client';
import type {
  SalesInvoice,
  PurchaseInvoice,
  CollectionRecord,
  PaymentRecord,
  PaginatedResult,
  ApiResponse,
} from '../../types/finance';

// ============================================
// 应收/应付 CRUD（原 erp/receivablePayable.ts 归并入此，消除同名歧义）
// ============================================

import type { Receivable, Payable } from '../erp/types';

export const receivablePayableApi = {
  listSalesInvoices: (params?: {
    customer_id?: string;
    status?: string | string[];
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<SalesInvoice>>> => {
    return apiClient.finance.get('/receivables', { params });
  },

  getSalesInvoice: (id: string): Promise<ApiResponse<SalesInvoice>> => {
    return apiClient.finance.get(`/receivables/${id}`);
  },

  createSalesInvoice: (data: Partial<SalesInvoice>): Promise<ApiResponse<SalesInvoice>> => {
    return apiClient.finance.post('/receivables', data);
  },

  updateSalesInvoice: (
    id: string,
    data: Partial<SalesInvoice>
  ): Promise<ApiResponse<SalesInvoice>> => {
    return apiClient.finance.put(`/receivables/${id}`, data);
  },

  deleteSalesInvoice: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/receivables/${id}`);
  },

  listPurchaseInvoices: (params?: {
    supplier_id?: string;
    status?: string | string[];
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<PurchaseInvoice>>> => {
    return apiClient.finance.get('/payables', { params });
  },

  getPurchaseInvoice: (id: string): Promise<ApiResponse<PurchaseInvoice>> => {
    return apiClient.finance.get(`/payables/${id}`);
  },

  createPurchaseInvoice: (
    data: Partial<PurchaseInvoice>
  ): Promise<ApiResponse<PurchaseInvoice>> => {
    return apiClient.finance.post('/payables', data);
  },

  updatePurchaseInvoice: (
    id: string,
    data: Partial<PurchaseInvoice>
  ): Promise<ApiResponse<PurchaseInvoice>> => {
    return apiClient.finance.put(`/payables/${id}`, data);
  },

  deletePurchaseInvoice: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/payables/${id}`);
  },

  listCollections: (params?: {
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<CollectionRecord>>> => {
    return apiClient.finance.get('/ar/collections', { params });
  },

  createCollection: (data: Partial<CollectionRecord>): Promise<ApiResponse<CollectionRecord>> => {
    return apiClient.finance.post('/ar/collections', data);
  },

  listPayments: (params?: {
    supplier_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<PaymentRecord>>> => {
    return apiClient.finance.get('/ap/payments', { params });
  },

  createPayment: (data: Partial<PaymentRecord>): Promise<ApiResponse<PaymentRecord>> => {
    return apiClient.finance.post('/ap/payments', data);
  },

  approvePayment: (id: string): Promise<ApiResponse<PaymentRecord>> => {
    return apiClient.finance.post(`/ap/payments/${id}/approve`);
  },

  rejectPayment: (id: string): Promise<ApiResponse<PaymentRecord>> => {
    return apiClient.finance.post(`/ap/payments/${id}/reject`);
  },

  reconcile: (params: {
    type: 'ar' | 'ap';
    invoice_id: string;
    record_ids: string[];
  }): Promise<ApiResponse<void>> => {
    return apiClient.finance.post('/reconcile', params);
  },

  autoReconcile: (params: {
    type: 'ar' | 'ap';
    entity_id: string;
    period: string;
  }): Promise<ApiResponse<{ reconciled: number }>> => {
    return apiClient.finance.post('/reconcile/auto', params);
  },

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
    return apiClient.finance.get('/ar/aging', { params });
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
    return apiClient.finance.get('/ap/aging', { params });
  },
};

export default receivablePayableApi;

interface ReceivablePayableQueryParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
  [key: string]: unknown;
}

const buildReceivablePayableParams = (
  params?: ReceivablePayableQueryParams
): Record<string, unknown> | undefined => {
  if (!params) return undefined;
  const { page, pagesize, ...rest } = params;
  const out: Record<string, unknown> = { ...rest };
  if (page !== undefined) out.page = page;
  if (pagesize !== undefined) out.pagesize = pagesize;
  return out;
};

export const receivableApi = {
  list: (
    params?: ReceivablePayableQueryParams
  ): Promise<ApiResponse<PaginatedResult<Receivable>>> => {
    return apiClient.finance.get('/receivables', { params: buildReceivablePayableParams(params) });
  },
  get: (id: string): Promise<ApiResponse<Receivable>> => {
    return apiClient.finance.get(`/receivables/${id}`);
  },
  create: (data: Partial<Receivable>): Promise<ApiResponse<Receivable>> => {
    return apiClient.finance.post('/receivables', data);
  },
  update: (id: string, data: Partial<Receivable>): Promise<ApiResponse<Receivable>> => {
    return apiClient.finance.put(`/receivables/${id}`, data);
  },
  delete: (id: string): Promise<ApiResponse<string>> => {
    return apiClient.finance.delete(`/receivables/${id}`);
  },
};

export const payableApi = {
  list: (params?: ReceivablePayableQueryParams): Promise<ApiResponse<PaginatedResult<Payable>>> => {
    return apiClient.finance.get('/payables', { params: buildReceivablePayableParams(params) });
  },
  get: (id: string): Promise<ApiResponse<Payable>> => {
    return apiClient.finance.get(`/payables/${id}`);
  },
  create: (data: Partial<Payable>): Promise<ApiResponse<Payable>> => {
    return apiClient.finance.post('/payables', data);
  },
  update: (id: string, data: Partial<Payable>): Promise<ApiResponse<Payable>> => {
    return apiClient.finance.put(`/payables/${id}`, data);
  },
  delete: (id: string): Promise<ApiResponse<string>> => {
    return apiClient.finance.delete(`/payables/${id}`);
  },
};
