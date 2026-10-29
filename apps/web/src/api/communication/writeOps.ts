import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（communication 写端点补绑，2026-10-29）──
export const communicationWriteApi = {
  createRoom: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.post('/im/rooms', data ?? {}),
  addContact: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.post('/im/contacts', data ?? {}),
};