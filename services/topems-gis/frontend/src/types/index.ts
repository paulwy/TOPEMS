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

export interface DeviceLocation {
  id: string;
  map_id: string;
  device_name: string;
  device_code: string;
  device_type?: string;
  position: { lat: number; lng: number };
  status: string;
  description?: string;
  last_inspected?: string;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  map_id: string;
  name: string;
  code: string;
  pipeline_type?: string;
  path: Array<{ lat: number; lng: number }>;
  properties?: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WarehouseLocation {
  id: string;
  map_id: string;
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
  map_id: string;
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

export interface ApiResponse<T> {
  code: number;
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
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
