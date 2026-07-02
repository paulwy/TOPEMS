import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { ExpenseClaim, ExpenseItem, PaginationParams, PaginatedResult } from './types';

export const expenseApi = {
  listExpenseClaims: async (
    params?: PaginationParams & {
      applicant_id?: string;
      department_id?: string;
      expense_type?: string;
      start_date?: string;
      end_date?: string;
      min_amount?: number;
      max_amount?: number;
    }
  ): Promise<ApiResponse<PaginatedResult<ExpenseClaim>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.applicant_id) searchParams.set('applicant_id', params.applicant_id);
    if (params?.department_id) searchParams.set('department_id', params.department_id);
    if (params?.expense_type) searchParams.set('expense_type', params.expense_type);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.min_amount !== undefined)
      searchParams.set('min_amount', params.min_amount.toString());
    if (params?.max_amount !== undefined)
      searchParams.set('max_amount', params.max_amount.toString());

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/oa/expense-claims${queryString ? `?${queryString}` : ''}`);
  },

  getExpenseClaim: async (id: string): Promise<ApiResponse<ExpenseClaim>> => {
    return apiClient.erp.get(`/oa/expense-claims/${id}`);
  },

  createExpenseClaim: async (
    data: Partial<ExpenseClaim> & { items?: ExpenseItem[] }
  ): Promise<ApiResponse<ExpenseClaim>> => {
    return apiClient.erp.post('/oa/expense-claims', data);
  },

  updateExpenseClaim: async (
    id: string,
    data: Partial<ExpenseClaim> & { items?: ExpenseItem[] }
  ): Promise<ApiResponse<ExpenseClaim>> => {
    return apiClient.erp.put(`/oa/expense-claims/${id}`, data);
  },

  deleteExpenseClaim: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/oa/expense-claims/${id}`);
  },

  submitExpenseClaim: async (id: string): Promise<ApiResponse<ExpenseClaim>> => {
    return apiClient.erp.post(`/oa/expense-claims/${id}/submit`);
  },

  approveExpenseClaim: async (
    id: string,
    data?: { comment?: string }
  ): Promise<ApiResponse<ExpenseClaim>> => {
    return apiClient.erp.post(`/oa/expense-claims/${id}/approve`, data);
  },

  rejectExpenseClaim: async (
    id: string,
    data: { reason: string }
  ): Promise<ApiResponse<ExpenseClaim>> => {
    return apiClient.erp.post(`/oa/expense-claims/${id}/reject`, data);
  },

  getExpenseItems: async (claimId: string): Promise<ApiResponse<ExpenseItem[]>> => {
    return apiClient.erp.get(`/oa/expense-claims/${claimId}/items`);
  },

  getExpenseStats: async (params?: {
    start_date?: string;
    end_date?: string;
    group_by?: 'type' | 'department' | 'month';
  }): Promise<ApiResponse<{ total: number; count: number; by_group: Record<string, number> }>> => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.group_by) searchParams.set('group_by', params.group_by);

    return apiClient.erp.get(`/oa/expense-claims/stats?${searchParams.toString()}`);
  },

  getMyExpenses: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResult<ExpenseClaim>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.status) searchParams.set('status', params.status);

    return apiClient.erp.get(`/oa/expense-claims/my?${searchParams.toString()}`);
  },
};

export default expenseApi;
