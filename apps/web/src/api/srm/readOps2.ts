import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 srm 3 条（2026-10-29）──
export const srmReadOps2 = {
  listTenderAwards: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.srm.get('/tender-awards'),
  getPerformanceTrend: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.srm.get('/performance/trend/{id}'),
  listTenderAwards2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.srm.get('/tender-awards/{id}'),
};