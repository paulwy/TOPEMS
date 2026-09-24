import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PaginationParams,
  ProductionProcess,
  CreateProductionProcessRequest,
  UpdateProductionProcessRequest,
} from './types';

export const productionProcessApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      processes: ProductionProcess[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/processes${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProductionProcess>> {
    return apiClient.mes.get(`/processes/${id}`);
  },

  async create(data: CreateProductionProcessRequest): Promise<ApiResponse<ProductionProcess>> {
    return apiClient.mes.post('/processes', data);
  },

  async update(
    id: string,
    data: UpdateProductionProcessRequest
  ): Promise<ApiResponse<ProductionProcess>> {
    return apiClient.mes.put(`/processes/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/processes/${id}`);
  },

  async deactivate(id: string): Promise<ApiResponse<ProductionProcess>> {
    return apiClient.mes.put(`/processes/${id}/deactivate`);
  },
};
