import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（monitor 写端点补绑，2026-10-29）──
export const monitorWriteApi = {
  createTemplate: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.monitor.post('/templates', data ?? {}),
  createSuppressionRule: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.monitor.post('/suppression', data ?? {}),
  updateSuppressionRule: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.monitor.put('/suppression/{id}', data ?? {}),
  deleteSuppressionRule: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.monitor.delete('/suppression/{id}'),
  createSlo: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.monitor.post('/slos', data ?? {}),
  createBusinessMetric: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.monitor.post('/business-metrics', data ?? {}),
};