import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 crm 3 条（2026-10-29）──
export const crmReadOps2 = {
  getFunnelTrend: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.crm.get('/sales-funnel/trend'),
  getSalesTrend: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.crm.get('/sales-forecast/trend'),
};
