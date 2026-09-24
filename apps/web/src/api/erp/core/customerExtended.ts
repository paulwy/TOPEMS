import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { Customer, CreateCustomerRequest, UpdateCustomerRequest } from './types';

interface BatchStatusUpdateRequest {
  ids: string[];
  status: 'active' | 'inactive' | 'blacklisted';
}

interface BatchCategoryUpdateRequest {
  ids: string[];
  category?: string;
  industry?: string;
}

interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  page_size: number;
}

export const customerExtendedApi = {
  async listByIds(ids: string[]): Promise<ApiResponse<Customer[]>> {
    return apiClient.erp.post<Customer[]>('/customers/batch-list', { ids });
  },

  async createBatch(data: CreateCustomerRequest[]): Promise<ApiResponse<Customer[]>> {
    return apiClient.erp.post<Customer[]>('/customers/batch', { customers: data });
  },

  async updateBatch(
    data: Array<{ id: string; payload: UpdateCustomerRequest }>
  ): Promise<ApiResponse<Customer[]>> {
    return apiClient.erp.put<Customer[]>('/customers/batch', { updates: data });
  },

  async removeBatch(ids: string[]): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>('/customers/batch', { data: { ids } });
  },

  async changeStatus(id: string, status: Customer['status']): Promise<ApiResponse<Customer>> {
    return apiClient.erp.put<Customer>(`/customers/${id}/status`, { status });
  },

  async activate(id: string): Promise<ApiResponse<Customer>> {
    return this.changeStatus(id, 'active');
  },

  async deactivate(id: string): Promise<ApiResponse<Customer>> {
    return this.changeStatus(id, 'inactive');
  },

  async blacklist(id: string): Promise<ApiResponse<Customer>> {
    return this.changeStatus(id, 'blacklisted');
  },

  async batchChangeStatus(req: BatchStatusUpdateRequest): Promise<ApiResponse<Customer[]>> {
    return apiClient.erp.post<Customer[]>('/customers/batch/status', req);
  },

  async batchChangeCategory(req: BatchCategoryUpdateRequest): Promise<ApiResponse<Customer[]>> {
    return apiClient.erp.post<Customer[]>('/customers/batch/category', req);
  },

  async getStats(): Promise<
    ApiResponse<{
      total: number;
      active: number;
      inactive: number;
      blacklisted: number;
      byCategory: Array<{ category: string; count: number }>;
    }>
  > {
    return apiClient.erp.get('/customers/stats');
  },

  async listRecentlyModified(limit = 20): Promise<ApiResponse<CustomerListResponse>> {
    return apiClient.erp.get<CustomerListResponse>(`/customers/recent?limit=${limit}`);
  },
};
