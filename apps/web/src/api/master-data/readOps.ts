import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 masterData（2026-10-29）──
export const masterDataReadApi = {
  listPlans: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v56/continuity/plans'),
  getPolicies: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v60/lifecycle/policies'),
  getQualityScore: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/quality-v51/score'),
  predictQualityTrend: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.post('/quality-v51/ai/predict', data ?? {}),
  getResourcePermissions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v54/permissions/resource'),
  list: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v54/permissions/resource/{tail}'),
  listRecoveryPoints: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v56/recovery/points'),
  list2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v56/recovery/points/{id}'),
  listPlans2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v56/continuity/plans'),
  createDataProduct: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.post('/mdm-v58/data-product', data ?? {}),
  listDataProducts: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v58/data-products'),
  getPolicies2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v60/lifecycle/policies'),
  list3: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v60/lifecycle/policies/{id}'),
  array: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v66/dashboard/recent'),
  array2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v66/dashboard/recent/{id}'),
  getSample: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/master-data/samples/{id}'),
};
