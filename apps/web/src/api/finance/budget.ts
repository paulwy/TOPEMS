import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export interface Budget {
  id?: string;
  code?: string;
  name?: string;
  period?: string;
  start_date?: string;
  end_date?: string;
  status?: 'draft' | 'active' | 'closed';
  total_amount?: number;
  used_amount?: number;
  remaining_amount?: number;
  department_id?: string;
  project_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const budgetApi = {
  list: (params?: {
    status?: string;
    period?: string;
    department_id?: string;
    keyword?: string;
  }): Promise<ApiResponse<Budget[]>> => {
    return apiClient.finance.get('/budgets', { params });
  },

  get: (id: string): Promise<ApiResponse<Budget>> => {
    return apiClient.finance.get(`/budgets/${id}`);
  },

  create: (data: Partial<Budget>): Promise<ApiResponse<Budget>> => {
    return apiClient.finance.post('/budgets', data);
  },

  update: (id: string, data: Partial<Budget>): Promise<ApiResponse<Budget>> => {
    return apiClient.finance.put(`/budgets/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/budgets/${id}`);
  },
};

export default budgetApi;
