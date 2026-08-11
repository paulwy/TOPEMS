import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export interface SettlementReconciliation {
  id?: string;
  reconciliation_code?: string;
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
}

export interface Settlement {
  id?: string;
  settlement_code?: string;
  settlement_name?: string;
  project_id?: string;
  project_name?: string;
  settlement_type?: string;
  status?: 'draft' | 'pending' | 'approved' | 'completed' | 'cancelled';
  amount?: number;
  currency?: string;
  settlement_date?: string;
  linked_reconciliations?: SettlementReconciliation[];
  created_at?: string;
  updated_at?: string;
}

export interface SettlementLink {
  id?: string;
  reconciliation_id?: string;
  settlement_id?: string;
  status?: 'active' | 'inactive';
  created_at?: string;
}

export interface SettlementDifference {
  id?: string;
  reconciliation_id?: string;
  field_name?: string;
  expected_value?: string;
  actual_value?: string;
  difference_amount?: number;
  status?: 'pending' | 'approved' | 'rejected';
  remark?: string;
  created_at?: string;
}

export interface SettlementDashboard {
  total_reconciliations?: number;
  pending_reconciliations?: number;
  total_settlements?: number;
  pending_settlements?: number;
  completed_settlements?: number;
  total_amount?: number;
  pending_amount?: number;
}

export const settlementCenterApi = {
  listReconciliations: (params?: {
    status?: string;
    counterparty_id?: string;
    period?: string;
    keyword?: string;
  }): Promise<ApiResponse<SettlementReconciliation[]>> => {
    return apiClient.finance.get('/api/core/settlement-center/reconciliations', { params });
  },

  getReconciliation: (id: string): Promise<ApiResponse<SettlementReconciliation>> => {
    return apiClient.finance.get(`/api/core/settlement-center/reconciliations/${id}`);
  },

  createReconciliation: (data: Partial<SettlementReconciliation>): Promise<ApiResponse<SettlementReconciliation>> => {
    return apiClient.finance.post('/api/core/settlement-center/reconciliations', data);
  },

  reconcile: (id: string, data?: Record<string, unknown>): Promise<ApiResponse<SettlementReconciliation>> => {
    return apiClient.finance.post(`/api/core/settlement-center/reconciliations/${id}/reconcile`, data || {});
  },

  autoReconcile: (data: {
    counterparty_ids?: string[];
    period?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<{ reconciled_count: number; total_difference: number }>> => {
    return apiClient.finance.post('/api/core/settlement-center/auto-reconcile', data);
  },

  listSettlements: (params?: {
    status?: string;
    type?: string;
    keyword?: string;
  }): Promise<ApiResponse<Settlement[]>> => {
    return apiClient.finance.get('/api/core/settlement-center/settlements', { params });
  },

  getSettlement: (id: string): Promise<ApiResponse<Settlement>> => {
    return apiClient.finance.get(`/api/core/settlement-center/settlements/${id}`);
  },

  createSettlement: (data: Partial<Settlement>): Promise<ApiResponse<Settlement>> => {
    return apiClient.finance.post('/api/core/settlement-center/settlements', data);
  },

  approveSettlement: (id: string): Promise<ApiResponse<Settlement>> => {
    return apiClient.finance.post(`/api/core/settlement-center/settlements/${id}/approve`, {});
  },

  listLinks: (params?: { reconciliation_id?: string; settlement_id?: string }): Promise<ApiResponse<SettlementLink[]>> => {
    return apiClient.finance.get('/api/core/settlement-center/links', { params });
  },

  createLink: (data: { reconciliation_id: string; settlement_id: string }): Promise<ApiResponse<SettlementLink>> => {
    return apiClient.finance.post('/api/core/settlement-center/links', data);
  },

  deleteLink: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/api/core/settlement-center/links/${id}`);
  },

  listDifferences: (params?: { reconciliation_id?: string; status?: string }): Promise<ApiResponse<SettlementDifference[]>> => {
    return apiClient.finance.get('/api/core/settlement-center/differences', { params });
  },

  createDifference: (data: Partial<SettlementDifference>): Promise<ApiResponse<SettlementDifference>> => {
    return apiClient.finance.post('/api/core/settlement-center/differences', data);
  },

  approveDifference: (id: string): Promise<ApiResponse<SettlementDifference>> => {
    return apiClient.finance.post(`/api/core/settlement-center/differences/${id}/approve`, {});
  },

  rejectDifference: (id: string): Promise<ApiResponse<SettlementDifference>> => {
    return apiClient.finance.post(`/api/core/settlement-center/differences/${id}/reject`, {});
  },

  getDashboard: (): Promise<ApiResponse<SettlementDashboard>> => {
    return apiClient.finance.get('/api/core/settlement-center/dashboard');
  },

  getStatistics: (params?: { period?: string; start_date?: string; end_date?: string }): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.finance.get('/api/core/settlement-center/statistics', { params });
  },
};

export default settlementCenterApi;