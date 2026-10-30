import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 communication 2 条（2026-10-29）──
// 路径对齐统一模块真实挂载：im → /api/communication/im（见 communication_real_module.rs）。
export const communicationReadApi = {
  listProjectGroups: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.im.get('/project-groups'),
  unifiedSearchPois: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => apiClient.im.post('/pois/search', data ?? {}),
};
