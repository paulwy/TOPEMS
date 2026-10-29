import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 pm 1 条（2026-10-29）──
export const pmReadOps2 = {
  listIntegrations: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pm.get('/service-integrations'),
};