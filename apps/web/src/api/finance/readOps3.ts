import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 finance 2 条（2026-10-29）──
export const financeReadOps3 = {
  applyTemplate: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.get('/voucher-templates/apply'),
  routeEvent: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/events/route', data ?? {}),
};