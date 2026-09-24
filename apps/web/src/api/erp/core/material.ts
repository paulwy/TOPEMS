import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type {
  PaginationParams,
  Material,
  CreateMaterialRequest,
  UpdateMaterialRequest,
} from './types';

export const materialApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      materials: Material[];
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
    if (params?.category) searchParams.set('category', params.category);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/materials${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Material>> {
    return apiClient.erp.get(`/materials/${id}`);
  },

  async create(data: CreateMaterialRequest): Promise<ApiResponse<Material>> {
    return apiClient.erp.post('/materials', data);
  },

  async update(id: string, data: UpdateMaterialRequest): Promise<ApiResponse<Material>> {
    return apiClient.erp.put(`/materials/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/materials/${id}`);
  },
};
