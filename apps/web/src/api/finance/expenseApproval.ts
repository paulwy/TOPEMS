import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

interface ExpenseApprovalItem {
  id?: string;
  date: string;
  category: string;
  amount: number;
  receipt_no?: string;
  description?: string;
}

interface ExpenseApproval {
  id?: string;
  expense_no: string;
  employee_id: string;
  employee_name?: string;
  department?: string;
  expense_date: string;
  expense_type?: string;
  total_amount?: number;
  status?: string;
  description?: string;
  approver_id?: string;
  approver_name?: string;
  approval_note?: string;
  items?: ExpenseApprovalItem[];
  created_at?: string;
  updated_at?: string;
}

interface CreateExpenseApprovalRequest {
  expense_no: string;
  employee_id: string;
  employee_name?: string;
  department?: string;
  expense_date: string;
  expense_type?: string;
  total_amount?: number;
  status?: string;
  description?: string;
  approver_id?: string;
  approver_name?: string;
  approval_note?: string;
  items?: ExpenseApprovalItem[];
}

interface UpdateExpenseApprovalRequest {
  expense_no?: string;
  employee_id?: string;
  employee_name?: string;
  department?: string;
  expense_date?: string;
  expense_type?: string;
  total_amount?: number;
  status?: string;
  description?: string;
  approver_id?: string;
  approver_name?: string;
  approval_note?: string;
  items?: ExpenseApprovalItem[];
}

interface ExpenseApprovalQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  expense_type?: string;
  status?: string;
}

export const expenseApprovalApi = {
  list: async (
    params?: ExpenseApprovalQueryParams
  ): Promise<ApiResponse<PaginatedResponse<ExpenseApproval>>> => {
    return apiClient.finance.get('/expense-approvals', { params });
  },

  create: async (data: CreateExpenseApprovalRequest): Promise<ApiResponse<ExpenseApproval>> => {
    return apiClient.finance.post('/expense-approvals', data);
  },

  get: async (id: string): Promise<ApiResponse<ExpenseApproval>> => {
    return apiClient.finance.get(`/expense-approvals/${id}`);
  },

  update: async (
    id: string,
    data: UpdateExpenseApprovalRequest
  ): Promise<ApiResponse<ExpenseApproval>> => {
    return apiClient.finance.put(`/expense-approvals/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.finance.delete(`/expense-approvals/${id}`);
  },

  submit: async (id: string): Promise<ApiResponse<ExpenseApproval>> => {
    return apiClient.finance.post(`/expense-approvals/${id}/submit`, {});
  },

  approve: async (id: string): Promise<ApiResponse<ExpenseApproval>> => {
    return apiClient.finance.post(`/expense-approvals/${id}/approve`, {});
  },

  reject: async (id: string, reason?: string): Promise<ApiResponse<ExpenseApproval>> => {
    return apiClient.finance.post(`/expense-approvals/${id}/reject`, { reason });
  },
};

export default expenseApprovalApi;
