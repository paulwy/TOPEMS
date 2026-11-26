import apiClient from '../client';
import type { ApiResponse } from '../client';
// 2026-11-26：此文件是 v74「端点绑定」占位（页面未接入）。动作型接口按后端实际方法对齐为 POST，
// 之前用 GET 只会拿到 405。详见 docs/dev/api-contract-audit-20261126.md

// ── v74 下线候选分流·批2（wms 写端点补绑，2026-10-29）──
export const wmsWriteApi = {
  createShippingFromOutbound: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.wms.post('/sync/outbound-order/{id}/to-shipping', data ?? {}),
  getSyncLogs: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.wms.post('/sync/sync-logs', data ?? {}),
};
