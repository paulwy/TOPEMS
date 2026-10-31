import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 srm 5 条（2026-10-29）──
export const srmReadApi = {
  getContractTerms: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.srm.get('/supplier-contracts/{id}/terms'),
  compareSupplierPerformance: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.srm.get('/performance/compare'),
  getSupplierPerformance: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.srm.get('/suppliers/{id}/performance'),
  getScoreTrend: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.srm.get('/suppliers/{id}/score-trend'),
  getPerformanceSummary: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.srm.get('/suppliers/{id}/performance-summary'),
};
