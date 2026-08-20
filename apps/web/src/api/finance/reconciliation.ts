import { apiClient } from '../client';
import type { ApiResponse } from '../client';

interface ReconciliationOrder {
  id?: string;
  order_no?: string;
  counterparty_id?: string;
  counterparty_name?: string;
  period?: string;
  start_date?: string;
  end_date?: string;
  total_amount?: number;
  matched_amount?: number;
  unmatched_amount?: number;
  status?: 'draft' | 'pending' | 'confirmed' | 'disputed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
  items?: ReconciliationItem[];
}

interface ReconciliationItem {
  id?: string;
  order_id?: string;
  source_type?: string;
  source_id?: string;
  source_no?: string;
  source_date?: string;
  source_amount?: number;
  matched?: boolean;
  match_id?: string;
  match_amount?: number;
  difference?: number;
  status?: 'unmatched' | 'matched' | 'disputed';
  remark?: string;
}

interface ReconciliationCreateRequest {
  counterparty_id?: string;
  period?: string;
  start_date?: string;
  end_date?: string;
  counterparty_ids?: string[];
}

export const reconciliationApi = {
  list: (params?: {
    status?: string;
    counterparty_id?: string;
    period?: string;
    keyword?: string;
  }): Promise<ApiResponse<ReconciliationOrder[]>> => {
    return apiClient.finance.get('/reconcile', { params });
  },

  get: (orderId: string): Promise<ApiResponse<ReconciliationOrder>> => {
    return apiClient.finance.get(`/reconcile/${orderId}`);
  },

  create: (data: ReconciliationCreateRequest): Promise<ApiResponse<ReconciliationOrder>> => {
    return apiClient.finance.post('/reconcile', data);
  },

  autoReconcile: (
    data: ReconciliationCreateRequest
  ): Promise<
    ApiResponse<{
      reconciled_count: number;
      total_difference: number;
      orders: ReconciliationOrder[];
    }>
  > => {
    return apiClient.finance.post('/reconcile/auto', data);
  },

  confirm: (orderId: string): Promise<ApiResponse<ReconciliationOrder>> => {
    return apiClient.finance.post(`/reconcile/${orderId}/confirm`, {});
  },

  dispute: (
    orderId: string,
    data: { reason: string }
  ): Promise<ApiResponse<ReconciliationOrder>> => {
    return apiClient.finance.post(`/reconcile/${orderId}/dispute`, data);
  },

  cancel: (orderId: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.post(`/reconcile/${orderId}/cancel`, {});
  },

  updateItem: (
    orderId: string,
    itemId: string,
    data: Partial<ReconciliationItem>
  ): Promise<ApiResponse<ReconciliationItem>> => {
    return apiClient.finance.put(`/reconcile/${orderId}/items/${itemId}`, data);
  },

  getItems: (orderId: string): Promise<ApiResponse<ReconciliationItem[]>> => {
    return apiClient.finance.get(`/reconcile/${orderId}/items`);
  },
};

export default reconciliationApi;
