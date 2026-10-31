import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 portal 1 条（2026-10-29）──
export const portalReadOps3 = {
  markAllNotificationsRead: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/notifications/mark-all-read'),
};
