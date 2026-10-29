import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（ai 写端点补绑，2026-10-29）──
export const aiWriteApi = {
  generateCaption: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.post('/multimodal/image/caption', data ?? {}),
  delete: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.delete('/vectors/{id}'),
  updateUserProfile: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.put('/profile/update', data ?? {}),
  exportPrometheusMetrics: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.post('/dsh/agent/performance/prometheus', data ?? {}),
  createConnector: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.post('/connectors/create', data ?? {}),
  updateConnector: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.put('/connectors/update', data ?? {}),
  deleteConnector: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.delete('/connectors/delete'),
};