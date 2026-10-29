import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（scm 写端点补绑，2026-10-29）──
export const scmWriteApi = {
  createInboundFromPurchase: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.scm.post('/sync/purchase-order/{id}/to-inbound', data ?? {}),
  syncSupplierFromSrm: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.scm.post('/sync/supplier-from-srm', data ?? {}),
  getSyncLogs: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.scm.get('/sync/sync-logs'),
  getSyncStatistics: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.scm.get('/sync/statistics'),
};