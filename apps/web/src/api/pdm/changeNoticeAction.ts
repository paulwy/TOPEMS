import type { ChangeOrder } from './index';
import apiClient from '../client';
import type { ApiResponse } from '../client';

export const changeNoticeActionApi = {
  submit: (id: string): Promise<ApiResponse<ChangeOrder>> => {
    return apiClient.pdm.post(`/change-notices/${id}/submit`, {});
  },

  approve: (id: string, data?: { comment?: string }): Promise<ApiResponse<ChangeOrder>> => {
    return apiClient.pdm.post(`/change-notices/${id}/approve`, data || {});
  },

  reject: (id: string, data?: { reason?: string }): Promise<ApiResponse<ChangeOrder>> => {
    return apiClient.pdm.post(`/change-notices/${id}/reject`, data || {});
  },

  // ── v74 to_bind 补绑（2026-10-29）──
  create: (data: Record<string, unknown>): Promise<ApiResponse<ChangeOrder>> => {
    return apiClient.pdm.post('/change-notices', data);
  },
};

export default changeNoticeActionApi;
