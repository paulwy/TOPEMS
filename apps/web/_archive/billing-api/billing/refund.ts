/**
 * Billing · 退款管理 API 绑定
 *
 * 后端: svc/billing/src/handlers.rs
 * 路由:
 *   POST   /payments/{id}/refund
 *   GET    /refunds
 *   GET    /refunds/{id}
 *   POST   /refunds/{id}/approve
 *   POST   /refunds/{id}/reject
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

type RefundStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';

interface RefundRecord {
  id: string;
  payment_id: string;
  invoice_id?: string;
  tenant_id?: string;
  amount: number;
  currency: string;
  reason?: string;
  status: RefundStatus;
  approved_by?: string;
  approved_at?: string;
  rejected_reason?: string;
  completed_at?: string;
  gateway_refund_id?: string;
  created_at: string;
  updated_at: string;
}

interface CreateRefundRequest {
  payment_id: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

interface RefundQuery {
  payment_id?: string;
  invoice_id?: string;
  status?: RefundStatus;
  tenant_id?: string;
}

const buildQuery = (params?: RefundQuery): string => {
  if (!params) return '';
  const usp = new URLSearchParams();
  if (params.payment_id) usp.set('payment_id', params.payment_id);
  if (params.invoice_id) usp.set('invoice_id', params.invoice_id);
  if (params.status) usp.set('status', params.status);
  if (params.tenant_id) usp.set('tenant_id', params.tenant_id);
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
};

export const refundApi = {
  listRefunds: async (params?: RefundQuery): Promise<ApiResponse<RefundRecord[]>> => {
    return apiClient.billing.get(`/refunds${buildQuery(params)}`);
  },

  getRefund: async (id: string): Promise<ApiResponse<RefundRecord>> => {
    return apiClient.billing.get(`/refunds/${id}`);
  },

  createRefund: async (data: CreateRefundRequest): Promise<ApiResponse<RefundRecord>> => {
    return apiClient.billing.post('/refunds', data);
  },

  approveRefund: async (
    id: string,
    data?: { reason?: string }
  ): Promise<ApiResponse<RefundRecord>> => {
    return apiClient.billing.post(`/refunds/${id}/approve`, data || {});
  },

  rejectRefund: async (
    id: string,
    data?: { reason?: string }
  ): Promise<ApiResponse<RefundRecord>> => {
    return apiClient.billing.post(`/refunds/${id}/reject`, data || {});
  },
};

export default refundApi;
