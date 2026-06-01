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

export const gisApi = {
  listDevicePoints: async (): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>('/api/v1/device-locations');
  },
  getDevicePoint: async (id: string): Promise<ApiResponse<DevicePoint>> => {
    return apiClient.gis.get<DevicePoint>(`/api/v1/device-locations/${id}`);
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
  createPipeline: async (data: CreatePipelineRequest): Promise<ApiResponse<Pipeline>> => {
    return apiClient.gis.post<Pipeline>('/api/v1/pipelines', data);
  },

  listStorageLocations: async (): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>('/api/v1/storage-locations');
  },
  createStorageLocation: async (data: CreateStorageLocationRequest): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.post<StorageLocation>('/api/v1/storage-locations', data);
  },

  listEvidenceRecords: async (): Promise<ApiResponse<any>> => {
    return apiClient.gis.get<any>('/api/v1/evidence-records');
  },
  createEvidenceRecord: async (data: CreateEvidenceRecordRequest): Promise<ApiResponse<EvidenceRecord>> => {
    return apiClient.gis.post<EvidenceRecord>('/api/v1/evidence-records', data);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.gis.get<string>('/health');
  },

  importData: async (type: string, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return apiClient.gis.post<any>('/api/v1/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};
