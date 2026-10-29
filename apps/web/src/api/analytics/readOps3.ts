import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 analytics 1 条（2026-10-29）──
export const analyticsReadOps3 = {
  getLimsInstrumentUsage: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/lims/instrument-usage'),
};
