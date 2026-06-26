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
  list: async (
    params?: MrpPlanQueryParams
  ): Promise<ApiResponse<PaginatedResponse<MrpPlan>>> => {
    return apiClient.scm.get('/api/scm/mrp-plans', { params });
  },

  create: async (data: CreateMrpPlanRequest): Promise<ApiResponse<MrpPlan>> => {
    return apiClient.scm.post('/api/scm/mrp-plans', data);
  },

  get: async (id: string): Promise<ApiResponse<MrpPlan>> => {
    return apiClient.scm.get(`/api/scm/mrp-plans/${id}`);
  },

  update: async (
    id: string,
    data: UpdateMrpPlanRequest
  ): Promise<ApiResponse<MrpPlan>> => {
    return apiClient.scm.put(`/api/scm/mrp-plans/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/mrp-plans/${id}`);
  },

  calculate: async (id: string): Promise<ApiResponse<MrpCalculationResult>> => {
    return apiClient.scm.post(`/api/scm/mrp-calculations/${id}`);
  },
};
