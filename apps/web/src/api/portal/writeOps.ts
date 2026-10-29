import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（method 误标写端点补绑，2026-10-29）──
// method 语义推导：create/add/publish→POST、update/activate→PUT、delete/remove→DELETE、get/list/status→GET
// 路径归一：/api/portal/xxx → apiClient.portal 相对路径

export const portalWriteApi = {
  batchOptimize: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/adaptive-execution/optimization/batch', data ?? {}),
  createSecurityPolicy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/gateway-security/policies', data ?? {}),
  updateSecurityPolicy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.put('/gateway-security/policies/{id}', data ?? {}),
  createAccessPolicy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/gateway-security/access/policy', data ?? {}),
  createDeployment: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deployment-manager/deployment', data ?? {}),
  getDeployment: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/deployment-manager/deployment/{id}'),
  listDeployments: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/deployment-manager/deployments'),
  startDeployment: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deployment-manager/deployment/{id}/start', data ?? {}),
  cancelDeployment: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deployment-manager/deployment/{id}/cancel', data ?? {}),
  getDeploymentStatus: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/deployment-manager/deployment/{id}/status'),
  rollbackDeployment: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deployment-manager/deployment/{id}/rollback', data ?? {}),
  getDeploymentHistory: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/deployment-manager/deployment/history'),
  createConfig: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deployment-manager/config', data ?? {}),
  updateConfig: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.put('/deployment-manager/config/{id}', data ?? {}),
  activateConfig: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.put('/deployment-manager/config/{id}/activate', data ?? {}),
  rollbackConfig: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deployment-manager/config/{id}/rollback', data ?? {}),
  createEnvironment: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deployment-manager/environment', data ?? {}),
  createRollbackPolicy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deployment-manager/rollback/policy', data ?? {}),
  getRollbackPolicies: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/deployment-manager/rollback/policies'),
  executeRollback: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deployment-manager/rollback/execute', data ?? {}),
  getRollbackHistory: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/deployment-manager/rollback/history'),
  testRollback: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deployment-manager/rollback/{id}/test', data ?? {}),
  configureAutoRollback: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.put('/deployment-manager/rollback/{id}/auto', data ?? {}),
  disableRollback: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.delete('/deployment-manager/rollback/{id}/disable'),
  getRollbackStatus: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/deployment-manager/rollback/status'),
  createPolicy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/security-v1/policies', data ?? {}),
  updatePolicy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.put('/security-v1/policies/{id}', data ?? {}),
  createIdentityPolicy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/security-v1/identity/policies', data ?? {}),
  addMaskingRule: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/security-v1/masking/rules', data ?? {}),
  createRoutingRule: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/ai-ops/routing/rule', data ?? {}),
  updateServiceLoad: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.put('/ai-ops/routing/load/{id}', data ?? {}),
  createCachePolicy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/ai-ops/cache/policy', data ?? {}),
  createHealthCheck: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/ai-ops/health/check', data ?? {}),
  createSubscription: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/realtime-processing/subscription', data ?? {}),
  createAggregation: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/realtime-processing/aggregation', data ?? {}),
  startAggregation: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/realtime-processing/aggregation/{id}/start', data ?? {}),
  stopAggregation: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/realtime-processing/aggregation/{id}/stop', data ?? {}),
  publish: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/subscription-manager/publish', data ?? {}),
  publishToQueue: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/subscription-manager/queue/publish', data ?? {}),
  createQueue: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/subscription-manager/queue/create', data ?? {}),
  setBatchWindow: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/subscription-manager/push/batch-window', data ?? {}),
  updateAffinity: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.put('/intelligent-gateway/affinity/{service_id}', data ?? {}),
  generateStitchPlan: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/intelligent-gateway/stitch/plan', data ?? {}),
  rollbackStitch: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/intelligent-gateway/stitch/rollback', data ?? {}),
  publishEvent: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/streaming-processing/stream/{id}/publish', data ?? {}),
  deleteStream: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.delete('/streaming-processing/stream/{id}'),
  createDedupRule: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/streaming-processing/dedup/rule', data ?? {}),
  enableRule: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/streaming-processing/dedup/rule/{id}/enable', data ?? {}),
  disableRule: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.delete('/streaming-processing/dedup/rule/{id}/disable'),
  resetCounter: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/streaming-processing/backpressure/reset/{id}', data ?? {}),
  registerQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/register', data ?? {}),
  updateQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.put('/persisted-query/{hash}', data ?? {}),
  cacheCreateVersion: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/cache/version', data ?? {}),
  edgeSync: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/persisted-query/edge/sync', data ?? {}),
  startTrace: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/gateway-monitoring/trace/start', data ?? {}),
  addResolverTiming: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/gateway-monitoring/trace/resolver', data ?? {}),
  exportTraces: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/gateway-monitoring/traces/export', data ?? {}),
  createModel: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/gateway-monitoring/anomaly/model', data ?? {}),
  updateModel: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.put('/gateway-monitoring/anomaly/model/{id}', data ?? {}),
  registerService: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/orchestration/service/register', data ?? {}),
  deregisterService: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.delete('/orchestration/service/{id}'),
  addRule: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/orchestration/rules', data ?? {}),
  createDistributedQuery: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deep-federation/distributed/query', data ?? {}),
  createAuthPolicy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/deep-federation/auth/policy', data ?? {}),
  updateAuthPolicy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.put('/deep-federation/auth/policy/{id}', data ?? {}),
  deployFunction: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/edge-computing/functions/deploy', data ?? {}),
  syncConfig: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/edge-computing/config/sync', data ?? {}),
  registerVersion: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/version-control/versions', data ?? {}),
  createCanary: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/version-control/canary', data ?? {}),
  updateCanary: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.put('/version-control/canary/{id}', data ?? {}),
  startCanary: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/version-control/canary/{id}/start', data ?? {}),
  stopCanary: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/version-control/canary/{id}/stop', data ?? {}),
  rollbackCanary: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/version-control/canary/{id}/rollback', data ?? {}),
  createCompatibilityPolicy: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/version-control/compatibility/policy', data ?? {}),
  publishSchemaVersion: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.post('/schema-versioning/schema/versions', data ?? {}),
};