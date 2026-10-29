import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 master-data 7 条（2026-10-29）──
export const masterdataReadOps2 = {
  getTrendingItems: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/kg-v53/trending'),
  listDictItems: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/dict/dict-types/{dict_type_id}/items'),
  getTrendingItems2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/trending'),
  list: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/metadata/search/{tail}'),
  listDictTypes: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/dict-types'),
  listDictItems2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/dict-types/{dict_type_id}/items'),
  listUoms: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/uoms'),
};