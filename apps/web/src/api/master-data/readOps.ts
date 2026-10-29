import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 masterData（2026-10-29）──
export const masterDataReadApi = {
  listPlans: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v56/continuity/plans'),
  getPolicies: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v60/lifecycle/policies'),
  getQualityScore: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/score'),
  predictQualityTrend: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.post('/ai/predict', data ?? {}),
  getResourcePermissions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/permissions/resource'),
  list: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/permissions/resource/{tail}'),
  listRecoveryPoints: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/recovery/points'),
  list2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/recovery/points/{id}'),
  listPlans2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/continuity/plans'),
  createDataProduct: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.post('/data-product', data ?? {}),
  listDataProducts: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/data-products'),
  getPolicies2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/lifecycle/policies'),
  list3: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/lifecycle/policies/{id}'),
  array: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/dashboard/recent'),
  array2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/dashboard/recent/{id}'),
  getSample: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/samples/{id}'),
};