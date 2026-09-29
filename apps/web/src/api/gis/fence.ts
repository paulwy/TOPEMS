import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { PaginatedResponse, RawPaginatedResponse } from './types';
import { adaptResponse } from './utils';

/**
 * GIS 围栏管理 API——契约对齐 svc/gis 后端 Geofence 结构
 * （后端字段：shape_type/coordinates(GeoJSON)/event_types/radius/trigger_cooldown...）
 */
export interface GeoFenceRecord {
  id: string;
  name: string;
  description?: string;
  chat_id?: string;
  creator_id?: string;
  shape_type: 'circle' | 'polygon' | 'rectangle';
  /** GeoJSON：circle 用 {type:'Point',coordinates:[lng,lat]}，polygon 用 FeatureCollection */
  coordinates: unknown;
  radius?: number;
  event_types: string[];
  status: 'active' | 'inactive';
  trigger_cooldown: number;
  notify_channels: string[];
  notify_users: string[];
  gis_fence_id?: string;
  start_at?: string;
  end_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGeoFenceRequest {
  name: string;
  description?: string;
  chat_id?: string;
  creator_id?: string;
  shape_type: 'circle' | 'polygon' | 'rectangle';
  coordinates: unknown;
  radius?: number;
  event_types?: string[];
  status?: 'active' | 'inactive';
  trigger_cooldown?: number;
  notify_channels?: string[];
  notify_users?: string[];
  gis_fence_id?: string;
  start_at?: string;
  end_at?: string;
}

const fenceApi = {
  /** 后端 GET /fences 返回 {items,total} 分页包装，归一为 PaginatedResponse */
  listGeoFences: async (): Promise<ApiResponse<PaginatedResponse<GeoFenceRecord>>> => {
    const raw = await apiClient.gis.get<RawPaginatedResponse>('/fences');
    if (raw.success && raw.data) {
      return {
        ...raw,
        data: adaptResponse<GeoFenceRecord>(raw.data, 'items'),
      } as unknown as ApiResponse<PaginatedResponse<GeoFenceRecord>>;
    }
    return raw as unknown as ApiResponse<PaginatedResponse<GeoFenceRecord>>;
  },

  getGeoFence: async (id: string): Promise<ApiResponse<GeoFenceRecord>> => {
    return apiClient.gis.get<GeoFenceRecord>(`/fences/${id}`);
  },

  createGeoFence: async (data: CreateGeoFenceRequest): Promise<ApiResponse<GeoFenceRecord>> => {
    return apiClient.gis.post<GeoFenceRecord>('/fences', data);
  },

  updateGeoFence: async (
    id: string,
    data: Partial<CreateGeoFenceRequest>
  ): Promise<ApiResponse<GeoFenceRecord>> => {
    return apiClient.gis.put<GeoFenceRecord>(`/fences/${id}`, data);
  },

  deleteGeoFence: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.gis.delete(`/fences/${id}`);
  },
};

export default fenceApi;
