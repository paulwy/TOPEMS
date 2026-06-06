import type { FactoryMap, DeviceLocation, Pipeline, WarehouseLocation, LocationPhoto, BusinessLocation, MapMarker, ApiResponse } from '../types';

const API_BASE = 'http://localhost:8050/api/v1';

export async function fetchFactoryMaps(): Promise<ApiResponse<{ factory_maps: FactoryMap[]; total: number }>> {
  const response = await fetch(`${API_BASE}/factory-maps`);
  return response.json();
}

export async function createFactoryMap(data: Omit<FactoryMap, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<FactoryMap>> {
  const response = await fetch(`${API_BASE}/factory-maps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function fetchDeviceLocations(): Promise<ApiResponse<{ device_locations: DeviceLocation[]; total: number }>> {
  const response = await fetch(`${API_BASE}/device-locations`);
  return response.json();
}

export async function fetchDeviceLocationsByMap(mapId: string): Promise<ApiResponse<{ device_locations: DeviceLocation[]; total: number }>> {
  const response = await fetch(`${API_BASE}/device-locations/map/${mapId}`);
  return response.json();
}

export async function createDeviceLocation(data: Omit<DeviceLocation, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<DeviceLocation>> {
  const response = await fetch(`${API_BASE}/device-locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function fetchPipelines(): Promise<ApiResponse<{ pipelines: Pipeline[]; total: number }>> {
  const response = await fetch(`${API_BASE}/pipelines`);
  return response.json();
}

export async function fetchPipelinesByMap(mapId: string): Promise<ApiResponse<{ pipelines: Pipeline[]; total: number }>> {
  const response = await fetch(`${API_BASE}/pipelines/map/${mapId}`);
  return response.json();
}

export async function fetchWarehouseLocations(): Promise<ApiResponse<{ warehouse_locations: WarehouseLocation[]; total: number }>> {
  const response = await fetch(`${API_BASE}/warehouse-locations`);
  return response.json();
}

export async function fetchWarehouseLocationsByMap(mapId: string): Promise<ApiResponse<{ warehouse_locations: WarehouseLocation[]; total: number }>> {
  const response = await fetch(`${API_BASE}/warehouse-locations/map/${mapId}`);
  return response.json();
}

export async function fetchLocationPhotos(): Promise<ApiResponse<{ location_photos: LocationPhoto[]; total: number }>> {
  const response = await fetch(`${API_BASE}/location-photos`);
  return response.json();
}

export async function fetchLocationPhotosByMap(mapId: string): Promise<ApiResponse<{ location_photos: LocationPhoto[]; total: number }>> {
  const response = await fetch(`${API_BASE}/location-photos/map/${mapId}`);
  return response.json();
}

export async function createLocationPhoto(data: Omit<LocationPhoto, 'id' | 'created_at'>): Promise<ApiResponse<LocationPhoto>> {
  const response = await fetch(`${API_BASE}/location-photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

// 业务位置 API
export async function fetchBusinessLocations(): Promise<ApiResponse<{ business_locations: BusinessLocation[]; total: number }>> {
  const response = await fetch(`${API_BASE}/business-locations`);
  return response.json();
}

export async function fetchBusinessLocationsByType(type: string): Promise<ApiResponse<{ business_locations: BusinessLocation[]; total: number }>> {
  const response = await fetch(`${API_BASE}/business-locations/type/${type}`);
  return response.json();
}

export async function createBusinessLocation(data: Omit<BusinessLocation, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<BusinessLocation>> {
  const response = await fetch(`${API_BASE}/business-locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

// 地图标记 API
export async function fetchMapMarkers(): Promise<ApiResponse<{ map_markers: MapMarker[]; total: number }>> {
  const response = await fetch(`${API_BASE}/map-markers`);
  return response.json();
}

export async function createMapMarker(data: Omit<MapMarker, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<MapMarker>> {
  const response = await fetch(`${API_BASE}/map-markers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

// 搜索 API
export async function searchLocations(query: string, type?: string): Promise<ApiResponse<{ results: any[]; total: number; query: string }>> {
  const params = new URLSearchParams({ q: query });
  if (type) params.append('type', type);
  const response = await fetch(`${API_BASE}/search?${params.toString()}`);
  return response.json();
}

// GeoJSON 导出
export async function exportGeoJSON(): Promise<ApiResponse<any>> {
  const response = await fetch(`${API_BASE}/geojson/export`);
  return response.json();
}
