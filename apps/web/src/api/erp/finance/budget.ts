import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import { cleanEmptyUuids } from '../utils';
import type { Budget, Expense, PaginationParams, PaginatedResult } from '../types';

export const budgetApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Budget>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/budgets${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Budget>> {
    return apiClient.erp.get(`/budgets/${id}`);
  },

  async create(data: Partial<Budget>): Promise<ApiResponse<Budget>> {
    return apiClient.erp.post('/budgets', cleanEmptyUuids(data));
  },

  async update(id: string, data: Partial<Budget>): Promise<ApiResponse<Budget>> {
    return apiClient.erp.put(`/budgets/${id}`, cleanEmptyUuids(data));
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/budgets/${id}`);
  },
};

export const expenseApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Expense>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/expenses${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Expense>> {
    return apiClient.erp.get(`/expenses/${id}`);
  },

  async create(data: Partial<Expense>): Promise<ApiResponse<Expense>> {
    return apiClient.erp.post('/expenses', cleanEmptyUuids(data));
  },

  async update(id: string, data: Partial<Expense>): Promise<ApiResponse<Expense>> {
    return apiClient.erp.put(`/expenses/${id}`, cleanEmptyUuids(data));
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/expenses/${id}`);
  },
};
