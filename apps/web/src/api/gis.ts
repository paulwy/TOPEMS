import apiClient from './client';
import type { ApiResponse } from './client';

export interface ListQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface RawPaginatedResponse {
  [key: string]: any[] | number;
  total: number;
}

function adaptResponse<T>(response: RawPaginatedResponse, dataKey: string): PaginatedResponse<T> {
  const data = (response[dataKey] as T[]) || [];
  const total = (response.total as number) || data.length;
  return {
    data,
    total,
    page: (response.page as number) || 1,
    pageSize: (response.pageSize as number) || (response.page_size as number) || data.length,
    totalPages: (response.totalPages as number) || (response.total_pages as number) || 1,
  };
}

export interface GisStatistics {
  device_points: number;
  pipelines: number;
  storage_locations: number;
  evidence_records: number;
  business_locations: number;
  factory_maps: number;
  active_devices: number;
  active_pipelines: number;
}

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

export interface DeviceLocationRecord {
  id: string;
  device_id: string;
  device_name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
  created_at: string;
}

export interface TrackQueryParams {
  device_id: string;
  start_time?: string;
  end_time?: string;
  page?: number;
  page_size?: number;
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

// 业务位置 - 支持更广泛的业务范围
export interface BusinessLocation {
  id: string;
  business_type: string;
  business_name: string;
  business_code?: string;
  category?: string;
  position: { lat: number; lng: number };
  address?: string;
  contact_person?: string;
  contact_phone?: string;
  capacity?: number;
  current_usage?: number;
  status: string;
  properties?: Record<string, any>;
  description?: string;
  external_id?: string;
  external_type?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBusinessLocationRequest {
  business_type: string;
  business_name: string;
  business_code?: string;
  category?: string;
  position: { lat: number; lng: number };
  address?: string;
  contact_person?: string;
  contact_phone?: string;
  capacity?: number;
  current_usage?: number;
  status?: string;
  properties?: Record<string, any>;
  description?: string;
  external_id?: string;
  external_type?: string;
}

// 地图标记
export interface MapMarker {
  id: string;
  marker_type: string;
  name: string;
  marker_style?: string;
  position: { lat: number; lng: number };
  icon_svg?: string;
  color?: string;
  size?: number;
  popup_content?: string;
  click_action?: string;
  action_data?: Record<string, any>;
  visible?: boolean;
  z_index?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMapMarkerRequest {
  marker_type: string;
  name: string;
  marker_style?: string;
  position: { lat: number; lng: number };
  icon_svg?: string;
  color?: string;
  size?: number;
  popup_content?: string;
  click_action?: string;
  action_data?: Record<string, any>;
  visible?: boolean;
  z_index?: number;
}

export interface CreateFactoryMapRequest {
  name: string;
  code: string;
  map_type: string;
  file_url: string;
  bounds?: any;
  description?: string;
}

// 厂区地图
export interface FactoryMap {
  id: string;
  name: string;
  code: string;
  map_type: string;
  file_url: string;
  bounds?: { north: number; south: number; east: number; west: number };
  description?: string;
  created_at: string;
  updated_at: string;
}

// 搜索结果
export interface SearchResult {
  type: string;
  id: string;
  name: string;
  code?: string;
  position?: { lat: number; lng: number };
  status: string;
}

// GeoJSON 导出
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface GeoJSON {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export const gisApi = {
  // 统计数据
  getStatistics: async (): Promise<ApiResponse<GisStatistics>> => {
    return apiClient.gis.get<GisStatistics>('/api/gis/statistics');
  },

  // 设备点位
  listDevicePoints: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<DevicePoint>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.gis.get<any>(
      `/api/gis/device-locations?${queryParams.toString()}`
    );
    if (response.success && response.data) {
      const adapted = adaptResponse<any>(response.data, 'device_locations');
      // 转换 position.{lat,lng} 到 latitude/longitude
      adapted.data = adapted.data.map(
        (item: {
          position?: { lat?: number; lng?: number };
          latitude?: number;
          longitude?: number;
        }) => ({
          ...item,
          latitude: item.position?.lat ?? item.latitude ?? 0,
          longitude: item.position?.lng ?? item.longitude ?? 0,
        })
      );
      response.data = adapted;
    }
    return response as ApiResponse<PaginatedResponse<DevicePoint>>;
  },
  getDevicePoint: async (id: string): Promise<ApiResponse<DevicePoint>> => {
    return apiClient.gis.get<DevicePoint>(`/api/gis/device-locations/${id}`);
  },
  listDevicePointsByMap: async (
    mapId: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<DevicePoint>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    return apiClient.gis.get<PaginatedResponse<DevicePoint>>(
      `/api/gis/device-locations/map/${mapId}?${queryParams.toString()}`
    );
  },
  createDevicePoint: async (data: CreateDevicePointRequest): Promise<ApiResponse<DevicePoint>> => {
    return apiClient.gis.post<DevicePoint>('/api/gis/device-locations', data);
  },
  updateDevicePoint: async (
    id: string,
    data: Partial<CreateDevicePointRequest>
  ): Promise<ApiResponse<DevicePoint>> => {
    return apiClient.gis.put<DevicePoint>(`/api/gis/device-locations/${id}`, data);
  },
  deleteDevicePoint: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/api/gis/device-locations/${id}`);
  },

  // 管线
  listPipelines: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Pipeline>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.gis.get<any>(`/api/gis/pipelines?${queryParams.toString()}`);
    if (response.success && response.data) {
      response.data = adaptResponse<Pipeline>(response.data, 'pipelines');
    }
    return response as ApiResponse<PaginatedResponse<Pipeline>>;
  },
  getPipeline: async (id: string): Promise<ApiResponse<Pipeline>> => {
    return apiClient.gis.get<Pipeline>(`/api/gis/pipelines/${id}`);
  },
  listPipelinesByMap: async (
    mapId: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Pipeline>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    return apiClient.gis.get<PaginatedResponse<Pipeline>>(
      `/api/gis/pipelines/map/${mapId}?${queryParams.toString()}`
    );
  },
  createPipeline: async (data: CreatePipelineRequest): Promise<ApiResponse<Pipeline>> => {
    return apiClient.gis.post<Pipeline>('/api/gis/pipelines', data);
  },
  updatePipeline: async (
    id: string,
    data: Partial<CreatePipelineRequest>
  ): Promise<ApiResponse<Pipeline>> => {
    return apiClient.gis.put<Pipeline>(`/api/gis/pipelines/${id}`, data);
  },
  deletePipeline: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/api/gis/pipelines/${id}`);
  },

