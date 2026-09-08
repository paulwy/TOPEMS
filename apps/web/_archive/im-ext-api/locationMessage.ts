import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import i18n from '@/i18n';

export type LocationType = 'point' | 'polygon' | 'circle' | 'route';
export type MapProvider = 'amap' | 'baidu' | 'google' | 'osm' | 'gis';
export type GeofenceStatus = 'active' | 'inactive' | 'expired';
export type GeofenceEventType = 'enter' | 'exit' | 'stay';
export type GisLayerType = 'map' | 'geodata' | 'location' | 'device' | 'storage' | 'pipeline';
export type SpatialOperation = 'distance' | 'buffer' | 'intersect' | 'contains' | 'within' | 'near';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp?: string;
}

export interface LocationMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  location_type: LocationType;
  coordinate: GeoCoordinate;
  address?: string;
  place_name?: string;
  place_id?: string;
  gis_location_id?: string;
  gis_location_code?: string;
  gis_map_id?: string;
  gis_map_name?: string;
  map_provider: MapProvider;
  static_map_url?: string;
  map_zoom: number;
  map_bearing?: number;
  map_tilt?: number;
  poi_types?: string[];
  description?: string;
  created_at: string;
}

export interface PlaceOfInterest {
  id: string;
  name: string;
  category: string;
  sub_category?: string;
  coordinate: GeoCoordinate;
  address: string;
  phone?: string;
  rating?: number;
  photos?: string[];
  opening_hours?: string;
  website?: string;
  distance?: number;
  map_provider: MapProvider;
  gis_location_id?: string;
}

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  chat_id: string;
  creator_id: string;
  creator_name: string;
  shape_type: LocationType;
  coordinates: GeoCoordinate[];
  radius?: number;
  event_types: GeofenceEventType[];
  status: GeofenceStatus;
  trigger_cooldown: number;
  notify_channels: ('notification' | 'vibration' | 'sound')[];
  notify_users: string[];
  gis_fence_id?: string;
  start_at?: string;
  end_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GeofenceEvent {
  id: string;
  geofence_id: string;
  geofence_name: string;
  event_type: GeofenceEventType;
  user_id: string;
  user_name: string;
  coordinate: GeoCoordinate;
  distance: number;
  created_at: string;
}

export interface StaticMapOptions {
  width: number;
  height: number;
  zoom?: number;
  bearing?: number;
  tilt?: number;
  markers?: GeoCoordinate[];
  path?: GeoCoordinate[];
  format?: 'png' | 'jpg';
  gis_map_id?: string;
  overlays?: string[];
}

export interface Route {
  id: string;
  origin: GeoCoordinate;
  destination: GeoCoordinate;
  waypoints?: GeoCoordinate[];
  distance: number;
  duration: number;
  steps: RouteStep[];
  polyline: string;
  map_provider: MapProvider;
  created_at: string;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  start_location: GeoCoordinate;
  end_location: GeoCoordinate;
  polyline: string;
  road?: string;
}

export interface GisMapRef {
  id: string;
  name: string;
  code: string;
  map_type: string;
  zoom_level: number;
  center: GeoCoordinate;
  bounds?: {
    southwest: GeoCoordinate;
    northeast: GeoCoordinate;
  };
  layer_count: number;
  created_at: string;
}

export interface GisLocationRef {
  id: string;
  name: string;
  code: string;
  zone?: string;
  type?: string;
  coordinates: GeoCoordinate;
  status: string;
  map_id?: string;
  properties?: Record<string, unknown>;
}

export interface GisDeviceTrack {
  device_id: string;
  device_name: string;
  coordinates: GeoCoordinate[];
  distance: number;
  duration: number;
  start_time: string;
  end_time: string;
  status: 'idle' | 'moving' | 'offline';
}

export interface SpatialQueryResult {
  operation: SpatialOperation;
  query_point?: GeoCoordinate;
  results: {
    id: string;
    name: string;
    type: string;
    distance?: number;
    area?: number;
    intersection_area?: number;
    properties?: Record<string, unknown>;
  }[];
  total_count: number;
}

