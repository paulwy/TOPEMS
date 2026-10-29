import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 to_bind 补绑（2026-10-29，P2）──
export const coreDocApi = {
  listDocuments: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.core.get('/doc/documents');
  },

  createDocument: async (
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.core.post('/doc/documents', data);
  },

  getDocumentDashboard: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.core.get('/doc/dashboard');
  },
};
