import apiClient from '../client';
import type { ApiResponse } from '../client';
// 2026-11-26：此文件是 v74「端点绑定」占位（页面未接入）。动作型接口按后端实际方法对齐为 POST，
// 之前用 GET 只会拿到 405。详见 docs/dev/api-contract-audit-20261126.md

// ── v74 待甄别二次收窄 finance 2 条（2026-10-29）──
export const financeReadOps3 = {
  applyTemplate: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/voucher-templates/apply', data ?? {}),
  routeEvent: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/events/route', data ?? {}),
};