export interface LocationHistory {
  id: string;
  user_id: string;
  coordinate: GeoCoordinate;
  address?: string;
  place_name?: string;
  gis_location_id?: string;
  activity_type?: 'walking' | 'driving' | 'cycling' | 'running' | 'stationary';
  speed?: number;
  heading?: number;
  created_at: string;
}

export interface LocationShareLink {
  id: string;
  location_id: string;
  chat_id: string;
  share_url: string;
  password?: string;
  expires_at: string;
  viewer_count: number;
  created_by: string;
  created_at: string;
}

export interface LocationStats {
  chat_id: string;
  total_locations: number;
  shared_locations: number;
  geofences: number;
  poi_searches: number;
  gis_refs: number;
  spatial_queries: number;
  last_location_at?: string;
  most_used_place?: string;
}

export interface UnifiedPoiResult {
  items: PlaceOfInterest[];
  gis_results_count: number;
  third_party_results_count: number;
  total: number;
  providers_used: MapProvider[];
}

export interface GeofenceSyncResult {
  geofence: Geofence;
  gis_sync_status: 'synced' | 'pending' | 'failed' | 'not_supported';
  gis_fence_id?: string;
  gis_error?: string;
}

export interface SendLocationRequest {
  chat_id: string;
  location_type: LocationType;
  coordinate: GeoCoordinate;
  place_name?: string;
  place_id?: string;
  gis_location_id?: string;
  gis_map_id?: string;
  address?: string;
  description?: string;
  map_provider?: MapProvider;
  static_map?: boolean;
}

export interface CreateGeofenceRequest {
  name: string;
  description?: string;
  chat_id: string;
  shape_type: LocationType;
  coordinates: GeoCoordinate[];
  radius?: number;
  event_types?: GeofenceEventType[];
  trigger_cooldown?: number;
  notify_channels?: ('notification' | 'vibration' | 'sound')[];
  notify_users?: string[];
  sync_to_gis?: boolean;
  start_at?: string;
  end_at?: string;
}

export interface UpdateGeofenceRequest {
  name?: string;
  description?: string;
  coordinates?: GeoCoordinate[];
  radius?: number;
  event_types?: GeofenceEventType[];
  status?: GeofenceStatus;
  sync_to_gis?: boolean;
  start_at?: string;
  end_at?: string;
}

export interface SearchPlaceRequest {
  keyword: string;
  coordinate?: GeoCoordinate;
  radius?: number;
  categories?: string[];
  map_provider?: MapProvider;
  include_gis?: boolean;
  gis_map_id?: string;
  page?: number;
  page_size?: number;
}

export interface CalculateRouteRequest {
  origin: GeoCoordinate;
  destination: GeoCoordinate;
  waypoints?: GeoCoordinate[];
  mode?: 'driving' | 'walking' | 'cycling' | 'transit';
  map_provider?: MapProvider;
}

export interface SpatialQueryRequest {
  operation: SpatialOperation;
  point?: GeoCoordinate;
  geometry?: {
    type: LocationType;
    coordinates: GeoCoordinate[];
    radius?: number;
  };
  target_layers?: GisLayerType[];
  gis_map_id?: string;
  radius?: number;
  limit?: number;
}

