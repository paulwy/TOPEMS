import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 to_bind 补绑（2026-10-29，P2）──
export const automationApi = {
  getAutomationDashboard: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.core.get('/automation/dashboard');
  },

  listAutomationRules: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.core.get('/automation/rules');
  },

  listAutomationRuns: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.core.get('/automation/runs');
  },

  listAutomationVariables: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.core.get('/automation/variables');
  },
};
