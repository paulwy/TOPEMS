import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 ai 10 条（2026-10-29）──
export const aiReadApi = {
  process: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/documents/{id}/process'),
  vectorizeFromFile: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/documents/vectorize-from-file'),
  getUserProfile: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/profile/get'),
  recommendDocuments: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/recommend/documents'),
  recommendOpportunities: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/recommend/opportunities'),
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
