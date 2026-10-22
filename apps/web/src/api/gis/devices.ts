import apiClient from '../client';
import type { PaginationParams } from '../client';

// ==================== GIS 设备注册 ====================

export interface GisDevice {
  id: string;
  device_code: string;
  device_name: string;
  device_type?: string | null;
  description?: string | null;
  properties?: unknown | null;
  status: string;
  registered_by?: string | null;
}

export interface CreateDeviceRequest {
  device_code: string;
  device_name: string;
  device_type?: string;
  description?: string;
  properties?: unknown;
  status?: string;
}

export interface UpdateDeviceRequest {
  device_name?: string;
  device_type?: string;
  description?: string;
  properties?: unknown;
  status?: string;
}

export interface DeviceListResponse {
  items: GisDevice[];
  total: number;
  page: number;
  page_size: number;
}

export const gisDeviceApi = {
  list: (params: PaginationParams & { search?: string; status?: string }) =>
    apiClient.gis.get<DeviceListResponse>('/devices', { params }),
  create: (data: CreateDeviceRequest) => apiClient.gis.post<{ id: string }>('/devices', data),
  update: (id: string, data: UpdateDeviceRequest) =>
    apiClient.gis.put<{ id: string }>(`/devices/${id}`, data),
  remove: (id: string) => apiClient.gis.delete<string>(`/devices/${id}`),
};
