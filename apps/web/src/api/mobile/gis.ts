/**
 * Mobile · 移动端 GIS 地理信息 API 绑定
 *
 * 后端: svc/mobile/src/main.rs (通过 GIS/地图服务客户端)
 * 路由:
 *   GET    /mobile/routes
 *   GET    /mobile/routes/{id}
 *   POST   /mobile/routes
 *   PUT    /mobile/routes/{id}
 *   DELETE /mobile/routes/{id}
 *   GET    /mobile/routes/{id}/stops
 *   POST   /mobile/routes/{id}/stops
 *   GET    /mobile/zones
 *   POST   /mobile/zones
 *   GET    /mobile/geofences
 *   POST   /mobile/geofences
 *   PUT    /mobile/geofences/{id}
 *   DELETE /mobile/geofences/{id}
 *   POST   /mobile/geofences/{id}/check
 *   GET    /mobile/locations/current
 *   POST   /mobile/locations/track
 *   GET    /mobile/locations/history
 *   GET    /mobile/map/layers
 *   GET    /mobile/map/markers
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type RouteStatus = 'draft' | 'active' | 'paused' | 'completed';
export type ZoneType = 'work_area' | 'delivery_area' | 'service_area' | 'restricted_area';
export type GeofenceShape = 'circle' | 'polygon';
export type GeofenceAction = 'enter' | 'exit' | 'both';

export interface GeoPoint {
  lat: number;
  lng: number;
  address?: string;
}

export interface Route {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status: RouteStatus;
  start_point: GeoPoint;
  end_point: GeoPoint;
  distance_km?: number;
  estimated_duration_minutes?: number;
  stops: RouteStop[];
  created_at: string;
  updated_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  name: string;
  sequence: number;
  location: GeoPoint;
  duration_minutes?: number;
  notes?: string;
}

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  description?: string;
  center: GeoPoint;
  radius_m?: number;
  polygon_points?: GeoPoint[];
  color?: string;
  is_active: boolean;
}

export interface Geofence {
  id: string;
  name: string;
  shape: GeofenceShape;
  center: GeoPoint;
  radius_m?: number;
  polygon_points?: GeoPoint[];
  action: GeofenceAction;
  is_active: boolean;
  notification_enabled: boolean;
  created_at: string;
}

export interface GeofenceCheckResult {
  geofence_id: string;
  geofence_name: string;
  is_inside: boolean;
  distance_m?: number;
  action: GeofenceAction;
}

export interface LocationRecord {
  id: string;
  user_id: string;
  timestamp: string;
  location: GeoPoint;
  accuracy_m?: number;
  speed_kmh?: number;
  bearing?: number;
  source: 'gps' | 'network' | 'manual';
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'tile' | 'heatmap' | 'clustering' | 'custom';
  url?: string;
  is_visible: boolean;
  z_index: number;
}

export interface MapMarker {
  id: string;
  entity_type: 'task' | 'order' | 'equipment' | 'vehicle' | 'user';
  entity_id: string;
  title: string;
  location: GeoPoint;
  status?: string;
  icon?: string;
}

export interface CreateRouteRequest {
  name: string;
  description?: string;
  start_point: GeoPoint;
  end_point: GeoPoint;
  stops?: Omit<RouteStop, 'id' | 'route_id'>[];
}

export interface CreateStopRequest {
  name: string;
  sequence: number;
  location: GeoPoint;
  duration_minutes?: number;
  notes?: string;
}

export interface CreateZoneRequest {
  name: string;
  type: ZoneType;
  description?: string;
  center: GeoPoint;
  radius_m?: number;
  polygon_points?: GeoPoint[];
  color?: string;
}

export interface CreateGeofenceRequest {
  name: string;
  shape: GeofenceShape;
  center: GeoPoint;
  radius_m?: number;
  polygon_points?: GeoPoint[];
  action?: GeofenceAction;
}

export const gisApi = {
  // ==================== 巡检路线管理 ====================

  listRoutes: async (params?: {
    status?: RouteStatus;
    keyword?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Route>>> => {
    return apiClient.mobile.get('routes', { params });
  },

  getRoute: async (id: string): Promise<ApiResponse<Route>> => {
    return apiClient.mobile.get(`routes/${id}`);
  },

  createRoute: async (data: CreateRouteRequest): Promise<ApiResponse<Route>> => {
    return apiClient.mobile.post('routes', data);
  },

  updateRoute: async (
    id: string,
    data: Partial<CreateRouteRequest>
  ): Promise<ApiResponse<Route>> => {
    return apiClient.mobile.put(`routes/${id}`, data);
  },

  deleteRoute: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`routes/${id}`);
  },

  // ==================== 路线停靠点 ====================

  listRouteStops: async (routeId: string): Promise<ApiResponse<RouteStop[]>> => {
    return apiClient.mobile.get(`routes/${routeId}/stops`);
  },

  createRouteStop: async (
    routeId: string,
    data: CreateStopRequest
  ): Promise<ApiResponse<RouteStop>> => {
    return apiClient.mobile.post(`routes/${routeId}/stops`, data);
  },

  // ==================== 区域管理 ====================

  listZones: async (params?: {
    type?: ZoneType;
    is_active?: boolean;
  }): Promise<ApiResponse<Zone[]>> => {
    return apiClient.mobile.get('zones', { params });
  },

  createZone: async (data: CreateZoneRequest): Promise<ApiResponse<Zone>> => {
    return apiClient.mobile.post('zones', data);
  },

  // ==================== 地理围栏 ====================

  listGeofences: async (params?: {
    shape?: GeofenceShape;
    is_active?: boolean;
  }): Promise<ApiResponse<Geofence[]>> => {
    return apiClient.mobile.get('geofences', { params });
  },

  createGeofence: async (data: CreateGeofenceRequest): Promise<ApiResponse<Geofence>> => {
    return apiClient.mobile.post('geofences', data);
  },

  updateGeofence: async (
    id: string,
    data: Partial<CreateGeofenceRequest>
  ): Promise<ApiResponse<Geofence>> => {
    return apiClient.mobile.put(`geofences/${id}`, data);
  },

  deleteGeofence: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`geofences/${id}`);
  },

  checkGeofence: async (
    id: string,
    location: GeoPoint
  ): Promise<ApiResponse<GeofenceCheckResult>> => {
    return apiClient.mobile.post(`geofences/${id}/check`, location);
  },

  // ==================== 位置服务 ====================

  getCurrentLocation: async (): Promise<ApiResponse<LocationRecord>> => {
    return apiClient.mobile.get('locations/current');
  },

  trackLocation: async (data: {
    location: GeoPoint;
    speed_kmh?: number;
    bearing?: number;
  }): Promise<ApiResponse<LocationRecord>> => {
    return apiClient.mobile.post('locations/track', data);
  },

  getLocationHistory: async (params?: {
    start_time?: string;
    end_time?: string;
    limit?: number;
  }): Promise<ApiResponse<LocationRecord[]>> => {
    return apiClient.mobile.get('locations/history', { params });
  },

  // ==================== 地图图层与标记 ====================

  listMapLayers: async (): Promise<ApiResponse<MapLayer[]>> => {
    return apiClient.mobile.get('map/layers');
  },

  listMapMarkers: async (params?: {
    entity_type?: MapMarker['entity_type'];
    bounds?: string;
  }): Promise<ApiResponse<MapMarker[]>> => {
    return apiClient.mobile.get('map/markers', { params });
  },
};

export default gisApi;
