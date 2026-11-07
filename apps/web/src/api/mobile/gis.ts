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

// 批 37 (g3)：gisApi 全部 19 个方法已删（前端零消费，均为 contract_fallback 占位端点），
// 故 apiClient / ApiResponse / PaginatedResponse 均不再需要，import 一并移除。
// 类型定义保留：RouteStatus 等仍被其它模块引用。

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

// 批 37 (g3)：routes / zones / geofences / locations / map 等 19 个端点均为
// contract_fallback.rs 轻量占位，前端无任何页面/组件/hook 调用，死封装已删除。
// 仅保留类型定义，待上游真实实现后再恢复 API 方法。
export const gisApi = {};

export default gisApi;
