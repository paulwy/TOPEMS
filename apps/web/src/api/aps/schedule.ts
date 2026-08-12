import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  Schedule,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  PaginationParams,
  ApprovalRequest,
  ApprovalResponse,
} from './types';

export const scheduleApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Schedule>>> => {
    return apiClient.aps.get('/schedules', { params });
  },

  get: async (id: string): Promise<ApiResponse<Schedule>> => {
    return apiClient.aps.get(`/schedules/${id}`);
  },

  create: async (data: CreateScheduleRequest): Promise<ApiResponse<Schedule>> => {
    return apiClient.aps.post('/schedules', data);
  },

  update: async (id: string, data: UpdateScheduleRequest): Promise<ApiResponse<Schedule>> => {
    return apiClient.aps.put(`/schedules/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.aps.delete(`/schedules/${id}`);
  },

  start: async (id: string): Promise<ApiResponse<Schedule>> => {
    return apiClient.aps.post(`/schedules/${id}/start`);
  },

  complete: async (id: string): Promise<ApiResponse<Schedule>> => {
    return apiClient.aps.post(`/schedules/${id}/complete`);
  },

  cancel: async (id: string): Promise<ApiResponse<Schedule>> => {
    return apiClient.aps.post(`/schedules/${id}/cancel`);
  },

  // ---- 审批端点 ----
  submit: async (id: string, operator: string, comment?: string): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.aps.post(`/schedules/${id}/submit`, {
      operator,
      comment,
    } as ApprovalRequest);
  },

  release: async (id: string, operator: string, comment?: string): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.aps.post(`/schedules/${id}/release`, {
      operator,
      comment,
    } as ApprovalRequest);
  },

  hold: async (id: string, operator: string, comment?: string): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.aps.post(`/schedules/${id}/hold`, {
      operator,
      comment,
    } as ApprovalRequest);
  },
};

export default scheduleApi;
