import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 integration 2 条（2026-10-29）──
export const integrationReadOps2 = {
  listConnections: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.get('/api/integration/erp/connections'),
  listMappings: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.get('/api/integration/erp/mappings'),
};