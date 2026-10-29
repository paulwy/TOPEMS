import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 erp 2 条（2026-10-30：hr-proxy 2 条死封装随 B1 清理）──
export const erpReadOps3 = {
  mdmGatewayRoute: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/gateway/route', data ?? {}),
  createRelation: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data-refs/metadata/relations', data ?? {}),
};
