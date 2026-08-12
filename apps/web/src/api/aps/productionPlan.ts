import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { ProductionPlan, CreateProductionPlanRequest, UpdateProductionPlanRequest, PaginationParams } from './types';

export const productionPlanApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<ProductionPlan>>> => {
    return apiClient.aps.get('/production-plans', { params });
  },

  get: async (id: string): Promise<ApiResponse<ProductionPlan>> => {
    return apiClient.aps.get(`/production-plans/${id}`);
  },

  create: async (data: CreateProductionPlanRequest): Promise<ApiResponse<ProductionPlan>> => {
    return apiClient.aps.post('/production-plans', data);
  },

  update: async (id: string, data: UpdateProductionPlanRequest): Promise<ApiResponse<ProductionPlan>> => {
    return apiClient.aps.put(`/production-plans/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.aps.delete(`/production-plans/${id}`);
  },
};

export default productionPlanApi;
