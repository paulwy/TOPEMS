import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 erp 4 条（2026-10-29）──
export const erpReadOps3 = {
  proxyGetDepartment: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/erp/hr-proxy/proxy-get-department'),
  proxyGetDepartmentTree: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/erp/hr-proxy/proxy-get-department-tree'),
  mdmGatewayRoute: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/gateway/route', data ?? {}),
  createRelation: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data-refs/metadata/relations', data ?? {}),
};