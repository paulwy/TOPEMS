import apiClient from '../client';
import type { ApiResponse } from '../client';
// 2026-11-26：此文件是 v74「端点绑定」占位（页面未接入）。动作型接口按后端实际方法对齐为 POST，
// 之前用 GET 只会拿到 405。详见 docs/dev/api-contract-audit-20261126.md

// ── v74 to_bind 补绑（2026-10-29，P2）──
export const portalApi = {
  exportGatewayAudit: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.portal.post('/gateway-security/audit/export', data ?? {});
  },

  createRecoveryPlan: async (
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.portal.post('/ai-ops/recovery/plan', data);
  },

  getUserInfo: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.portal.get('/user');
  },
};
