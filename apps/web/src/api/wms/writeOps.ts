import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（wms 写端点补绑，2026-10-29）──
export const wmsWriteApi = {
  createShippingFromOutbound: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.wms.post('/sync/outbound-order/{id}/to-shipping', data ?? {}),
  getSyncLogs: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.wms.get('/sync/sync-logs'),
};