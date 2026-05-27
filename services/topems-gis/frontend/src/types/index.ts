export interface FactoryMap {
  id: string;
  name: string;
  code: string;
  map_type: string;
  file_url: string;
  bounds?: any;
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

export interface ApiResponse<T> {
  code: number;
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
}
