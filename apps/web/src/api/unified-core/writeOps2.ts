import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 批2复核·写语义补绑（2026-10-29）──
export const unifiedCoreWriteOps2 = {
  startInstance: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/flow/instances/{id}/start', data ?? {}),
  getRunSteps: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/automation/runs/{id}/steps', data ?? {}),
  getRunLogs: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/automation/runs/{id}/logs', data ?? {}),
  getRunLogById: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/automation/runs/{id}/logs/{log_id}', data ?? {}),
};
