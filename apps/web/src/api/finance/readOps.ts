import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 finance 1 条（2026-10-29）──
export const financeReadApi = {
  getProjectionProgress: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.get('/cqrs/projection-progress'),
};
