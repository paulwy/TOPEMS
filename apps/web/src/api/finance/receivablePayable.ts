import { apiClient } from '../client';
import type {
  SalesInvoice,
  PurchaseInvoice,
  CollectionRecord,
  PaymentRecord,
  PaginatedResult,
  ApiResponse,
} from '../../types/finance';

export const receivablePayableApi = {
  listSalesInvoices: (params?: {
    customer_id?: string;
    status?: string | string[];
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<SalesInvoice>>> => {
    return apiClient.erp.get('/receivables', { params });
  },

  getSalesInvoice: (id: string): Promise<ApiResponse<SalesInvoice>> => {
    return apiClient.erp.get(`/receivables/${id}`);
  },

  createSalesInvoice: (data: Partial<SalesInvoice>): Promise<ApiResponse<SalesInvoice>> => {
    return apiClient.erp.post('/receivables', data);
  },

  updateSalesInvoice: (
    id: string,
    data: Partial<SalesInvoice>
  ): Promise<ApiResponse<SalesInvoice>> => {
    return apiClient.erp.put(`/receivables/${id}`, data);
  },

  deleteSalesInvoice: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.delete(`/receivables/${id}`);
  },

  listPurchaseInvoices: (params?: {
    supplier_id?: string;
    status?: string | string[];
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<PurchaseInvoice>>> => {
    return apiClient.erp.get('/payables', { params });
  },

  getPurchaseInvoice: (id: string): Promise<ApiResponse<PurchaseInvoice>> => {
    return apiClient.erp.get(`/payables/${id}`);
  },

  createPurchaseInvoice: (
    data: Partial<PurchaseInvoice>
  ): Promise<ApiResponse<PurchaseInvoice>> => {
    return apiClient.erp.post('/payables', data);
  },

  updatePurchaseInvoice: (
    id: string,
    data: Partial<PurchaseInvoice>
  ): Promise<ApiResponse<PurchaseInvoice>> => {
    return apiClient.erp.put(`/payables/${id}`, data);
  },

  deletePurchaseInvoice: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.delete(`/payables/${id}`);
  },

  listCollections: (params?: {
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<CollectionRecord>>> => {
    return apiClient.erp.get('/finance/ar/collections', { params });
  },

  createCollection: (data: Partial<CollectionRecord>): Promise<ApiResponse<CollectionRecord>> => {
    return apiClient.erp.post('/finance/ar/collections', data);
  },

  listPayments: (params?: {
    supplier_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<PaymentRecord>>> => {
    return apiClient.erp.get('/finance/ap/payments', { params });
  },

  createPayment: (data: Partial<PaymentRecord>): Promise<ApiResponse<PaymentRecord>> => {
    return apiClient.erp.post('/finance/ap/payments', data);
  },

  reconcile: (params: {
    type: 'ar' | 'ap';
    invoice_id: string;
    record_ids: string[];
  }): Promise<ApiResponse<void>> => {
    return apiClient.erp.post('/finance/reconcile', params);
  },

  autoReconcile: (params: {
    type: 'ar' | 'ap';
    entity_id: string;
    period: string;
  }): Promise<ApiResponse<{ reconciled: number }>> => {
    return apiClient.erp.post('/finance/reconcile/auto', params);
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
    return apiClient.erp.get('/finance/ar/aging', { params });
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
    return apiClient.erp.get('/finance/ap/aging', { params });
  },
};

export default receivablePayableApi;
