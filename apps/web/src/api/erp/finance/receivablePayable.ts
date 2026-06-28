import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import { cleanEmptyUuids } from '../utils';
import type { Receivable, Payable, PaginationParams, PaginatedResult } from '../types';

export const receivableApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Receivable>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/erp/receivables${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Receivable>> {
    return apiClient.erp.get(`/api/erp/receivables/${id}`);
  },

  async create(data: Partial<Receivable>): Promise<ApiResponse<Receivable>> {
    return apiClient.erp.post('/api/erp/receivables', cleanEmptyUuids(data));
  },

  async update(id: string, data: Partial<Receivable>): Promise<ApiResponse<Receivable>> {
    return apiClient.erp.put(`/api/erp/receivables/${id}`, cleanEmptyUuids(data));
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/receivables/${id}`);
  },
};

export const payableApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Payable>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/erp/payables${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Payable>> {
    return apiClient.erp.get(`/api/erp/payables/${id}`);
  },

  async create(data: Partial<Payable>): Promise<ApiResponse<Payable>> {
    return apiClient.erp.post('/api/erp/payables', cleanEmptyUuids(data));
  },

  async update(id: string, data: Partial<Payable>): Promise<ApiResponse<Payable>> {
    return apiClient.erp.put(`/api/erp/payables/${id}`, cleanEmptyUuids(data));
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/payables/${id}`);
  },
};
