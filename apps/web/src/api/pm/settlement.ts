import { apiClient } from '../client';

export const settlementApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/settlements`);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/settlements/${id}`);
  },

  create: async (
    projectId: string,
    data: {
      settlement_code?: string;
      settlement_name: string;
      settlement_type: string;
      settlement_period_start?: string;
      settlement_period_end?: string;
      description?: string;
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/projects/${projectId}/settlements`, data);
  },

  update: async (
    id: string,
    data: {
      settlement_name?: string;
      status?: string;
      actual_amount?: number;
      description?: string;
    }
  ) => {
    return apiClient.pm.put(`/settlements/${id}`, data);
  },

  approve: async (id: string) => {
    return apiClient.pm.post(`/settlements/${id}/approve`);
  },
};

export const settlementItemApi = {
  list: async (settlementId: string) => {
    return apiClient.pm.get(`/settlements/${settlementId}/items`);
  },

  create: async (
    settlementId: string,
    data: {
      item_code?: string;
      item_name: string;
      category?: string;
      budget_amount: number;
      actual_amount: number;
      description?: string;
      expense_ref_id?: string;
      contract_ref_id?: string;
    }
  ) => {
    return apiClient.pm.post(`/settlements/${settlementId}/items`, data);
  },

  update: async (
    id: string,
    data: {
      item_name?: string;
      category?: string;
      actual_amount?: number;
      description?: string;
    }
  ) => {
    return apiClient.pm.put(`/settlement-items/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.pm.delete(`/settlement-items/${id}`);
  },
};

export const settlementAdjustmentApi = {
  list: async (settlementId: string) => {
    return apiClient.pm.get(`/settlements/${settlementId}/adjustments`);
  },

  create: async (
    settlementId: string,
    data: {
      adjustment_type: string;
      adjustment_code?: string;
      description?: string;
      amount: number;
      reason?: string;
      supporting_documents?: Record<string, unknown>;
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/settlements/${settlementId}/adjustments`, data);
  },
};

export default settlementApi;
