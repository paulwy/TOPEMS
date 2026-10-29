import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 qms 7 条（2026-10-29）──
export const qmsReadApi = {
  listQualityTasks: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.qms.get('/quality-tasks'),
  getQualityTask: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.qms.get('/quality-tasks/{id}'),
  getInspectionItem: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.qms.get('/inspection-items/{id}'),
  getSamplingPlan: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.qms.get('/sampling-plans/{id}'),
  getInspectionPlan: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.qms.get('/inspection-plans/{id}'),
  listPlanItems: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.qms.get('/inspection-plans/{id}/items'),
  getTodayQualityPassRate: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.qms.get('/quality-tasks/today-pass-rate'),
};