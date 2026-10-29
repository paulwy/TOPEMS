import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 to_bind 补绑（2026-10-29，P2）──
export const formApi = {
  listFormDefinitions: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.core.get('/form-definitions');
  },

  listFormInstances: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.core.get('/form-instances');
  },
};