export const imLocationApi = {
  // ==================== 内部辅助函数 ====================

  _createResponse: <T>(success: boolean, data: T, message: string, code = 200): ApiResponse<T> => ({
    success,
    code,
    message,
    data,
    timestamp: Date.now(),
  }),

  // ==================== 位置消息发送与接收 ====================

  sendLocationMessage: async (data: SendLocationRequest): Promise<ApiResponse<LocationMessage>> => {
    return apiClient.im.post('/im/locations/message', data);
  },

  getLocationMessage: async (messageId: string): Promise<ApiResponse<LocationMessage>> => {
    return apiClient.im.get(`/im/locations/message/${messageId}`);
  },

  listLocationMessages: async (
    chatId: string,
    params?: {
      page?: number;
      page_size?: number;
      location_type?: LocationType;
      include_gis_refs?: boolean;
    }
  ): Promise<ApiResponse<PaginatedResponse<LocationMessage>>> => {
    return apiClient.im.get(`/im/chats/${chatId}/locations`, { params });
  },

  getStaticMap: async (
    coordinate: GeoCoordinate,
    options?: StaticMapOptions
  ): Promise<
    ApiResponse<{ map_url: string; width: number; height: number; gis_map_id?: string }>
  > => {
    const params: Record<string, unknown> = {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      ...options,
    };
    return apiClient.im.get('/im/locations/static-map', { params });
  },

  // ==================== GIS 地图集成 ====================

  listGisMaps: async (params?: {
    page?: number;
    page_size?: number;
    map_type?: string;
  }): Promise<ApiResponse<PaginatedResponse<GisMapRef>>> => {
    return apiClient.gis.get('/maps', { params });
  },

  getGisMap: async (mapId: string): Promise<ApiResponse<GisMapRef>> => {
    return apiClient.gis.get(`/maps/${mapId}`);
  },

  getGisMapLayers: async (
    mapId: string,
    params?: { layer_type?: GisLayerType }
  ): Promise<
    ApiResponse<{
      layers: { id: string; name: string; type: GisLayerType; feature_count: number }[];
    }>
  > => {
    return apiClient.gis.get(`/maps/${mapId}/layers`, { params });
  },

  getGisMapOverview: async (
    mapId: string
  ): Promise<
    ApiResponse<{
      map: GisMapRef;
      statistics: {
        total_features: number;
        layer_count: number;
        bounds: { sw: GeoCoordinate; ne: GeoCoordinate };
      };
      recent_activity?: { type: string; description: string; created_at: string }[];
    }>
  > => {
    return apiClient.gis.get(`/maps/${mapId}/overview`);
  },

  // ==================== GIS 位置数据引用 ====================

  searchGisLocations: async (params?: {
    keyword?: string;
    zone?: string;
    map_id?: string;
    type?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<GisLocationRef>>> => {
    return apiClient.gis.get('/locations', { params });
  },

  getGisLocation: async (locationId: string): Promise<ApiResponse<GisLocationRef>> => {
    return apiClient.gis.get(`/locations/${locationId}`);
  },

  getNearbyGisLocations: async (
    coordinate: GeoCoordinate,
    params?: {
      radius?: number;
      types?: string[];
      map_id?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<GisLocationRef>>> => {
    return apiClient.gis.get('/locations/nearby', {
      params: {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        ...params,
      },
    });
  },

  // ==================== GIS 设备轨迹 ====================

  getDeviceTrack: async (
    deviceId: string,
    params?: { start_time?: string; end_time?: string; map_id?: string; simplify?: boolean }
  ): Promise<ApiResponse<GisDeviceTrack>> => {
    return apiClient.gis.get(`/devices/tracks/${deviceId}`, { params });
  },

  listDeviceTracks: async (params?: {
    device_ids?: string[];
    map_id?: string;
    start_time?: string;
    end_time?: string;
  }): Promise<ApiResponse<GisDeviceTrack[]>> => {
    return apiClient.gis.get('/devices/tracks', { params });
  },

  // ==================== GIS 空间查询与分析 ====================

  spatialQuery: async (data: SpatialQueryRequest): Promise<ApiResponse<SpatialQueryResult>> => {
    return apiClient.gis.post('/spatial/query', data);
  },

  bufferAnalysis: async (
    coordinate: GeoCoordinate,
    radius: number,
    params?: { target_layers?: GisLayerType[]; gis_map_id?: string }
  ): Promise<ApiResponse<SpatialQueryResult>> => {
    return apiClient.gis.post('/spatial/buffer', {
      point: coordinate,
      radius,
      ...params,
    });
  },

  calculateArea: async (
    coordinates: GeoCoordinate[],
    gisMapId?: string
  ): Promise<
    ApiResponse<{
      area: number;
      unit: 'sq_meters' | 'sq_kilometers' | 'hectares';
      perimeter: number;
    }>
  > => {
    return apiClient.gis.post('/spatial/area', {
      coordinates,
      map_id: gisMapId,
    });
  },

  // ==================== POI 搜索（整合 GIS + 第三方） ====================

  searchPlaces: async (
    data: SearchPlaceRequest
  ): Promise<ApiResponse<PaginatedResponse<PlaceOfInterest>>> => {
    return apiClient.im.get('/im/locations/search', { params: data });
  },

  getPlaceDetail: async (
    placeId: string,
    mapProvider?: MapProvider
  ): Promise<ApiResponse<PlaceOfInterest>> => {
    return apiClient.im.get(`/im/locations/places/${placeId}`, {
      params: { map_provider: mapProvider },
    });
  },

  getPlaceSuggestions: async (
    keyword: string,
    coordinate?: GeoCoordinate,
    mapProvider?: MapProvider
  ): Promise<ApiResponse<PlaceOfInterest[]>> => {
    const params: Record<string, unknown> = { keyword, map_provider: mapProvider };
    if (coordinate) {
      params.latitude = coordinate.latitude;
      params.longitude = coordinate.longitude;
    }
    return apiClient.im.get('/im/locations/suggestions', { params });
  },

  // ==================== 地理围栏管理（整合 GIS Fence） ====================

  listGeofences: async (
    chatId: string,
    params?: { status?: GeofenceStatus; page?: number; page_size?: number }
  ): Promise<ApiResponse<PaginatedResponse<Geofence>>> => {
    return apiClient.im.get(`/im/chats/${chatId}/geofences`, { params });
  },

  getGeofence: async (geofenceId: string): Promise<ApiResponse<Geofence>> => {
    return apiClient.im.get(`/im/locations/geofences/${geofenceId}`);
  },

  createGeofence: async (data: CreateGeofenceRequest): Promise<ApiResponse<Geofence>> => {
    return apiClient.im.post('/im/locations/geofences', data);
  },

  updateGeofence: async (
    geofenceId: string,
    data: UpdateGeofenceRequest
  ): Promise<ApiResponse<Geofence>> => {
    return apiClient.im.put(`/im/locations/geofences/${geofenceId}`, data);
  },

  deleteGeofence: async (geofenceId: string): Promise<ApiResponse<null>> => {
    return apiClient.im.delete(`/im/locations/geofences/${geofenceId}`);
  },

  getGeofenceEvents: async (
    geofenceId: string,
    params?: { event_type?: GeofenceEventType; page?: number; page_size?: number }
  ): Promise<ApiResponse<PaginatedResponse<GeofenceEvent>>> => {
    return apiClient.im.get(`/im/locations/geofences/${geofenceId}/events`, { params });
  },

  // ==================== 位置分享 ====================

  shareLocation: async (
    locationId: string,
    data: {
      expires_at?: string;
      password?: string;
      allow_viewer_count?: boolean;
    }
  ): Promise<ApiResponse<LocationShareLink>> => {
    return apiClient.im.post(`/im/locations/${locationId}/share`, data);
  },

  getShareLink: async (shareId: string): Promise<ApiResponse<LocationShareLink>> => {
    return apiClient.im.get(`/im/locations/shares/${shareId}`);
  },

  revokeShareLink: async (shareId: string): Promise<ApiResponse<null>> => {
    return apiClient.im.delete(`/im/locations/shares/${shareId}`);
  },

  // ==================== 路径规划 ====================

  calculateRoute: async (data: CalculateRouteRequest): Promise<ApiResponse<Route>> => {
    return apiClient.im.post('/im/locations/route', data);
  },

  getRouteHistory: async (
    chatId: string,
    params?: { page?: number; page_size?: number }
  ): Promise<ApiResponse<PaginatedResponse<Route>>> => {
    return apiClient.im.get(`/im/chats/${chatId}/routes`, { params });
  },

  // ==================== 距离计算 ====================

  calculateDistance: async (
    origins: GeoCoordinate[],
    destinations: GeoCoordinate[],
    mode?: 'driving' | 'walking' | 'cycling'
  ): Promise<
    ApiResponse<{
      distances: number[][];
      durations: number[][];
    }>
  > => {
    return apiClient.im.post('/im/locations/distance-matrix', {
      origins,
      destinations,
      mode,
    });
  },

  // ==================== 位置历史与统计 ====================

  getLocationHistory: async (
    chatId: string,
    params?: {
      start_date?: string;
      end_date?: string;
      activity_type?: LocationHistory['activity_type'];
      include_gis_refs?: boolean;
      page?: number;
      page_size?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<LocationHistory>>> => {
    return apiClient.im.get(`/im/chats/${chatId}/location-history`, { params });
  },

  getLocationStats: async (chatId: string): Promise<ApiResponse<LocationStats>> => {
    return apiClient.im.get(`/im/chats/${chatId}/location-stats`);
  },

  // ==================== 地图配置 ====================

  getMapConfig: async (): Promise<
    ApiResponse<{
      default_provider: MapProvider;
      available_providers: MapProvider[];
      default_gis_map_id?: string;
      available_gis_maps: { id: string; name: string; type: string }[];
      api_key?: string;
      supported_features: string[];
      spatial_supported: boolean;
      tile_url_template?: string;
    }>
  > => {
    return apiClient.im.get('/im/locations/map-config');
  },

  // ==================== 地理数据导出 ====================

  exportLocationData: async (
    chatId: string,
    params?: {
      format?: 'geojson' | 'kml' | 'csv';
      start_date?: string;
      end_date?: string;
      include_gis_data?: boolean;
    }
  ): Promise<ApiResponse<{ export_url: string; feature_count: number; format: string }>> => {
    return apiClient.im.get(`/im/chats/${chatId}/locations/export`, { params });
  },

  // ==================== POI 混合搜索（GIS + 第三方） ====================

  searchPoiUnified: async (data: SearchPlaceRequest): Promise<ApiResponse<UnifiedPoiResult>> => {
    const results: PlaceOfInterest[] = [];
    const providersUsed: MapProvider[] = [];
    let gisCount = 0;
    let thirdPartyCount = 0;

    const searchPromises: Promise<void>[] = [];

    if (data.include_gis !== false) {
      searchPromises.push(
        (async () => {
          try {
            const gisTypeMap: Record<string, string> = {
              building: 'business',
              warehouse: 'warehouse',
              device: 'device',
              pipeline: 'pipeline',
            };
            const gisType = data.categories?.map((c) => gisTypeMap[c] || c).join(',');
            const gisResponse = await apiClient.gis.get('/search', {
              params: { q: data.keyword, type: gisType },
            });
            if (gisResponse.success && gisResponse.data?.results) {
              for (const item of gisResponse.data.results) {
                const poi: PlaceOfInterest = {
                  id: item.id,
                  name: item.name,
                  category: item.type,
                  coordinate: {
                    latitude: item.position?.lat ?? item.position?.latitude ?? 0,
                    longitude: item.position?.lng ?? item.position?.longitude ?? 0,
                  },
                  address: item.position?.address ?? '',
                  map_provider: 'gis',
                  gis_location_id: item.id,
                  distance: data.coordinate
                    ? Math.sqrt(
                        Math.pow(item.position?.lat - data.coordinate.latitude || 0, 2) +
                          Math.pow(item.position?.lng - data.coordinate.longitude || 0, 2)
                      ) * 111000
                    : undefined,
                };
                results.push(poi);
                gisCount++;
              }
              providersUsed.push('gis');
            }
          } catch {
            // GIS search failed, continue with third-party only
          }
        })()
      );
    }

    searchPromises.push(
      (async () => {
        try {
          const imResponse = await apiClient.im.get('/im/locations/search', { params: data });
          if (imResponse.success && imResponse.data?.items) {
            for (const item of imResponse.data.items) {
              if (item.map_provider !== 'gis') {
                results.push(item);
                thirdPartyCount++;
              }
            }
            if (thirdPartyCount > 0) {
              providersUsed.push(data.map_provider || 'amap');
            }
          }
        } catch {
          // Third-party search failed, continue with GIS only
        }
      })()
    );

    await Promise.all(searchPromises);

    return imLocationApi._createResponse(
      true,
      {
        items: results.sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999)),
        gis_results_count: gisCount,
        third_party_results_count: thirdPartyCount,
        total: results.length,
        providers_used: providersUsed,
      },
      i18n.t('shared.location_message.k0')
    );
  },

  // ==================== 地理围栏同步到 GIS ====================

  createGeofenceWithSync: async (
    data: CreateGeofenceRequest
  ): Promise<ApiResponse<GeofenceSyncResult>> => {
    const syncResult: GeofenceSyncResult = {
      geofence: null as unknown as Geofence,
      gis_sync_status: 'not_supported',
    };

    try {
      const imResponse = await apiClient.im.post('/im/locations/geofences', data);
      if (imResponse.success && imResponse.data) {
        syncResult.geofence = imResponse.data;
      } else {
        return imLocationApi._createResponse(
          false,
          syncResult,
          imResponse.message || i18n.t('shared.location_message.k1'),
          400
        );
      }
    } catch (err) {
      return imLocationApi._createResponse(
        false,
        syncResult,
        `${i18n.t('shared.location_message.k0')}${err instanceof Error ? err.message : i18n.t('shared.location_message.k2')}`,
        500
      );
    }

    if (data.sync_to_gis) {
      try {
        const gisFenceData = {
          name: data.name,
          type: data.shape_type === 'point' ? 'circle' : data.shape_type,
          radius: data.radius || 50,
          coordinates: JSON.stringify(
            data.coordinates.map((c: GeoCoordinate) => [c.longitude, c.latitude])
          ),
          alertOnEnter: data.event_types?.includes('enter') ?? true,
          alertOnExit: data.event_types?.includes('exit') ?? false,
          status: 'active',
        };

        try {
          const gisResponse = await apiClient.gis.post('/fences', gisFenceData);
          if (gisResponse.success && gisResponse.data) {
            syncResult.gis_sync_status = 'synced';
            syncResult.gis_fence_id = gisResponse.data.id;

            await apiClient.im.put(`/im/locations/geofences/${syncResult.geofence.id}`, {
              gis_fence_id: gisResponse.data.id,
            });
          }
        } catch {
          syncResult.gis_sync_status = 'pending';
          syncResult.gis_error = i18n.t('shared.location_message.k12');
        }
      } catch (err) {
        syncResult.gis_sync_status = 'failed';
        syncResult.gis_error =
          err instanceof Error ? err.message : i18n.t('shared.location_message.k3');
      }
    } else {
      syncResult.gis_sync_status = 'not_supported';
    }

    return imLocationApi._createResponse(
      true,
      syncResult,
      syncResult.gis_sync_status === 'synced'
        ? i18n.t('shared.location_message.gis_5')
        : i18n.t('shared.location_message.k4')
    );
  },

  updateGeofenceWithSync: async (
    geofenceId: string,
    data: UpdateGeofenceRequest
  ): Promise<ApiResponse<GeofenceSyncResult>> => {
    const syncResult: GeofenceSyncResult = {
      geofence: null as unknown as Geofence,
      gis_sync_status: 'not_supported',
    };

    try {
      const imResponse = await apiClient.im.put(`/im/locations/geofences/${geofenceId}`, data);
      if (imResponse.success && imResponse.data) {
        syncResult.geofence = imResponse.data;
      } else {
        return imLocationApi._createResponse(
          false,
          syncResult,
          imResponse.message || i18n.t('shared.location_message.k6'),
          400
        );
      }
    } catch (err) {
      return imLocationApi._createResponse(
        false,
        syncResult,
        `${i18n.t('shared.location_message.k2')}${err instanceof Error ? err.message : i18n.t('shared.location_message.k7')}`,
        500
      );
    }

    if (data.sync_to_gis && syncResult.geofence.gis_fence_id) {
      try {
        const gisFenceData: Record<string, unknown> = {};
        if (data.name) gisFenceData.name = data.name;
        if (data.coordinates) {
          gisFenceData.coordinates = JSON.stringify(
            data.coordinates.map((c: GeoCoordinate) => [c.longitude, c.latitude])
          );
        }
        if (data.radius) gisFenceData.radius = data.radius;

        try {
          const gisResponse = await apiClient.gis.put(
            `/fences/${syncResult.geofence.gis_fence_id}`,
            gisFenceData
          );
          if (gisResponse.success) {
            syncResult.gis_sync_status = 'synced';
          }
        } catch {
          syncResult.gis_sync_status = 'pending';
          syncResult.gis_error = i18n.t('shared.location_message.k12');
        }
      } catch (err) {
        syncResult.gis_sync_status = 'failed';
        syncResult.gis_error =
          err instanceof Error ? err.message : i18n.t('shared.location_message.k8');
      }
    }

    return imLocationApi._createResponse(true, syncResult, i18n.t('shared.location_message.k9'));
  },

  syncGeofenceToGis: async (geofenceId: string): Promise<ApiResponse<GeofenceSyncResult>> => {
    const syncResult: GeofenceSyncResult = {
      geofence: null as unknown as Geofence,
      gis_sync_status: 'not_supported',
    };

    try {
      const geofenceResponse = await apiClient.im.get(`/im/locations/geofences/${geofenceId}`);
      if (!geofenceResponse.success || !geofenceResponse.data) {
        return imLocationApi._createResponse(
          false,
          syncResult,
          i18n.t('shared.location_message.k10'),
          404
        );
      }
      syncResult.geofence = geofenceResponse.data;

      const fence = geofenceResponse.data;
      const gisFenceData = {
        name: fence.name,
        type: fence.shape_type === 'point' ? 'circle' : fence.shape_type,
        radius: fence.radius || 50,
        coordinates: JSON.stringify(
          fence.coordinates.map((c: GeoCoordinate) => [c.longitude, c.latitude])
        ),
        alertOnEnter: fence.event_types?.includes('enter') ?? true,
        alertOnExit: fence.event_types?.includes('exit') ?? false,
        status: fence.status === 'active' ? 'active' : 'inactive',
      };

      try {
        if (fence.gis_fence_id) {
          const gisResponse = await apiClient.gis.put(
            `/fences/${fence.gis_fence_id}`,
            gisFenceData
          );
          if (gisResponse.success) {
            syncResult.gis_sync_status = 'synced';
          }
        } else {
          const gisResponse = await apiClient.gis.post('/fences', gisFenceData);
          if (gisResponse.success && gisResponse.data) {
            syncResult.gis_sync_status = 'synced';
            syncResult.gis_fence_id = gisResponse.data.id;

            await apiClient.im.put(`/im/locations/geofences/${geofenceId}`, {
              gis_fence_id: gisResponse.data.id,
            });
          }
        }
      } catch {
        syncResult.gis_sync_status = 'pending';
        syncResult.gis_error = i18n.t('shared.location_message.k12');
      }
    } catch (err) {
      return imLocationApi._createResponse(
        false,
        syncResult,
        `${i18n.t('shared.location_message.k5')}${err instanceof Error ? err.message : i18n.t('shared.location_message.k11')}`,
        500
      );
    }

    return imLocationApi._createResponse(
      true,
      syncResult,
      syncResult.gis_sync_status === 'synced'
        ? i18n.t('shared.location_message.gis_13')
        : i18n.t('shared.location_message.k12')
    );
  },

  // ==================== POI 搜索快捷方法 ====================

  searchGisPois: async (
    keyword: string,
    params?: { type?: string; map_id?: string }
  ): Promise<ApiResponse<PlaceOfInterest[]>> => {
    try {
      const response = await apiClient.gis.get('/search', {
        params: { q: keyword, ...params },
      });
      if (response.success && response.data?.results) {
        const items: PlaceOfInterest[] = response.data.results.map(
          (item: Record<string, unknown>) => ({
            id: item.id as string,
            name: item.name as string,
            category: item.type as string,
            coordinate: {
              latitude: ((item.position as Record<string, number>)?.lat ??
                (item.position as Record<string, number>)?.latitude ??
                0) as number,
              longitude: ((item.position as Record<string, number>)?.lng ??
                (item.position as Record<string, number>)?.longitude ??
                0) as number,
            },
            address: ((item.position as Record<string, string>)?.address ?? '') as string,
            map_provider: 'gis',
            gis_location_id: item.id as string,
          })
        );
        return imLocationApi._createResponse(true, items, i18n.t('shared.location_message.k14'));
      }
      return imLocationApi._createResponse(true, [], i18n.t('shared.location_message.k15'));
    } catch (err) {
      return imLocationApi._createResponse(
        false,
        [] as PlaceOfInterest[],
        `${i18n.t('shared.location_message.gis_6')}${err instanceof Error ? err.message : i18n.t('shared.location_message.k16')}`,
        500
      );
    }
  },
};
