import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type {
  PaginationParams,
  Inventory,
  CreateInventoryRequest,
  UpdateInventoryRequest,
} from './types';

export const inventoryApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      items: Inventory[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('page_size', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/inventory${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Inventory>> {
    return apiClient.erp.get(`/inventory/${id}`);
  },

  async create(data: CreateInventoryRequest): Promise<ApiResponse<Inventory>> {
    return apiClient.erp.post('/inventory', data);
  },

  async update(id: string, data: UpdateInventoryRequest): Promise<ApiResponse<Inventory>> {
    return apiClient.erp.put(`/inventory/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/inventory/${id}`);
  },

  async getLowStock(): Promise<ApiResponse<Inventory[]>> {
    return apiClient.erp.get('/inventory/low-stock');
  },
};
