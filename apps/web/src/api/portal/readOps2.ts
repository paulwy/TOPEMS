import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 portal A 批（72 条，2026-10-29）──
export const portalReadOps2 = {
  unsubscribeStream: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/streaming-processing/stream/{id}/unsubscribe', data ?? {}),
  checkConsistency: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deep-federation/consistency/check', data ?? {}),
  cacheStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/persisted-query/cache/stats'),
  cacheSet: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/cache/set', data ?? {}),
  checkDuplicate: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/streaming-processing/dedup/check', data ?? {}),
  getImprovement: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/query-optimizer/improvement'),
  edgeInvalidate: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/edge/invalidate', data ?? {}),
  listVersions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/version-control/versions'),
  routeQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/ai-ops/routing/route', data ?? {}),
  cancelReplay: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/realtime-processing/replay/{id}/cancel', data ?? {}),
  promoteCanary: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/version-control/canary/{id}/promote', data ?? {}),
  getVersionVector: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/deep-federation/consistency/vector/{id}'),
  previewMasking: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/security-v1/masking/preview', data ?? {}),
  getPlanCost: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/query-optimizer/plan/cost'),
  getRoutingRules: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/ai-ops/routing/rules'),
  getTrustScore: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/security-v1/trust/score/{identity}'),
  validateStitch: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/intelligent-gateway/stitch/validate/{plan_id}', data ?? {}),
  getRegistryStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/orchestration/registry/stats'),
  edgeReplicationStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/persisted-query/edge/replication-stats'),
  applyBackpressure: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/streaming-processing/backpressure/apply/{id}', data ?? {}),
  listSecurityPolicies: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/gateway-security/policies'),
  cachePurgeExpired: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/cache/purge', data ?? {}),
  negotiateVersion: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/schema-versioning/negotiate', data ?? {}),
  getSecurityEvents: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/security-v1/events'),
  getCacheHitRate: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/ai-ops/cache/hit-rate'),
  getPerformanceProfile: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/query-optimizer/performance/profile'),
  coalesceRequests: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/edge-computing/coalesce', data ?? {}),
  authenticateFederated: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deep-federation/auth/authenticate', data ?? {}),
  edgeSetPolicy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/edge/policy', data ?? {}),
  createStream: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/streaming-processing/stream', data ?? {}),
  listSchemaVersions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/schema-versioning/schema/versions'),
  listSubscriptions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/realtime-processing/subscriptions'),
  getPlan: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/query-optimizer/plan/{id}'),
  edgeRead: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/edge/read/{key}', data ?? {}),
  routeRequest: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/orchestration/route', data ?? {}),
  invalidateCache: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/edge-computing/cache/invalidate', data ?? {}),
  getConfig: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/deployment-manager/config/{id}'),
  listConfigs: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/deployment-manager/configs'),
  getDroppedEvents: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/streaming-processing/backpressure/dropped'),
  getIdentity: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/deep-federation/auth/identity/{id}'),
  comparePlans: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/query-optimizer/plan/compare', data ?? {}),
  getCacheEntry: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/ai-ops/cache/entry/{key}'),
  listAggregations: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/realtime-processing/aggregations'),
  createStream2: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/adaptive-execution/streams', data ?? {}),
  getBackpressureState: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/streaming-processing/backpressure/state/{id}'),
  simulateRouting: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/ai-ops/routing/simulate', data ?? {}),
  getLatencyBudget: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/edge-computing/latency-budget'),
  getFieldRules: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/security-v1/masking/field-rules'),
  getAccelStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/edge-computing/accel-stats'),
  getCachePolicies: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/ai-ops/cache/policies'),
  getServiceLoads: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/ai-ops/routing/loads'),
  getService: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/orchestration/service/{id}'),
  getSubscribers: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/subscription-manager/subscribers'),
  optimizePlan: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/orchestration/plan/{id}/optimize', data ?? {}),
  listMaskingRules: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/security-v1/masking/rules'),
  getMigrationPath: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/version-control/compatibility/migration-path'),
  pauseSubscription: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/realtime-processing/subscription/{id}/pause', data ?? {}),
  accelerate: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/query-optimizer/accelerate', data ?? {}),
  getSupportedVersions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/schema-versioning/versions/supported'),
  unsubscribe: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/subscription-manager/subscribe/{subscriber_id}', data ?? {}),
  optimizeQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/adaptive-execution/optimize', data ?? {}),
  routeQuery2: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/intelligent-gateway/route', data ?? {}),
  getBusinessStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/usiness-stats'),
  getRoutingStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/orchestration/routing/stats'),
  cleanupCache: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/ai-ops/cache/cleanup', data ?? {}),
  cacheListVersions: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/cache/versions', data ?? {}),
  getBackpressureConfig: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/streaming-processing/backpressure/config/{id}'),
  warmUpRouting: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/intelligent-gateway/routing/warmup', data ?? {}),
  configureStrategy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/query-optimizer/strategy/configure/{id}', data ?? {}),
  getRouteStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/ai-ops/routing/stats'),
  listCanaries: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/version-control/canaries'),
  getBackpressureStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/streaming-processing/backpressure/stats'),
};