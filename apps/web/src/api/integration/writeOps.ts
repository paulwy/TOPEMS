import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（integration 写端点补绑，2026-10-29）──
export const integrationWriteApi = {
  listMesQmsSyncApi: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.get('/mes-qms'),
  getMesQmsSyncApi: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.get('/mes-qms/{id}'),
  syncQualityResultApi: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.post('/mes-qms/sync-result', data ?? {}),
  syncTraceChainApi: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.post('/mes-qms/sync-trace', data ?? {}),
  retryMesQmsSyncApi: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.post('/mes-qms/{id}/retry', data ?? {}),
  syncErpOrderToMes: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.post('/mes-erp/sync/erp-to-mes', data ?? {}),
  syncMesProgressToErp: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.post('/mes-erp/sync/mes-to-erp', data ?? {}),
  retryMesErpSync: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.post('/mes-erp/{id}/retry', data ?? {}),
  getMesErpSyncLogs: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.get('/mes-erp/{id}/logs'),
  listMesErpSyncRecords: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.get('/mes-erp/records'),
};
