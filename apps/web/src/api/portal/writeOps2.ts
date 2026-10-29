import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 批2复核·写语义补绑（2026-10-29）──
export const portalWriteOps2 = {
  executeAdaptiveQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/adaptive-execution/execute', data ?? {}),
  runHealthCheck: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/ai-ops/health/run', data ?? {}),
  executeHealing: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/ai-ops/healing/execute', data ?? {}),
  executeReplay: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/realtime-processing/replay/execute/{id}', data ?? {}),
  executeStitch: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/intelligent-gateway/stitch/execute', data ?? {}),
  executeQuickAction: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/quick-actions/{id}/execute', data ?? {}),
  executeQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/{hash}/execute', data ?? {}),
  executePlan: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/orchestration/plan/{id}/execute', data ?? {}),
  executeDistributedQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deep-federation/distributed/query/{id}/execute', data ?? {}),
};