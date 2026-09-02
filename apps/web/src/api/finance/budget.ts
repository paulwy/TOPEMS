import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export interface Budget {
  id?: string;
  code?: string;
  name?: string;
  period?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  total_amount?: number;
  used_amount?: number;
  remaining_amount?: number;
  usage_rate?: number;
  department_id?: string;
  project_id?: string;
  created_at?: string;
  updated_at?: string;
  // 预算详情字段（FinanceBudgetDetailPage 使用）
  total_budget?: number;
  fiscal_year?: string;
  budget_type?: string;
  items?: BudgetItem[];
}

export interface BudgetItem {
  id: string;
  subject: string;
  category: string;
  budgetAmount: number;
  usedAmount: number;
  remainingAmount: number;
  usageRate: number;
}

export const budgetApi = {
  list: (params?: {
    page?: number;
    pagesize?: number;
    status?: string;
    period?: string;
    department_id?: string;
    keyword?: string;
    [key: string]: unknown;
  }): Promise<ApiResponse<{ items: Budget[]; total: number; [key: string]: unknown }>> => {
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
