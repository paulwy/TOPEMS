import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../client';
import imApi from '../im';
import {
  imLocationApi,
  type LocationMessage,
  type GeoCoordinate,
  type GisMapRef,
  type GisLocationRef,
  type GisDeviceTrack,
  type SpatialQueryResult,
  type SpatialQueryRequest,
  type SendLocationRequest,
  type SearchPlaceRequest,
  type CalculateRouteRequest,
  type UnifiedPoiResult,
  type GeofenceSyncResult,
  type CreateGeofenceRequest,
  type UpdateGeofenceRequest,
} from '../im/locationMessage';

const { createDomainMock } = vi.hoisted(() => ({
  createDomainMock: () => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('../client', () => {
  const mockClient = {
    im: createDomainMock(),
    gis: createDomainMock(),
    crm: createDomainMock(),
    hrm: createDomainMock(),
    scm: createDomainMock(),
    wms: createDomainMock(),
    mes: createDomainMock(),
    finance: createDomainMock(),
    quality: createDomainMock(),
    pdm: createDomainMock(),
    pm: createDomainMock(),
    project: createDomainMock(),
    monitor: createDomainMock(),
    tenant: createDomainMock(),
    mobile: createDomainMock(),
    addressbook: createDomainMock(),
    feedback: createDomainMock(),
    file: createDomainMock(),
    doc: createDomainMock(),
    template: createDomainMock(),
    unified: createDomainMock(),
    masterData: createDomainMock(),
    ai: createDomainMock(),
    iam: createDomainMock(),
    erp: createDomainMock(),
    messages: createDomainMock(),
    notifications: createDomainMock(),
    portal: createDomainMock(),
    billing: createDomainMock(),
    analytics: createDomainMock(),
    search: createDomainMock(),
  };
  return {
    apiClient: mockClient,
    default: mockClient,
  };
});

describe('IM Location Message API Tests (GIS Integration)', () => {
  const mockCoordinate: GeoCoordinate = {
    latitude: 31.2304,
    longitude: 121.4737,
    altitude: 10,
    accuracy: 5,
    timestamp: '2026-08-11T10:00:00Z',
  };

  const mockLocationMessage: LocationMessage = {
    id: 'loc-001',
    chat_id: 'chat-001',
    sender_id: 'user-001',
    sender_name: '张三',
    location_type: 'point',
    coordinate: mockCoordinate,
    address: '上海市黄浦区外滩街道',
    place_name: '外滩',
    place_id: 'poi-001',
    gis_location_id: 'gis-loc-001',
    gis_location_code: 'LOC-001',
    gis_map_id: 'gis-map-001',
    gis_map_name: '上海工厂地图',
    map_provider: 'gis',
    static_map_url: 'https://cdn.example.com/static-map.png',
    map_zoom: 16,
    map_bearing: 0,
    map_tilt: 0,
    poi_types: ['景点', '地标'],
    description: '公司总部位置',
    created_at: '2026-08-11T10:00:00Z',
  };

  const mockGisMap: GisMapRef = {
    id: 'gis-map-001',
    name: '上海工厂地图',
    code: 'MAP-SH-001',
    map_type: 'factory',
    zoom_level: 16,
    center: mockCoordinate,
    bounds: {
      southwest: { latitude: 31.22, longitude: 121.46 },
      northeast: { latitude: 31.24, longitude: 121.49 },
    },
    layer_count: 5,
    created_at: '2026-01-01T00:00:00Z',
  };

  const mockGisLocation: GisLocationRef = {
    id: 'gis-loc-001',
    name: '总部大楼A座',
    code: 'LOC-HQ-A',
    zone: 'headquarters',
    type: 'building',
    coordinates: mockCoordinate,
    status: 'active',
    map_id: 'gis-map-001',
    properties: { floor: 5, capacity: 200 },
  };

  const mockDeviceTrack: GisDeviceTrack = {
    device_id: 'device-001',
    device_name: 'AGV-001',
    coordinates: [
      { latitude: 31.2304, longitude: 121.4737, timestamp: '2026-08-11T10:00:00Z' },
      { latitude: 31.2305, longitude: 121.4738, timestamp: '2026-08-11T10:01:00Z' },
      { latitude: 31.2306, longitude: 121.4739, timestamp: '2026-08-11T10:02:00Z' },
    ],
    distance: 150,
    duration: 120,
    start_time: '2026-08-11T10:00:00Z',
    end_time: '2026-08-11T10:02:00Z',
    status: 'moving',
  };

  const mockSpatialResult: SpatialQueryResult = {
    operation: 'buffer',
    query_point: mockCoordinate,
    results: [
      {
        id: 'feature-001',
        name: '仓库A',
        type: 'storage',
        distance: 50,
        properties: { zone: 'production' },
      },
    ],
    total_count: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.im.get.mockReset();
    apiClient.im.post.mockReset();
    apiClient.im.put.mockReset();
    apiClient.im.delete.mockReset();
    apiClient.gis.get.mockReset();
    apiClient.gis.post.mockReset();
    apiClient.gis.put.mockReset();
    apiClient.gis.delete.mockReset();
  });

  describe('位置消息基础功能', () => {
    it('应发送位置消息到 IM 服务', async () => {
      const req: SendLocationRequest = {
        chat_id: 'chat-001',
        location_type: 'point',
        coordinate: mockCoordinate,
        gis_location_id: 'gis-loc-001',
        gis_map_id: 'gis-map-001',
        place_name: '外滩',
        map_provider: 'gis',
      };
      apiClient.im.post.mockResolvedValue({ data: mockLocationMessage });
      const result = await imLocationApi.sendLocationMessage(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/locations/message', req);
      expect(result.data?.gis_location_id).toBe('gis-loc-001');
      expect(result.data?.gis_map_id).toBe('gis-map-001');
    });

    it('应获取位置消息详情', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockLocationMessage });
      const result = await imLocationApi.getLocationMessage('loc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/locations/message/loc-001');
      expect(result.data?.id).toBe('loc-001');
      expect(result.data?.sender_name).toBe('张三');
    });

    it('应列出聊天位置消息', async () => {
      apiClient.im.get.mockResolvedValue({
        data: { items: [mockLocationMessage], total: 1, page: 1, page_size: 20 },
      });
      const result = await imLocationApi.listLocationMessages('chat-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/chats/chat-001/locations', {
        params: undefined,
      });
      expect(result.data?.items).toHaveLength(1);
    });
  });

  describe('GIS 地图集成', () => {
    it('应调用 GIS 服务获取地图列表', async () => {
      apiClient.gis.get.mockResolvedValue({
        data: { items: [mockGisMap], total: 1, page: 1, page_size: 20 },
      });
      const result = await imLocationApi.listGisMaps();
      expect(apiClient.gis.get).toHaveBeenCalledWith('/maps', { params: undefined });
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].name).toBe('上海工厂地图');
    });

    it('应调用 GIS 服务获取地图详情', async () => {
      apiClient.gis.get.mockResolvedValue({ data: mockGisMap });
      const result = await imLocationApi.getGisMap('gis-map-001');
      expect(apiClient.gis.get).toHaveBeenCalledWith('/maps/gis-map-001');
      expect(result.data?.id).toBe('gis-map-001');
      expect(result.data?.layer_count).toBe(5);
    });

    it('应调用 GIS 服务获取地图图层', async () => {
      const mockLayers = {
        layers: [
          { id: 'layer-001', name: '建筑物', type: 'geodata' as const, feature_count: 50 },
          { id: 'layer-002', name: '设备点', type: 'device' as const, feature_count: 30 },
        ],
      };
      apiClient.gis.get.mockResolvedValue({ data: mockLayers });
      const result = await imLocationApi.getGisMapLayers('gis-map-001');
      expect(apiClient.gis.get).toHaveBeenCalledWith('/maps/gis-map-001/layers', {
        params: undefined,
      });
      expect(result.data?.layers).toHaveLength(2);
    });

    it('应调用 GIS 服务获取地图概览', async () => {
      const mockOverview = {
        map: mockGisMap,
        statistics: {
          total_features: 80,
          layer_count: 5,
          bounds: {
            sw: { latitude: 31.22, longitude: 121.46 },
            ne: { latitude: 31.24, longitude: 121.49 },
          },
        },
        recent_activity: [
          { type: 'update', description: '更新了设备点', created_at: '2026-08-11T10:00:00Z' },
        ],
      };
      apiClient.gis.get.mockResolvedValue({ data: mockOverview });
      const result = await imLocationApi.getGisMapOverview('gis-map-001');
      expect(apiClient.gis.get).toHaveBeenCalledWith('/maps/gis-map-001/overview');
      expect(result.data?.map.name).toBe('上海工厂地图');
      expect(result.data?.statistics.total_features).toBe(80);
    });
  });

  describe('GIS 位置数据引用', () => {
    it('应调用 GIS 服务搜索位置', async () => {
      apiClient.gis.get.mockResolvedValue({
        data: { items: [mockGisLocation], total: 1, page: 1, page_size: 20 },
      });
      const result = await imLocationApi.searchGisLocations({
        keyword: '总部',
        map_id: 'gis-map-001',
      });
      expect(apiClient.gis.get).toHaveBeenCalledWith('/locations', {
        params: { keyword: '总部', map_id: 'gis-map-001' },
      });
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].name).toBe('总部大楼A座');
    });

    it('应调用 GIS 服务获取位置详情', async () => {
      apiClient.gis.get.mockResolvedValue({ data: mockGisLocation });
      const result = await imLocationApi.getGisLocation('gis-loc-001');
      expect(apiClient.gis.get).toHaveBeenCalledWith('/locations/gis-loc-001');
      expect(result.data?.code).toBe('LOC-HQ-A');
      expect(result.data?.status).toBe('active');
    });

    it('应调用 GIS 服务获取附近位置', async () => {
      apiClient.gis.get.mockResolvedValue({
        data: { items: [mockGisLocation], total: 1, page: 1, page_size: 20 },
      });
      const result = await imLocationApi.getNearbyGisLocations(mockCoordinate, {
        radius: 500,
        types: ['building'],
      });
      expect(apiClient.gis.get).toHaveBeenCalledWith('/locations/nearby', {
        params: {
          latitude: 31.2304,
          longitude: 121.4737,
          radius: 500,
          types: ['building'],
        },
      });
      expect(result.data?.items).toHaveLength(1);
    });
  });

  describe('GIS 设备轨迹', () => {
    it('应调用 GIS 服务获取设备轨迹', async () => {
      apiClient.gis.get.mockResolvedValue({ data: mockDeviceTrack });
      const result = await imLocationApi.getDeviceTrack('device-001', {
        start_time: '2026-08-11T00:00:00Z',
        end_time: '2026-08-11T23:59:59Z',
      });
      expect(apiClient.gis.get).toHaveBeenCalledWith('/devices/tracks/device-001', {
        params: {
          start_time: '2026-08-11T00:00:00Z',
          end_time: '2026-08-11T23:59:59Z',
        },
      });
      expect(result.data?.device_name).toBe('AGV-001');
      expect(result.data?.coordinates.length).toBe(3);
      expect(result.data?.status).toBe('moving');
    });

    it('应调用 GIS 服务列出多个设备轨迹', async () => {
      apiClient.gis.get.mockResolvedValue({ data: [mockDeviceTrack] });
      const result = await imLocationApi.listDeviceTracks({
        device_ids: ['device-001', 'device-002'],
        map_id: 'gis-map-001',
      });
      expect(apiClient.gis.get).toHaveBeenCalledWith('/devices/tracks', {
        params: {
          device_ids: ['device-001', 'device-002'],
          map_id: 'gis-map-001',
        },
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GIS 空间查询与分析', () => {
    it('应调用 GIS 服务进行空间查询', async () => {
      const spatialReq: SpatialQueryRequest = {
        operation: 'near',
        point: mockCoordinate,
        target_layers: ['building', 'storage'],
        gis_map_id: 'gis-map-001',
        radius: 500,
        limit: 10,
      };
      apiClient.gis.post.mockResolvedValue({ data: mockSpatialResult });
      const result = await imLocationApi.spatialQuery(spatialReq);
      expect(apiClient.gis.post).toHaveBeenCalledWith('/spatial/query', spatialReq);
      expect(result.data?.operation).toBe('buffer');
      expect(result.data?.total_count).toBe(3);
    });

    it('应调用 GIS 服务进行缓冲区分析', async () => {
      apiClient.gis.post.mockResolvedValue({ data: mockSpatialResult });
      const result = await imLocationApi.bufferAnalysis(mockCoordinate, 100, {
        target_layers: ['storage'],
        gis_map_id: 'gis-map-001',
      });
      expect(apiClient.gis.post).toHaveBeenCalledWith('/spatial/buffer', {
        point: mockCoordinate,
        radius: 100,
        target_layers: ['storage'],
        gis_map_id: 'gis-map-001',
      });
      expect(result.data?.results.length).toBe(1);
    });

    it('应调用 GIS 服务计算面积', async () => {
      const mockAreaResult = {
        area: 12500.5,
        unit: 'sq_meters' as const,
        perimeter: 350.2,
      };
      apiClient.gis.post.mockResolvedValue({ data: mockAreaResult });
      const polygonCoords: GeoCoordinate[] = [
        { latitude: 31.2304, longitude: 121.4737 },
        { latitude: 31.2305, longitude: 121.4738 },
        { latitude: 31.2306, longitude: 121.4739 },
        { latitude: 31.2304, longitude: 121.4737 },
      ];
      const result = await imLocationApi.calculateArea(polygonCoords, 'gis-map-001');
      expect(apiClient.gis.post).toHaveBeenCalledWith('/spatial/area', {
        coordinates: polygonCoords,
        map_id: 'gis-map-001',
      });
      expect(result.data?.area).toBe(12500.5);
      expect(result.data?.unit).toBe('sq_meters');
    });
  });

  describe('POI 搜索与路径规划', () => {
    it('应搜索 POI（整合 GIS）', async () => {
      const searchReq: SearchPlaceRequest = {
        keyword: '餐厅',
        coordinate: mockCoordinate,
        radius: 1000,
        include_gis: true,
        gis_map_id: 'gis-map-001',
      };
      const mockPoi = {
        id: 'poi-001',
        name: '员工餐厅',
        category: '餐饮',
        coordinate: mockCoordinate,
        address: '上海市黄浦区',
        distance: 200,
        map_provider: 'gis' as const,
        gis_location_id: 'gis-loc-010',
      };
      apiClient.im.get.mockResolvedValue({
        data: { items: [mockPoi], total: 1, page: 1, page_size: 20 },
      });
      const result = await imLocationApi.searchPlaces(searchReq);
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/locations/search', { params: searchReq });
      expect(result.data?.items[0].gis_location_id).toBe('gis-loc-010');
    });

    it('应计算路径', async () => {
      const routeReq: CalculateRouteRequest = {
        origin: mockCoordinate,
        destination: { latitude: 31.231, longitude: 121.48 },
        mode: 'driving',
        map_provider: 'gis',
      };
      const mockRoute = {
        id: 'route-001',
        origin: mockCoordinate,
        destination: { latitude: 31.231, longitude: 121.48 },
        distance: 1500,
        duration: 300,
        steps: [
          {
            instruction: '向东行驶',
            distance: 500,
            duration: 60,
            start_location: mockCoordinate,
            end_location: mockCoordinate,
            polyline: '',
          },
        ],
        polyline: 'polyline-data',
        map_provider: 'gis' as const,
        created_at: '2026-08-11T10:00:00Z',
      };
      apiClient.im.post.mockResolvedValue({ data: mockRoute });
      const result = await imLocationApi.calculateRoute(routeReq);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/locations/route', routeReq);
      expect(result.data?.distance).toBe(1500);
    });
  });

  describe('地理数据导出', () => {
    it('应导出位置数据（GeoJSON 格式）', async () => {
      apiClient.im.get.mockResolvedValue({
        data: {
          export_url: 'https://cdn.example.com/export.geojson',
          feature_count: 50,
          format: 'geojson',
        },
      });
      const result = await imLocationApi.exportLocationData('chat-001', {
        format: 'geojson',
        include_gis_data: true,
      });
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/chats/chat-001/locations/export', {
        params: { format: 'geojson', include_gis_data: true },
      });
      expect(result.data?.feature_count).toBe(50);
      expect(result.data?.format).toBe('geojson');
    });
  });

  describe('地图配置', () => {
    it('应获取地图配置（含 GIS 信息）', async () => {
      const mockConfig = {
        default_provider: 'gis' as const,
        available_providers: ['gis', 'amap', 'baidu'],
        default_gis_map_id: 'gis-map-001',
        available_gis_maps: [
          { id: 'gis-map-001', name: '上海工厂地图', type: 'factory' },
          { id: 'gis-map-002', name: '北京仓库地图', type: 'warehouse' },
        ],
        supported_features: ['location', 'geofence', 'spatial'],
        spatial_supported: true,
      };
      apiClient.im.get.mockResolvedValue({ data: mockConfig });
      const result = await imLocationApi.getMapConfig();
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/locations/map-config');
      expect(result.data?.default_provider).toBe('gis');
      expect(result.data?.spatial_supported).toBe(true);
      expect(result.data?.available_gis_maps.length).toBe(2);
    });
  });

  describe('imApi 聚合集成', () => {
    it('location 子域应存在于 imApi 中', () => {
      expect(imApi.location).toBeDefined();
      expect(imApi.location).toBe(imLocationApi);
    });

    it('GIS 相关快捷方法应正确映射', () => {
      expect(imApi.listGisMaps).toBe(imLocationApi.listGisMaps);
      expect(imApi.getGisMap).toBe(imLocationApi.getGisMap);
      expect(imApi.searchGisLocations).toBe(imLocationApi.searchGisLocations);
      expect(imApi.getGisLocation).toBe(imLocationApi.getGisLocation);
      expect(imApi.getDeviceTrack).toBe(imLocationApi.getDeviceTrack);
      expect(imApi.spatialQuery).toBe(imLocationApi.spatialQuery);
      expect(imApi.bufferAnalysis).toBe(imLocationApi.bufferAnalysis);
      expect(imApi.calculateArea).toBe(imLocationApi.calculateArea);
      expect(imApi.exportLocationData).toBe(imLocationApi.exportLocationData);
    });

    it('应正确调用 IM 和 GIS 双服务', async () => {
      const sendReq: SendLocationRequest = {
        chat_id: 'chat-001',
        location_type: 'point',
        coordinate: mockCoordinate,
        gis_location_id: 'gis-loc-001',
        map_provider: 'gis',
      };

      apiClient.im.post.mockResolvedValue({ data: mockLocationMessage });
      apiClient.gis.get.mockResolvedValue({ data: mockGisLocation });

      const sendResult = await imLocationApi.sendLocationMessage(sendReq);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/locations/message', sendReq);

      const gisResult = await imLocationApi.getGisLocation('gis-loc-001');
      expect(apiClient.gis.get).toHaveBeenCalledWith('/locations/gis-loc-001');

      expect(sendResult.data?.map_provider).toBe('gis');
      expect(gisResult.data?.name).toBe('总部大楼A座');
    });
  });

  describe('POI 混合搜索（GIS + 第三方）', () => {
    it('应同时调用 GIS 和 IM 服务搜索 POI', async () => {
      const gisSearchResult = {
        results: [
          {
            id: 'gis-poi-001',
            name: '员工餐厅',
            type: 'business',
            position: { lat: 31.2304, lng: 121.4737, address: '上海市黄浦区' },
          },
        ],
        total: 1,
        query: '餐厅',
      };

      const imSearchResult = {
        items: [
          {
            id: 'third-poi-001',
            name: '星巴克',
            category: '餐饮',
            coordinate: { latitude: 31.231, longitude: 121.48 },
            address: '上海市黄浦区南京东路',
            map_provider: 'amap',
          },
        ],
        total: 1,
      };

      apiClient.gis.get.mockResolvedValue({
        success: true,
        data: gisSearchResult,
        message: '搜索完成',
        code: 200,
      });

      apiClient.im.get.mockResolvedValue({
        success: true,
        data: imSearchResult,
        message: '搜索完成',
        code: 200,
      });

      const searchReq: SearchPlaceRequest = {
        keyword: '餐厅',
        coordinate: mockCoordinate,
        radius: 1000,
        include_gis: true,
      };

      const result = await imLocationApi.searchPoiUnified(searchReq);
      expect(result.success).toBe(true);
      expect(result.code).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data?.items.length).toBe(2);
      expect(result.data?.providers_used).toContain('gis');
    });

    it('当 GIS 搜索失败时应降级为第三方搜索', async () => {
      apiClient.gis.get.mockRejectedValue(new Error('GIS 服务不可用'));

      const imSearchResult = {
        items: [
          {
            id: 'third-poi-001',
            name: '星巴克',
            category: '餐饮',
            coordinate: { latitude: 31.231, longitude: 121.48 },
            address: '上海市黄浦区南京东路',
            map_provider: 'amap',
          },
        ],
        total: 1,
      };

      apiClient.im.get.mockResolvedValue({
        success: true,
        data: imSearchResult,
        message: '搜索完成',
        code: 200,
      });

      const searchReq: SearchPlaceRequest = {
        keyword: '咖啡',
        coordinate: mockCoordinate,
      };

      const result = await imLocationApi.searchPoiUnified(searchReq);
      expect(result.success).toBe(true);
      expect(result.data?.items.length).toBe(1);
    });

    it('可使用 searchGisPois 快捷方法搜索 GIS POI', async () => {
      const gisSearchResult = {
        results: [
          {
            id: 'gis-poi-001',
            name: '仓库A',
            type: 'warehouse',
            position: { lat: 31.2304, lng: 121.4737, address: '工厂区A' },
          },
        ],
        total: 1,
        query: '仓库',
      };

      apiClient.gis.get.mockResolvedValue({
        success: true,
        data: gisSearchResult,
        message: '搜索完成',
        code: 200,
      });

      const result = await imLocationApi.searchGisPois('仓库', { type: 'warehouse' });
      expect(apiClient.gis.get).toHaveBeenCalledWith('/search', {
        params: { q: '仓库', type: 'warehouse' },
      });
      expect(result.success).toBe(true);
      expect(result.data[0]?.category).toBe('warehouse');
      expect(result.data[0]?.map_provider).toBe('gis');
    });
  });

  describe('地理围栏 sync_to_gis 同步功能', () => {
    const mockGeofence = {
      id: 'geo-001',
      name: '工厂A区域',
      description: '工厂A生产区域围栏',
      chat_id: 'chat-001',
      shape_type: 'polygon' as const,
      coordinates: [
        { latitude: 31.2304, longitude: 121.4737 },
        { latitude: 31.2305, longitude: 121.4738 },
        { latitude: 31.2306, longitude: 121.4739 },
      ],
      radius: 100,
      event_types: ['enter' as const],
      status: 'active' as const,
      trigger_cooldown: 300,
      notify_channels: ['notification' as const],
      notify_users: ['user-001'],
      gis_fence_id: undefined as string | undefined,
      created_at: '2026-08-11T10:00:00Z',
      updated_at: '2026-08-11T10:00:00Z',
    };

    it('创建围栏并同步到 GIS（同步成功）', async () => {
      const gisFenceResult = { id: 'gis-fence-001' };

      apiClient.im.post.mockResolvedValue({
        success: true,
        data: mockGeofence,
        message: '创建成功',
        code: 200,
      });

      apiClient.gis.post.mockResolvedValue({
        success: true,
        data: gisFenceResult,
        message: '创建成功',
        code: 200,
      });

      apiClient.im.put.mockResolvedValue({
        success: true,
        data: { ...mockGeofence, gis_fence_id: 'gis-fence-001' },
        message: '更新成功',
        code: 200,
      });

      const createReq: CreateGeofenceRequest = {
        name: '工厂A区域',
        chat_id: 'chat-001',
        shape_type: 'polygon',
        coordinates: mockGeofence.coordinates,
        radius: 100,
        event_types: ['enter'],
        sync_to_gis: true,
      };

      const result = await imLocationApi.createGeofenceWithSync(createReq);
      expect(result.success).toBe(true);
      expect(result.data?.gis_sync_status).toBe('synced');
      expect(result.data?.gis_fence_id).toBe('gis-fence-001');
      expect(apiClient.gis.post).toHaveBeenCalledWith(
        '/fences',
        expect.objectContaining({
          name: '工厂A区域',
          type: 'polygon',
        })
      );
    });

    it('创建围栏并同步到 GIS（GIS 服务不可用）', async () => {
      apiClient.im.post.mockResolvedValue({
        success: true,
        data: mockGeofence,
        message: '创建成功',
        code: 200,
      });

      apiClient.gis.post.mockRejectedValue(new Error('GIS 围栏服务尚未实现'));

      const createReq: CreateGeofenceRequest = {
        name: '工厂A区域',
        chat_id: 'chat-001',
        shape_type: 'circle',
        coordinates: [{ latitude: 31.2304, longitude: 121.4737 }],
        radius: 50,
        sync_to_gis: true,
      };

      const result = await imLocationApi.createGeofenceWithSync(createReq);
      expect(result.success).toBe(true);
      expect(result.data?.gis_sync_status).toBe('pending');
      expect(result.data?.gis_error).toContain('待同步');
    });

    it('创建围栏不同步到 GIS', async () => {
      apiClient.im.post.mockResolvedValue({
        success: true,
        data: mockGeofence,
        message: '创建成功',
        code: 200,
      });

      const createReq: CreateGeofenceRequest = {
        name: '测试围栏',
        chat_id: 'chat-001',
        shape_type: 'circle',
        coordinates: [{ latitude: 31.2304, longitude: 121.4737 }],
        radius: 50,
        sync_to_gis: false,
      };

      const result = await imLocationApi.createGeofenceWithSync(createReq);
      expect(result.success).toBe(true);
      expect(result.data?.gis_sync_status).toBe('not_supported');

      // 验证没有调用 GIS 服务
      expect(apiClient.gis.post).not.toHaveBeenCalled();
    });

    it('更新围栏并同步到 GIS', async () => {
      const existingGeofence = { ...mockGeofence, gis_fence_id: 'gis-fence-001' };

      apiClient.im.put.mockResolvedValue({
        success: true,
        data: existingGeofence,
        message: '更新成功',
        code: 200,
      });

      apiClient.gis.put.mockResolvedValue({
        success: true,
        data: null,
        message: '更新成功',
        code: 200,
      });

      const updateReq: UpdateGeofenceRequest = {
        name: '工厂A区域（已更新）',
        sync_to_gis: true,
      };

      const result = await imLocationApi.updateGeofenceWithSync('geo-001', updateReq);
      expect(result.success).toBe(true);
      expect(result.data?.gis_sync_status).toBe('synced');
      expect(apiClient.gis.put).toHaveBeenCalledWith(
        '/fences/gis-fence-001',
        expect.objectContaining({
          name: '工厂A区域（已更新）',
        })
      );
    });

    it('手动同步现有围栏到 GIS', async () => {
      const existingGeofence = { ...mockGeofence };

      apiClient.im.get.mockResolvedValue({
        success: true,
        data: existingGeofence,
        message: '获取成功',
        code: 200,
      });

      apiClient.gis.post.mockResolvedValue({
        success: true,
        data: { id: 'gis-fence-new-001' },
        message: '创建成功',
        code: 200,
      });

      apiClient.im.put.mockResolvedValue({
        success: true,
        data: { ...existingGeofence, gis_fence_id: 'gis-fence-new-001' },
        message: '更新成功',
        code: 200,
      });

      const result = await imLocationApi.syncGeofenceToGis('geo-001');
      expect(result.success).toBe(true);
      expect(result.data?.gis_sync_status).toBe('synced');
      expect(result.data?.gis_fence_id).toBe('gis-fence-new-001');
    });

    it('手动同步已绑定 GIS ID 的围栏到 GIS', async () => {
      const existingGeofence = { ...mockGeofence, gis_fence_id: 'gis-fence-001' };

      apiClient.im.get.mockResolvedValue({
        success: true,
        data: existingGeofence,
        message: '获取成功',
        code: 200,
      });

      apiClient.gis.put.mockResolvedValue({
        success: true,
        data: null,
        message: '更新成功',
        code: 200,
      });

      const result = await imLocationApi.syncGeofenceToGis('geo-001');
      expect(result.success).toBe(true);
      expect(result.data?.gis_sync_status).toBe('synced');
      // 应该调用 GIS PUT 而不是 POST
      expect(apiClient.gis.put).toHaveBeenCalledWith('/fences/gis-fence-001', expect.anything());
    });
  });

  describe('imApi 新方法集成', () => {
    it('新方法应存在于 imApi 中', () => {
      expect(imApi.searchPoiUnified).toBeDefined();
      expect(imApi.createGeofenceWithSync).toBeDefined();
      expect(imApi.updateGeofenceWithSync).toBeDefined();
      expect(imApi.syncGeofenceToGis).toBeDefined();
      expect(imApi.searchGisPois).toBeDefined();
    });

    it('新方法应正确映射', () => {
      expect(imApi.searchPoiUnified).toBe(imLocationApi.searchPoiUnified);
      expect(imApi.createGeofenceWithSync).toBe(imLocationApi.createGeofenceWithSync);
      expect(imApi.updateGeofenceWithSync).toBe(imLocationApi.updateGeofenceWithSync);
      expect(imApi.syncGeofenceToGis).toBe(imLocationApi.syncGeofenceToGis);
      expect(imApi.searchGisPois).toBe(imLocationApi.searchGisPois);
    });
  });
});
