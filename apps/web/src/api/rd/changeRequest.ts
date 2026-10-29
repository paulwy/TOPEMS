import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 to_bind 补绑（2026-10-29）──
export const changeRequestApi = {
  getChangeRequest: async (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.rd.get(`/change-requests/${id}`);
  },

  transitionChangeRequest: async (
    id: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.rd.post(`/change-requests/${id}/transition`, data);
  },

  createChangeOrder: async (
    id: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.rd.post(`/change-requests/${id}/change-orders`, data);
  },
};
