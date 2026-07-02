import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { OfficeSupply, PaginationParams, PaginatedResult } from '../types';

export const officeSupplyApi = {
  async list(
    params?: PaginationParams & { category?: string }
  ): Promise<ApiResponse<PaginatedResult<OfficeSupply>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/office-supplies${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<OfficeSupply>> {
    return apiClient.erp.get(`/office-supplies/${id}`);
  },

  async create(data: Partial<OfficeSupply>): Promise<ApiResponse<OfficeSupply>> {
    return apiClient.erp.post('/office-supplies', data);
  },

  async update(id: string, data: Partial<OfficeSupply>): Promise<ApiResponse<OfficeSupply>> {
    return apiClient.erp.put(`/office-supplies/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/office-supplies/${id}`);
  },
};
