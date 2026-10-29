import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 portal B 批（71 条，2026-10-29）──
export const portalReadOps3 = {
  unsubscribeStream: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/adaptive-execution/streams/{id}/unsubscribe', data ?? {}),
  subscribeStream: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/adaptive-execution/streams/{id}/subscribe', data ?? {}),
  optimizeResponse: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/edge-computing/optimize', data ?? {}),
  getAggregationResult: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/realtime-processing/aggregation/{id}/result'),
  getCanaryResults: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/version-control/canary/{id}/results'),
  discoverServices: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/orchestration/services', data ?? {}),
  deprecateQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/{hash}', data ?? {}),
  verifyTokenChain: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deep-federation/auth/verify', data ?? {}),
  getQuickAccess: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/uick-access'),
  cacheInvalidate: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/cache/invalidate/{version}', data ?? {}),
  validateQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/security-v1/validate-query', data ?? {}),
  getUnifiedTodos: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/nified-todos'),
  getPlannerStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/query-optimizer/planner/stats'),
  getSessionTrust: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/security-v1/session/{id}/trust'),
  createPlan: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/query-optimizer/plan', data ?? {}),
  sunsetVersion: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/version-control/versions/{version}/sunset', data ?? {}),
  cancelPlan: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/orchestration/plan/{id}/cancel', data ?? {}),
  getConfigDiff: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/deployment-manager/config/{id}/diff'),
  accelerateRequest: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/edge-computing/accelerate', data ?? {}),
  getDedupStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/streaming-processing/dedup/stats'),
  getAggregationStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/realtime-processing/aggregation/{id}/stats'),
  getSubscription: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/realtime-processing/subscription/{id}'),
  detectConflicts: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deep-federation/consistency/detect', data ?? {}),
  listQueries: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/persisted-query/list'),
  simulateAccess: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/gateway-security/access/simulate', data ?? {}),
  discoverSubgraphs: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/intelligent-gateway/stitch/discover', data ?? {}),
  getOptimalLocation: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/edge-computing/optimal-location'),
  authenticate: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/gateway-security/authenticate', data ?? {}),
  getStrategy: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/query-optimizer/strategy'),
  subscribeStream2: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/streaming-processing/stream/{id}/subscribe', data ?? {}),
  listAccessPolicies: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/gateway-security/access/policies'),
  analyzeQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/adaptive-execution/analyze', data ?? {}),
  getPendingEvents: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/realtime-processing/subscription/{id}/pending'),
  getCacheStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/ache/stats'),
  validateToken: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/gateway-security/validate-token', data ?? {}),
  getCurrentSchema: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/schema-versioning/schema/current'),
  setBackpressureConfig: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/streaming-processing/backpressure/config/{id}', data ?? {}),
  getQuery: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/persisted-query/{hash}'),
  promoteCanary: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deployment-manager/deployment/{id}/promote', data ?? {}),
  compileQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/query-optimizer/compile', data ?? {}),
  getRoutingTable: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/intelligent-gateway/routing/table'),
  edgeStore: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/edge/store', data ?? {}),
  subscribe: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/subscription-manager/subscribe', data ?? {}),
  checkCompatibility: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/version-control/compatibility', data ?? {}),
  propagateIdentity: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deep-federation/auth/propagate/{id}', data ?? {}),
  optimizePlan: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/query-optimizer/plan/{id}/optimize', data ?? {}),
  listStreams: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/streaming-processing/streams'),
  getCompilation: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/query-optimizer/compilation/{id}'),
  getServicesByCapability: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/orchestration/services/capability/{cap}'),
  configureStrategy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/adaptive-execution/execution/configure', data ?? {}),
  detectBreakingChanges: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/schema-versioning/schema/detect-breaking', data ?? {}),
  listIdentityPolicies: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/security-v1/identity/policies'),
  cancelQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deep-federation/distributed/query/{id}/cancel', data ?? {}),
  renderAtEdge: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/edge-computing/render', data ?? {}),
  revokeAccess: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/gateway-security/access/{id}', data ?? {}),
  evaluateAccess: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/gateway-security/access/evaluate', data ?? {}),
  getLatencyStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/edge-computing/latency-stats'),
  resolveConflict: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deep-federation/consistency/resolve/{id}', data ?? {}),
  closeStream: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/adaptive-execution/streams/{id}', data ?? {}),
  getExecutionProfile: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/adaptive-execution/execution/profile/{hash}'),
  getDedupRules: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/streaming-processing/dedup/rules'),
  deprecateVersion: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/version-control/versions/{version}/deprecate', data ?? {}),
  cancelSubscription: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/realtime-processing/subscription/{id}', data ?? {}),
  listRules: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/query-optimizer/rules'),
  reorderPinnedApps: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/pinned/reorder', data ?? {}),
  getPushStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/subscription-manager/push/stats'),
  deprecateVersion2: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/schema-versioning/versions/{version}/deprecate', data ?? {}),
  cacheGet: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/cache/get/{key}', data ?? {}),
  invalidateCache: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/ai-ops/cache/invalidate', data ?? {}),
  precompute: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/edge-computing/precompute', data ?? {}),
  evictCache: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/ai-ops/cache/evict', data ?? {}),
};