import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 gis 3 条（2026-10-29）──
export const gisReadOps2 = {
  listWarehouseLocationsByMap: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.gis.get('/warehouse-locations/map/{map_id}'),
  listPipelinesByMap: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.gis.get('/pipelines/map/{map_id}'),
  listLocationPhotosByMap: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.gis.get('/location-photos/map/{map_id}'),
};