import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 rd 3 条（2026-10-29）──
export const rdReadOps2 = {
  listPatents: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.rd.get('/patents'),
  listChangeRequests: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.rd.get('/change-requests'),
  listCosts: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.rd.get('/research-costs'),
};