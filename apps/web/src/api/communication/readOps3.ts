import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 communication 2 条（2026-10-29）──
// 路径对齐统一模块真实挂载：im → /api/communication/im（见 communication_real_module.rs）。
export const communicationReadOps3 = {
  markMessagesRead: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.im.post('/rooms/{id}/read', data ?? {}),
  sendLocationMessage: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.im.post('/locations/message', data ?? {}),
};
