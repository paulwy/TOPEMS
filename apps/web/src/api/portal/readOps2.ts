import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 portal 3 条（2026-10-29）──
export const portalReadOps2 = {
  listServices: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/services'),
  getAvailableThemes: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/settings/themes'),
  getAvailableLanguages: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.portal.get('/settings/languages'),
};