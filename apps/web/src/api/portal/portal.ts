import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 to_bind 补绑（2026-10-29，P2）──
export const portalApi = {
  exportGatewayAudit: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.portal.get('/gateway-security/audit/export');
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
