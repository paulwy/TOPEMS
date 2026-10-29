import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 to_bind 补绑（2026-10-29）──
export const automationRuleApi = {
  createAutomationRule: async (
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.ticket.post('/automation-rules', data);
  },

  getAutomationRule: async (
    id: string
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.ticket.get(`/automation-rules/${id}`);
  },

  updateAutomationRule: async (
    id: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.ticket.put(`/automation-rules/${id}`, data);
  },

  deleteAutomationRule: async (
    id: string
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.ticket.delete(`/automation-rules/${id}`);
  },
};
