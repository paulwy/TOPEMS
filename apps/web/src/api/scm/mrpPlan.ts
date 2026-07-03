import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  MrpPlan,
  CreateMrpPlanRequest,
  UpdateMrpPlanRequest,
  MrpPlanQueryParams,
  MrpCalculationResult,
} from './types';

export const mrpPlanApi = {
  list: async (params?: MrpPlanQueryParams): Promise<ApiResponse<PaginatedResponse<MrpPlan>>> => {
    return apiClient.scm.get('/mrp/suggestions', { params });
  },

  create: async (data: CreateMrpPlanRequest): Promise<ApiResponse<MrpPlan>> => {
    return apiClient.scm.post('/mrp/suggestions', data);
  },

  get: async (id: string): Promise<ApiResponse<MrpPlan>> => {
    return apiClient.scm.get(`/mrp/suggestions/${id}`);
  },

  update: async (id: string, data: UpdateMrpPlanRequest): Promise<ApiResponse<MrpPlan>> => {
    return apiClient.scm.put(`/mrp/suggestions/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/mrp/suggestions/${id}`);
  },

  calculate: async (id: string): Promise<ApiResponse<MrpCalculationResult>> => {
    return apiClient.scm.post(`/mrp/suggestions/${id}/confirm`);
  },
};
