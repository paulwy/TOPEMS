import apiClient from '../client';
import type { ApiResponse } from '../client';
// 2026-11-26：此文件是 v74「端点绑定」占位（页面未接入）。动作型接口按后端实际方法对齐为 POST，
// 之前用 GET 只会拿到 405。详见 docs/dev/api-contract-audit-20261126.md

// ── v74 BIZ 接入候选 ai 10 条（2026-10-29）──
export const aiReadApi = {
  process: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/documents/{id}/process'),
  vectorizeFromFile: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.post('/documents/vectorize-from-file', data ?? {}),
  getUserProfile: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => apiClient.ai.post('/profile/get', data ?? {}),
  recommendDocuments: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.post('/recommend/documents', data ?? {}),
  recommendOpportunities: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.post('/recommend/opportunities', data ?? {}),
  getActivityTrend: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/dashboard/activity-trend'),
  getActivityTrend2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/dashboard/activity-trend/{tail}'),
  upload: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.post('/documents/upload', data ?? {}),
  batchStore: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.post('/vectors/batch-store', data ?? {}),
  personalized: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/recommendations/personalized'),
};
