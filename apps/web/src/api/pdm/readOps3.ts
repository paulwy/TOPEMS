import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 pdm 1 条（2026-10-29）──
export const pdmReadOps3 = {
  compareBomVersions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/bom-compare'),
};
