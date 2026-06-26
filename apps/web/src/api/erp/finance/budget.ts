import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import { cleanEmptyUuids } from '../utils';
import type {
  Budget,
  Expense,
  PaginationParams,
  PaginatedResult,
} from '../types';

export const budgetApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Budget>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/erp/budgets${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Budget>> {
    return apiClient.erp.get(`/api/erp/budgets/${id}`);
  },

  async create(data: Partial<Budget>): Promise<ApiResponse<Budget>> {
    return apiClient.erp.post('/api/erp/budgets', cleanEmptyUuids(data));
  },

  async update(id: string, data: Partial<Budget>): Promise<ApiResponse<Budget>> {
    return apiClient.erp.put(`/api/erp/budgets/${id}`, cleanEmptyUuids(data));
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/budgets/${id}`);
  },
};

export const expenseApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Expense>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/erp/expenses${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Expense>> {
    return apiClient.erp.get(`/api/erp/expenses/${id}`);
  },

  async create(data: Partial<Expense>): Promise<ApiResponse<Expense>> {
    return apiClient.erp.post('/api/erp/expenses', cleanEmptyUuids(data));
  },

  async update(id: string, data: Partial<Expense>): Promise<ApiResponse<Expense>> {
    return apiClient.erp.put(`/api/erp/expenses/${id}`, cleanEmptyUuids(data));
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/expenses/${id}`);
  },
};
