import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 批2复核·写语义补绑（2026-10-29）──
export const integrationWriteOps2 = {
  triggerQmsInspectionApi: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.integration.post('/mes-qms/trigger-inspection', data ?? {}),
};