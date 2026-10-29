import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 ehs 4 条（2026-10-29）──
export const ehsReadApi = {
  listPlanCategories: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.get('/emergency-plans/categories'),
  listStockRecords: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.get('/hazardous-materials/stock-records'),
  getStockRecord: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.get('/hazardous-materials/stock-records/{id}'),
  listPlans: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.get('/emergency-plans'),
};
