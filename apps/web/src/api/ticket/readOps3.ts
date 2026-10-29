import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 ticket 2 条（2026-10-29）──
export const ticketReadOps3 = {
  createFeedback: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ticket.post('/feedbacks', data ?? {}),
  getFeedback: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ticket.get('/feedbacks/{id}'),
};