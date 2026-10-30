import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 lims 2 条（2026-10-29）──
export const limsReadApi = {
  getSample: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.lims.get('/samples/{id}'),
  getProject: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.lims.get('/uncertainty-projects/{id}'),
};
