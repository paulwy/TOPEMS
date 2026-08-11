/**
 * Billing · 发票管理 API 绑定
 *
 * 后端: svc/billing/src/handlers.rs
 * 路由:
 *   GET    /invoices/{tenant_id}
 *   GET    /invoices
 *   POST   /invoices
 *   GET    /invoices/{id}
 *   PUT    /invoices/{id}
 *   DELETE /invoices/{id}
 *   POST   /invoices/{id}/mark-paid
 *   POST   /invoices/{id}/void
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'void' | 'cancelled';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  tax_rate?: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  subscription_id?: string;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal_cents: number;
  discount_cents?: number;
  tax_cents?: number;
  total_cents: number;
  period_start?: string;
  period_end?: string;
  paid_at?: string;
  payment_method?: string;
  payment_reference?: string;
  line_items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceRequest {
  tenant_id: string;
  subscription_id?: string;
  period_start: string;
  period_end: string;
  line_items: InvoiceItem[];
  payment_method?: string;
}

export interface UpdateInvoiceRequest {
  status?: InvoiceStatus;
  discount_cents?: number;
  payment_method?: string;
}

export interface ListInvoiceQuery {
  tenant_id?: string;
  status?: InvoiceStatus;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

const buildQuery = (params?: ListInvoiceQuery): string => {
  if (!params) return '';
  const usp = new URLSearchParams();
  if (params.tenant_id) usp.set('tenant_id', params.tenant_id);
  if (params.status) usp.set('status', params.status);
  if (params.start_date) usp.set('start_date', params.start_date);
  if (params.end_date) usp.set('end_date', params.end_date);
  if (params.page !== undefined) usp.set('page', String(params.page));
  if (params.page_size !== undefined) usp.set('page_size', String(params.page_size));
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
};

export const invoiceApi = {
  listInvoices: async (params?: ListInvoiceQuery): Promise<ApiResponse<Invoice[]>> => {
    return apiClient.billing.get(`/invoices${buildQuery(params)}`);
  },

  listTenantInvoices: async (tenantId: string): Promise<ApiResponse<Invoice[]>> => {
    return apiClient.billing.get(`/invoices/${tenantId}`);
  },

  getInvoice: async (id: string): Promise<ApiResponse<Invoice>> => {
    return apiClient.billing.get(`/invoices/${id}`);
  },

  createInvoice: async (data: CreateInvoiceRequest): Promise<ApiResponse<Invoice>> => {
    return apiClient.billing.post('/invoices', data);
  },

  updateInvoice: async (id: string, data: UpdateInvoiceRequest): Promise<ApiResponse<Invoice>> => {
    return apiClient.billing.put(`/invoices/${id}`, data);
  },

  deleteInvoice: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.billing.delete(`/invoices/${id}`);
  },

  markInvoicePaid: async (
    id: string,
    data?: { payment_date?: string; payment_method?: string; payment_reference?: string }
  ): Promise<ApiResponse<Invoice>> => {
    return apiClient.billing.post(`/invoices/${id}/mark-paid`, data || {});
  },

  voidInvoice: async (id: string, data?: { reason?: string }): Promise<ApiResponse<Invoice>> => {
    return apiClient.billing.post(`/invoices/${id}/void`, data || {});
  },

  sendInvoice: async (
    id: string,
    data?: { email?: string }
  ): Promise<ApiResponse<{ sent: boolean }>> => {
    return apiClient.billing.post(`/invoices/${id}/send`, data || {});
  },

  downloadInvoice: async (id: string): Promise<ApiResponse<Blob>> => {
    return apiClient.billing.get(`/invoices/${id}/download`);
  },
};

export default invoiceApi;
