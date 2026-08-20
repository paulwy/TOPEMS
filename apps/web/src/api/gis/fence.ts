import apiClient from '../client';
import type { ApiResponse } from '../client';

/**
 * V19.0: GIS 围栏管理 Stub API
 * 后端尚未实现，前端先建立接口契约；后端就绪后此文件无需改动。
 */
export interface GeoFenceRecord {
  id: string;
  name: string;
  type: 'circle' | 'polygon' | 'rectangle';
  radius?: number;
  coordinates: string;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

export interface CreateGeoFenceRequest {
  name: string;
  type: 'circle' | 'polygon' | 'rectangle';
  radius?: number;
  coordinates: string;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  status: 'active' | 'inactive';
}

const fenceApi = {
  listGeoFences: async (): Promise<ApiResponse<GeoFenceRecord[]>> => {
    return apiClient.gis.get<GeoFenceRecord[]>('/fences');
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
