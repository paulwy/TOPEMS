import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export interface Expense {
  id?: string;
  expense_no?: string;
  title?: string;
  description?: string;
  amount?: number;
  currency?: string;
  category?: string;
  sub_category?: string;
  expense_date?: string;
  department_id?: string;
  project_id?: string;
  employee_id?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  payment_method?: string;
  voucher_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const expenseApi = {
  list: (params?: {
    status?: string;
    category?: string;
    department_id?: string;
    employee_id?: string;
    start_date?: string;
    end_date?: string;
    keyword?: string;
  }): Promise<ApiResponse<Expense[]>> => {
    return apiClient.finance.get('/expenses', { params });
  },

  get: (id: string): Promise<ApiResponse<Expense>> => {
    return apiClient.finance.get(`/expenses/${id}`);
  },

  create: (data: Partial<Expense>): Promise<ApiResponse<Expense>> => {
    return apiClient.finance.post('/expenses', data);
  },

  update: (id: string, data: Partial<Expense>): Promise<ApiResponse<Expense>> => {
    return apiClient.finance.put(`/expenses/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/expenses/${id}`);
  },
};

export default expenseApi;