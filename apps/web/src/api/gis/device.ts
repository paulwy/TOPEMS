import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  DevicePoint,
  CreateDevicePointRequest,
  ListQueryParams,
  PaginatedResponse,
  TrackQueryParams,
  DeviceLocationRecord,
  RawPaginatedResponse,
} from './types';
import { adaptResponse } from './utils';

export const deviceApi = {
  listDevicePoints: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<DevicePoint>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const rawResponse = await apiClient.gis.get<RawPaginatedResponse>(
      `/device-locations?${queryParams.toString()}`
    );
    if (rawResponse.success && rawResponse.data) {
      const adapted = adaptResponse<DevicePoint>(rawResponse.data, 'device_locations');
      adapted.items = adapted.items.map(
        (item: {
          position?: { lat?: number; lng?: number };
          latitude?: number;
          longitude?: number;
        }) =>
          ({
            ...item,
            latitude: item.position?.lat ?? item.latitude ?? 0,
            longitude: item.position?.lng ?? item.longitude ?? 0,
          }) as DevicePoint
      );
      return {
        ...rawResponse,
        data: adapted,
      } as unknown as ApiResponse<PaginatedResponse<DevicePoint>>;
    }
    return rawResponse as unknown as ApiResponse<PaginatedResponse<DevicePoint>>;
  },

  getDevicePoint: async (id: string): Promise<ApiResponse<DevicePoint>> => {
    return apiClient.gis.get<DevicePoint>(`/device-locations/${id}`);
  },

  listDevicePointsByMap: async (
    mapId: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<DevicePoint>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    return apiClient.gis.get<PaginatedResponse<DevicePoint>>(
      `/device-locations/map/${mapId}?${queryParams.toString()}`
    );
  },

  createDevicePoint: async (data: CreateDevicePointRequest): Promise<ApiResponse<DevicePoint>> => {
    return apiClient.gis.post<DevicePoint>('/device-locations', data);
  },

  updateDevicePoint: async (
    id: string,
    data: Partial<CreateDevicePointRequest>
  ): Promise<ApiResponse<DevicePoint>> => {
    return apiClient.gis.put<DevicePoint>(`/device-locations/${id}`, data);
  },

  deleteDevicePoint: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/device-locations/${id}`);
  },

  getDeviceTrack: async (
    params: TrackQueryParams
  ): Promise<ApiResponse<PaginatedResponse<DeviceLocationRecord>>> => {
    const queryParams = new URLSearchParams();
    queryParams.append('device_id', params.device_id);
    if (params.start_time) queryParams.append('start_time', params.start_time);
    if (params.end_time) queryParams.append('end_time', params.end_time);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());

    return apiClient.gis.get<PaginatedResponse<DeviceLocationRecord>>(
      `/device-tracks?${queryParams.toString()}`
    );
  },

  getDeviceTrackStatistics: async (
    device_id: string
  ): Promise<
    ApiResponse<{
      total_distance: number;
      avg_speed: number;
      max_speed: number;
      track_points: number;
      start_time: string;
      end_time: string;
    }>
  > => {
    return apiClient.gis.get<{
      total_distance: number;
      avg_speed: number;
      max_speed: number;
      track_points: number;
      start_time: string;
      end_time: string;
    }>(`/device-tracks/${device_id}/statistics`);
  },

  listDevicesWithTracks: async (): Promise<ApiResponse<DevicePoint[]>> => {
    return apiClient.gis.get<DevicePoint[]>('/device-tracks/devices');
  },
};
