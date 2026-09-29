import type { PaginatedResponse } from '@topems/shared-types';
import type { PaginationParams } from '@/api/client';

export { PaginatedResponse };

export type ListQueryParams = PaginationParams & { status?: string };

export interface RawPaginatedResponse {
  [key: string]: unknown;
  total: number;
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
  batterylevel?: number;
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
  map_id?: string;
  name: string;
  code: string;
  description?: string;
  pipeline_type: string;
  /** 后端真实几何字段（GeoJSON LineString）；旧 start_point/end_point 由此派生 */
  path: unknown;
  properties?: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
  /** 兼容旧消费方（由 pathToStartEnd 从 path 派生）；新代码应直接读 path */
  start_point?: [number, number];
  end_point?: [number, number];
}

export interface CreatePipelineRequest {
  /** 后端必填（Pipeline.code NOT NULL，缺失会 422） */
  code: string;
  name: string;
  description?: string;
  pipeline_type: string;
  /** 后端必填 GeoJSON 路径（如 LineString），缺失会 422 */
  path: unknown;
  /** 兼容旧表单：start/end 点，发送前应转成 path */
  start_point?: [number, number];
  end_point?: [number, number];
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

export interface LocationPhoto {
  id: string;
  position: { lat: number; lng: number };
  photo_url: string;
  description?: string;
  taken_by: string;
  taken_at: string;
  created_at: string;
}

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
  properties?: Record<string, unknown>;
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
  properties?: Record<string, unknown>;
  description?: string;
  external_id?: string;
  external_type?: string;
}

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
  action_data?: Record<string, unknown>;
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
  action_data?: Record<string, unknown>;
  visible?: boolean;
  z_index?: number;
}

export interface CreateFactoryMapRequest {
  name: string;
  code: string;
  map_type: string;
  file_url: string;
  bounds?: { north: number; south: number; east: number; west: number };
  description?: string;
}

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

export interface SearchResult {
  type: string;
  id: string;
  name: string;
  code?: string;
  position?: { lat: number; lng: number };
  status: string;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, unknown>;
}

export interface GeoJSON {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}
