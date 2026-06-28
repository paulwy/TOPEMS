import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PaginationParams,
  MaterialRequirement,
  CreateMaterialRequirementRequest,
  UpdateMaterialRequirementRequest,
} from './types';

export const materialRequirementApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      requirements: MaterialRequirement[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(
      `/api/mes/material-requirements${queryString ? `?${queryString}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<MaterialRequirement>> {
    return apiClient.mes.get(`/api/mes/material-requirements/${id}`);
  },

  async create(data: CreateMaterialRequirementRequest): Promise<ApiResponse<MaterialRequirement>> {
    return apiClient.mes.post('/api/mes/material-requirements', data);
  },

  async update(
    id: string,
    data: UpdateMaterialRequirementRequest
  ): Promise<ApiResponse<MaterialRequirement>> {
    return apiClient.mes.put(`/api/mes/material-requirements/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/material-requirements/${id}`);
  },

  async calculate(orderId: string): Promise<ApiResponse<MaterialRequirement[]>> {
    return apiClient.mes.post(`/api/mes/material-requirements/calculate`, { order_id: orderId });
  },

  async confirm(id: string): Promise<ApiResponse<MaterialRequirement>> {
    return apiClient.mes.put(`/api/mes/material-requirements/${id}/confirm`);
  },

  async release(id: string): Promise<ApiResponse<MaterialRequirement>> {
    return apiClient.mes.put(`/api/mes/material-requirements/${id}/release`);
  },
};
