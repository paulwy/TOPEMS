/**
 * Billing · 支付管理 API 绑定
 *
 * 后端: svc/billing/src/handlers.rs
 * 路由:
 *   GET    /payments
 *   POST   /payments
 *   GET    /payments/{id}
 *   POST   /payments/{id}/refund
 *   POST   /payments/{id}/retry
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type PaymentMethod =
  'credit_card' | 'alipay' | 'wechat' | 'bank_transfer' | 'paypal' | 'stripe';

export type PaymentStatus =
  'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';

export interface PaymentRecord {
  id: string;
  invoice_id: string;
  tenant_id?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transaction_id?: string;
  gateway_response?: Record<string, unknown>;
  paid_at?: string;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

interface CreatePaymentRequest {
  invoice_id: string;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  metadata?: Record<string, unknown>;
}

interface PaymentQuery {
  invoice_id?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  tenant_id?: string;
  start_date?: string;
  end_date?: string;
}

const buildQuery = (params?: PaymentQuery): string => {
  if (!params) return '';
  const usp = new URLSearchParams();
  if (params.invoice_id) usp.set('invoice_id', params.invoice_id);
  if (params.status) usp.set('status', params.status);
  if (params.method) usp.set('method', params.method);
  if (params.tenant_id) usp.set('tenant_id', params.tenant_id);
  if (params.start_date) usp.set('start_date', params.start_date);
  if (params.end_date) usp.set('end_date', params.end_date);
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
};

export const paymentApi = {
  listPayments: async (params?: PaymentQuery): Promise<ApiResponse<PaymentRecord[]>> => {
    return apiClient.billing.get(`/payments${buildQuery(params)}`);
  },

  getPayment: async (id: string): Promise<ApiResponse<PaymentRecord>> => {
    return apiClient.billing.get(`/payments/${id}`);
  },

  createPayment: async (data: CreatePaymentRequest): Promise<ApiResponse<PaymentRecord>> => {
    return apiClient.billing.post('/payments', data);
  },

  retryPayment: async (id: string): Promise<ApiResponse<PaymentRecord>> => {
    return apiClient.billing.post(`/payments/${id}/retry`);
  },
};

export default paymentApi;
