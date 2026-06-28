import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PaginationParams,
  ProductionRecord,
  CreateProductionRecordRequest,
  UpdateProductionRecordRequest,
  CompleteRecordRequest,
} from './types';

export const productionRecordApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      records: ProductionRecord[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/records${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProductionRecord>> {
    return apiClient.mes.get(`/api/mes/records/${id}`);
  },

  async create(data: CreateProductionRecordRequest): Promise<ApiResponse<ProductionRecord>> {
    return apiClient.mes.post('/api/mes/records', data);
  },

  async update(
    id: string,
    data: UpdateProductionRecordRequest
  ): Promise<ApiResponse<ProductionRecord>> {
    return apiClient.mes.put(`/api/mes/records/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/records/${id}`);
  },

  async complete(id: string, data: CompleteRecordRequest): Promise<ApiResponse<ProductionRecord>> {
    return apiClient.mes.put(`/api/mes/records/${id}/complete`, data);
  },
};
