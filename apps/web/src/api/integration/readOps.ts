import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 integration 1 条（2026-10-29）──
export const integrationReadApi = {
  batchEntityMappings: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.post('/batch', data ?? {}),
};