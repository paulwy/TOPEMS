import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（communication 写端点补绑，2026-10-29）──
// 路径对齐统一模块真实挂载：im → /api/communication/im（见 communication_real_module.rs）。
export const communicationWriteApi = {
  createRoom: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => apiClient.im.post('/rooms', data ?? {}),
  addContact: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => apiClient.im.post('/contacts', data ?? {}),
};