  // 仓储位置
  listStorageLocations: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<StorageLocation>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.gis.get<any>(
      `/api/gis/warehouse-locations?${queryParams.toString()}`
    );
    if (response.success && response.data) {
      response.data = adaptResponse<StorageLocation>(response.data, 'warehouse_locations');
    }
    return response as ApiResponse<PaginatedResponse<StorageLocation>>;
  },
  getStorageLocation: async (id: string): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.get<StorageLocation>(`/api/gis/warehouse-locations/${id}`);
  },
  listStorageLocationsByMap: async (
    mapId: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<StorageLocation>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    return apiClient.gis.get<PaginatedResponse<StorageLocation>>(
      `/api/gis/warehouse-locations/map/${mapId}?${queryParams.toString()}`
    );
  },
  createStorageLocation: async (
    data: CreateStorageLocationRequest
  ): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.post<StorageLocation>('/api/gis/warehouse-locations', data);
  },
  updateStorageLocation: async (
    id: string,
    data: Partial<CreateStorageLocationRequest>
  ): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.put<StorageLocation>(`/api/gis/warehouse-locations/${id}`, data);
  },
  deleteStorageLocation: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/api/gis/warehouse-locations/${id}`);
  },

  // 现场取证
  listEvidenceRecords: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EvidenceRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.gis.get<any>(
      `/api/gis/location-photos?${queryParams.toString()}`
    );
    if (response.success && response.data) {
      response.data = adaptResponse<EvidenceRecord>(response.data, 'location_photos');
    }
    return response as ApiResponse<PaginatedResponse<EvidenceRecord>>;
  },
  getEvidenceRecord: async (id: string): Promise<ApiResponse<LocationPhoto>> => {
    return apiClient.gis.get<LocationPhoto>(`/api/gis/location-photos/${id}`);
  },
  listEvidenceRecordsByMap: async (
    mapId: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EvidenceRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    return apiClient.gis.get<PaginatedResponse<EvidenceRecord>>(
      `/api/gis/location-photos/map/${mapId}?${queryParams.toString()}`
    );
  },
  createEvidenceRecord: async (
    data: CreateEvidenceRecordRequest
  ): Promise<ApiResponse<EvidenceRecord>> => {
    return apiClient.gis.post<EvidenceRecord>('/api/gis/location-photos', data);
  },
  deleteEvidenceRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/api/gis/location-photos/${id}`);
  },

  // 厂区地图
  listFactoryMaps: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<FactoryMap>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.gis.get<any>(
      `/api/gis/factory-maps?${queryParams.toString()}`
    );
    if (response.success && response.data) {
      response.data = adaptResponse<FactoryMap>(response.data, 'factory_maps');
    }
    return response as ApiResponse<PaginatedResponse<FactoryMap>>;
  },
  getFactoryMap: async (id: string): Promise<ApiResponse<FactoryMap>> => {
    return apiClient.gis.get<FactoryMap>(`/api/gis/factory-maps/${id}`);
  },
  createFactoryMap: async (data: CreateFactoryMapRequest): Promise<ApiResponse<FactoryMap>> => {
    return apiClient.gis.post<FactoryMap>('/api/gis/factory-maps', data);
  },
  updateFactoryMap: async (
    id: string,
    data: Partial<CreateFactoryMapRequest>
  ): Promise<ApiResponse<FactoryMap>> => {
    return apiClient.gis.put<FactoryMap>(`/api/gis/factory-maps/${id}`, data);
  },
  deleteFactoryMap: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/api/gis/factory-maps/${id}`);
  },

  // 业务位置
  listBusinessLocations: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<BusinessLocation>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.gis.get<any>(
      `/api/gis/business-locations?${queryParams.toString()}`
    );
    if (response.success && response.data) {
      response.data = adaptResponse<BusinessLocation>(response.data, 'business_locations');
    }
    return response as ApiResponse<PaginatedResponse<BusinessLocation>>;
  },
  getBusinessLocation: async (id: string): Promise<ApiResponse<BusinessLocation>> => {
    return apiClient.gis.get<BusinessLocation>(`/api/gis/business-locations/${id}`);
  },
  listBusinessLocationsByType: async (
    type: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<BusinessLocation>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const response = await apiClient.gis.get<any>(
      `/api/gis/business-locations/type/${type}?${queryParams.toString()}`
    );
    if (response.success && response.data) {
      response.data = adaptResponse<BusinessLocation>(response.data, 'business_locations');
    }
    return response as ApiResponse<PaginatedResponse<BusinessLocation>>;
  },
  createBusinessLocation: async (
    data: CreateBusinessLocationRequest
  ): Promise<ApiResponse<BusinessLocation>> => {
    return apiClient.gis.post<BusinessLocation>('/api/gis/business-locations', data);
  },
  updateBusinessLocation: async (
    id: string,
    data: Partial<CreateBusinessLocationRequest>
  ): Promise<ApiResponse<BusinessLocation>> => {
    return apiClient.gis.put<BusinessLocation>(`/api/gis/business-locations/${id}`, data);
  },
  deleteBusinessLocation: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/api/gis/business-locations/${id}`);
  },

  // 地图标记
  listMapMarkers: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<MapMarker>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.gis.get<any>(`/api/gis/map-markers?${queryParams.toString()}`);
    if (response.success && response.data) {
      response.data = adaptResponse<MapMarker>(response.data, 'map_markers');
    }
    return response as ApiResponse<PaginatedResponse<MapMarker>>;
  },
  createMapMarker: async (data: CreateMapMarkerRequest): Promise<ApiResponse<MapMarker>> => {
    return apiClient.gis.post<MapMarker>('/api/gis/map-markers', data);
  },
  updateMapMarker: async (
    id: string,
    data: Partial<CreateMapMarkerRequest>
  ): Promise<ApiResponse<MapMarker>> => {
    return apiClient.gis.put<MapMarker>(`/api/gis/map-markers/${id}`, data);
  },
  deleteMapMarker: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/api/gis/map-markers/${id}`);
  },

  // 搜索
  search: async (query: string, type?: string): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    return apiClient.gis.get<any>(`/api/gis/search?${params.toString()}`);
  },

  // GeoJSON 导出
  exportGeoJSON: async (): Promise<ApiResponse<GeoJSON>> => {
    return apiClient.gis.get<GeoJSON>('/api/gis/geojson/export');
  },

  // 健康检查
  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.gis.get<string>('/health');
  },

  // 导入
  importData: async (type: string, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return apiClient.gis.post<any>('/api/gis/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 设备轨迹追踪
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
      `/api/gis/device-tracks?${queryParams.toString()}`
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
    }>(`/api/gis/device-tracks/${device_id}/statistics`);
  },
  listDevicesWithTracks: async (): Promise<ApiResponse<DevicePoint[]>> => {
    return apiClient.gis.get<DevicePoint[]>('/api/gis/device-tracks/devices');
  },
};
