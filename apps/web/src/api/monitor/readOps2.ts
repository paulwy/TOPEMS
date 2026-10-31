import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 monitor 1 条（2026-10-29）──
export const monitorReadOps2 = {
  listSuppressionRules: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.monitor.get('/suppression'),
};
