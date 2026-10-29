import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 integration 1 条（2026-10-29）──
export const integrationReadOps3 = {
  autoMatchMappings: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.post('/auto-match', data ?? {}),
};