import apiClient from '../client';
import type { ApiResponse } from '../client';

export const changeNoticeActionApi = {
  submit: (id: string): Promise<ApiResponse<import('./index').ChangeOrder>> => {
    return apiClient.pdm.post(`/change-notices/${id}/submit`, {});
  },

  approve: (
    id: string,
    data?: { comment?: string }
  ): Promise<ApiResponse<import('./index').ChangeOrder>> => {
    return apiClient.pdm.post(`/change-notices/${id}/approve`, data || {});
  },

  reject: (
    id: string,
    data?: { reason?: string }
  ): Promise<ApiResponse<import('./index').ChangeOrder>> => {
    return apiClient.pdm.post(`/change-notices/${id}/reject`, data || {});
  },
};

export default changeNoticeActionApi;
