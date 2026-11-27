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
  status?: string;
  payment_method?: string;
  voucher_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const expenseApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    category?: string;
    department_id?: string;
    employee_id?: string;
    start_date?: string;
    end_date?: string;
    keyword?: string;
    [key: string]: unknown;
  }): Promise<ApiResponse<{ items: Expense[]; total: number; [key: string]: unknown }>> => {
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

  /**
   * B357：支付专用动作（approved → paid）。
   *
   * 只写 status / reimbursed_at / updated_at，不接受金额等字段改写；
   * 非 approved 记录服务端返回 409，前端仅在 status=approved 时展示入口。
   */
  pay: (id: string): Promise<ApiResponse<Expense>> => {
    return apiClient.finance.post(`/expenses/${id}/pay`, {});
  },
};

export default expenseApi;
