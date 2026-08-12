import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  MaterialPlan,
  CreateMaterialPlanRequest,
  UpdateMaterialPlanRequest,
  PaginationParams,
  ApprovalRequest,
  ApprovalResponse,
} from './types';

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

  // ---- 审批端点 ----
  submit: async (id: string, operator: string, comment?: string): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.aps.post(`/material-plans/${id}/submit`, {
      operator,
      comment,
    } as ApprovalRequest);
  },

  requisition: async (id: string, operator: string, comment?: string): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.aps.post(`/material-plans/${id}/requisition`, {
      operator,
      comment,
    } as ApprovalRequest);
  },

  cancel: async (id: string, operator: string, comment?: string): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.aps.post(`/material-plans/${id}/cancel`, {
      operator,
      comment,
    } as ApprovalRequest);
  },
};

export default materialPlanApi;
