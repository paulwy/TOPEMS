import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 lims 1 条（2026-10-29）──
export const limsReadOps3 = {
  getAnalyte: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.lims.get('/analytes/{id}'),
};