import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选试点（portal 20 条读端点补绑，2026-10-29）──
export const portalReadApi = {
  getChannels: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/subscription-manager/channels'),
  listConflicts: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/intelligent-gateway/stitch/conflicts'),
  getCacheStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/ai-ops/cache/stats'),
  getEventsRange: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/realtime-processing/events/range/{id}'),
  maskResponse: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/security-v1/masking/mask', data ?? {}),
  requestReplay: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/realtime-processing/replay/request', data ?? {}),
  evaluateTrust: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/security-v1/trust/evaluate', data ?? {}),
  getIncidents: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/gateway-security/incidents'),
  compareSchemas: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/schema-versioning/schema/compare', data ?? {}),
  resumeSubscription: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/realtime-processing/subscription/{id}/resume', data ?? {}),
  getStreamEvents: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/streaming-processing/stream/{id}/events'),
  getCompilationStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/query-optimizer/compilation/stats'),
  setConsistencyModel: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deep-federation/consistency/model', data ?? {}),
  listPolicies: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/security-v1/policies'),
  createPlan: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/orchestration/plan', data ?? {}),
  getOptimizationSuggestions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/adaptive-execution/optimization/suggestions'),
  getAffinity: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/intelligent-gateway/affinity/{service_id}'),
  grantAccess: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/gateway-security/access/grant', data ?? {}),
  getDlq: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/subscription-manager/dlq'),
  validateQueryPlan: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deep-federation/distributed/query/validate', data ?? {}),
};
