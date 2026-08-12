import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { MaterialPlan, CreateMaterialPlanRequest, UpdateMaterialPlanRequest, PaginationParams } from './types';

export const materialPlanApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<MaterialPlan>>> => {
    return apiClient.aps.get('/material-plans', { params });
  },

  get: async (id: string): Promise<ApiResponse<MaterialPlan>> => {
    return apiClient.aps.get(`/material-plans/${id}`);
  },

  create: async (data: CreateMaterialPlanRequest): Promise<ApiResponse<MaterialPlan>> => {
    return apiClient.aps.post('/material-plans', data);
  },

  update: async (id: string, data: UpdateMaterialPlanRequest): Promise<ApiResponse<MaterialPlan>> => {
    return apiClient.aps.put(`/material-plans/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.aps.delete(`/material-plans/${id}`);
  },
};

export default materialPlanApi;
