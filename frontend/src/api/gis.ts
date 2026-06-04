import apiClient from './client';
import type { ApiResponse } from './client';

export interface DevicePoint {
  id: string;
  name: string;
  description?: string;
  device_type: string;
  latitude: number;
  longitude: number;
  status: string;
  last_inspected?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDevicePointRequest {
  name: string;
  description?: string;
  device_type: string;
  latitude: number;
  longitude: number;
  status?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  pipeline_type: string;
  start_point: [number, number];
  end_point: [number, number];
  status: string;
  created_at: string;
  updated_at: string;
  code?: string;
}

export interface CreatePipelineRequest {
  name: string;
  description?: string;
  pipeline_type: string;
  start_point: [number, number];
  end_point: [number, number];
  status?: string;
}

export interface StorageLocation {
  id: string;
  name: string;
  description?: string;
  location_type: string;
  latitude: number;
  longitude: number;
  capacity?: number;
  current_usage?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateStorageLocationRequest {
  name: string;
  description?: string;
  location_type: string;
  latitude: number;
  longitude: number;
  capacity?: number;
  current_usage?: number;
}

export interface EvidenceRecord {
  id: string;
  title: string;
  description?: string;
  evidence_type: string;
  latitude: number;
  longitude: number;
  file_url?: string;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
}

export interface CreateEvidenceRecordRequest {
  title: string;
  description?: string;
  evidence_type: string;
  latitude: number;
  longitude: number;
  file_url?: string;
  recorded_by: string;
}

export interface WarehouseLocation {
  id: string;
  warehouse_name: string;
  zone?: string;
  position: { lat: number; lng: number };
  capacity?: number;
  usage_rate?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LocationPhoto {
  id: string;
  position: { lat: number; lng: number };
  photo_url: string;
  description?: string;
  taken_by: string;
  taken_at: string;
  created_at: string;
}

export const gisApi = {
  listDevicePoints: async (): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>('/api/v1/device-locations');
  },
  getDevicePoint: async (id: string): Promise<ApiResponse<DevicePoint>> => {
    return apiClient.gis.get<DevicePoint>(`/api/v1/device-locations/${id}`);
  },
  listDevicePointsByMap: async (mapId: string): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>(`/api/v1/device-locations/map/${mapId}`);
  },
  createDevicePoint: async (data: CreateDevicePointRequest): Promise<ApiResponse<DevicePoint>> => {
    return apiClient.gis.post<DevicePoint>('/api/v1/device-locations', data);
  },
  updateDevicePoint: async (id: string, data: CreateDevicePointRequest): Promise<ApiResponse<DevicePoint>> => {
    return apiClient.gis.put<DevicePoint>(`/api/v1/device-locations/${id}`, data);
  },
  deleteDevicePoint: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.gis.delete<boolean>(`/api/v1/device-locations/${id}`);
  },

  listPipelines: async (): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>('/api/v1/pipelines');
  },
  getPipeline: async (id: string): Promise<ApiResponse<Pipeline>> => {
    return apiClient.gis.get<Pipeline>(`/api/v1/pipelines/${id}`);
  },
  listPipelinesByMap: async (mapId: string): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>(`/api/v1/pipelines/map/${mapId}`);
  },
  createPipeline: async (data: CreatePipelineRequest): Promise<ApiResponse<Pipeline>> => {
    return apiClient.gis.post<Pipeline>('/api/v1/pipelines', data);
  },
  updatePipeline: async (id: string, data: CreatePipelineRequest): Promise<ApiResponse<Pipeline>> => {
    return apiClient.gis.put<Pipeline>(`/api/v1/pipelines/${id}`, data);
  },
  deletePipeline: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.gis.delete<boolean>(`/api/v1/pipelines/${id}`);
  },

  listStorageLocations: async (): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>('/api/v1/warehouse-locations');
  },
  getStorageLocation: async (id: string): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.get<StorageLocation>(`/api/v1/warehouse-locations/${id}`);
  },
  listStorageLocationsByMap: async (mapId: string): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>(`/api/v1/warehouse-locations/map/${mapId}`);
  },
  createStorageLocation: async (data: CreateStorageLocationRequest): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.post<StorageLocation>('/api/v1/warehouse-locations', data);
  },
  updateStorageLocation: async (
    id: string,
    data: CreateStorageLocationRequest
  ): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.put<StorageLocation>(`/api/v1/warehouse-locations/${id}`, data);
  },
  deleteStorageLocation: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.gis.delete<boolean>(`/api/v1/warehouse-locations/${id}`);
  },

  listEvidenceRecords: async (): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>('/api/v1/location-photos');
  },
  getEvidenceRecord: async (id: string): Promise<ApiResponse<LocationPhoto>> => {
    return apiClient.gis.get<LocationPhoto>(`/api/v1/location-photos/${id}`);
  },
  listEvidenceRecordsByMap: async (mapId: string): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>(`/api/v1/location-photos/map/${mapId}`);
  },
  createEvidenceRecord: async (data: CreateEvidenceRecordRequest): Promise<ApiResponse<EvidenceRecord>> => {
    return apiClient.gis.post<EvidenceRecord>('/api/v1/location-photos', data);
  },
  deleteEvidenceRecord: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.gis.delete<boolean>(`/api/v1/location-photos/${id}`);
  },

  listFactoryMaps: async (): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>('/api/v1/factory-maps');
  },
  getFactoryMap: async (id: string): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>(`/api/v1/factory-maps/${id}`);
  },
  createFactoryMap: async (data: any): Promise<ApiResponse<any>> => {
    return apiClient.gis.post<any>('/api/v1/factory-maps', data);
  },
  updateFactoryMap: async (id: string, data: any): Promise<ApiResponse<any>> => {
    return apiClient.gis.put<any>(`/api/v1/factory-maps/${id}`, data);
  },
  deleteFactoryMap: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.gis.delete<boolean>(`/api/v1/factory-maps/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.gis.get<string>('/health');
  },

  importData: async (type: string, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return apiClient.gis.post<any>('/api/v1/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
