import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 mobile 2 条（2026-10-29）──
export const mobileReadApi = {
  getDashboardStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mobile.get('/stats/dashboard'),
  getTaskStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mobile.get('/stats/task'),
};
