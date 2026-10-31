import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 unified-core 1 条（2026-10-29）──
export const unifiedcoreReadOps3 = {
  getGlobalVariables: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/flow/variables/global/{workflow_id}'),
};
