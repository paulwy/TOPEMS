import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 crm 1 条（2026-10-29）──
export const crmReadOps3 = {
  getFunnelConversion: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.crm.get('/sales-funnel/conversion/{tail}'),
};