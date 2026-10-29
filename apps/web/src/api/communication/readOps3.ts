import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 communication 2 条（2026-10-29）──
export const communicationReadOps3 = {
  markMessagesRead: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.post('/im/rooms/{id}/read', data ?? {}),
  sendLocationMessage: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.post('/locations/message', data ?? {}),
};