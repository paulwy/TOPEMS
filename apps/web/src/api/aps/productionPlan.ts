import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  ProductionPlan,
  CreateProductionPlanRequest,
  UpdateProductionPlanRequest,
  PaginationParams,
  ApprovalRequest,
  ApprovalResponse,
} from './types';

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

  // ---- 审批端点 ----
  submit: async (id: string, operator: string, comment?: string): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.aps.post(`/production-plans/${id}/submit`, {
      operator,
      comment,
    } as ApprovalRequest);
  },

  approve: async (id: string, operator: string, comment?: string): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.aps.post(`/production-plans/${id}/approve`, {
      operator,
      comment,
    } as ApprovalRequest);
  },

  reject: async (id: string, operator: string, comment?: string): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.aps.post(`/production-plans/${id}/reject`, {
      operator,
      comment,
    } as ApprovalRequest);
  },
};

export default productionPlanApi;
