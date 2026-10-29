import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 to_bind 补绑（2026-10-29）──
export const alertRuleApi = {
  createAlertRule: async (
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.qms.post('/alert-rules', data);
  },

  getAlertRule: async (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.qms.get(`/alert-rules/${id}`);
  },

  updateAlertRule: async (
    id: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.qms.put(`/alert-rules/${id}`, data);
  },

  deleteAlertRule: async (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.qms.delete(`/alert-rules/${id}`);
  },

  createAlertMessage: async (
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.qms.post('/alert-messages', data);
  },

  acknowledgeAlert: async (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.qms.post(`/alert-messages/${id}/acknowledge`);
  },
};
