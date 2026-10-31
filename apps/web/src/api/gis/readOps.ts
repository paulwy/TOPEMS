import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 gis 2 条（2026-10-29）──
export const gisReadApi = {
  websocketDevice: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.gis.get('/ws/gis/device/{device_code}'),
  websocket: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.gis.get('/ws/gis'),
};
