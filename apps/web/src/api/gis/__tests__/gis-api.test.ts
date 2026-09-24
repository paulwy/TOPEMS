import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adaptResponse } from '../utils';
import { mapApi, deviceApi, pipelineApi, storageApi, businessApi } from '../index';
import apiClient from '../../client';

vi.mock('../../client', () => ({
  default: {
    gis: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('GIS API utils - adaptResponse', () => {
  it('should adapt response with dataKey', () => {
    const response = {
      factory_maps: [{ id: '1', name: 'Test' }],
      total: 1,
      page: 1,
      page_size: 10,
    };
    const result = adaptResponse(response, 'factory_maps');
    expect(result.items).toEqual([{ id: '1', name: 'Test' }]);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it('should use data length when total is missing', () => {
    const response = {
      device_locations: [{ id: '1' }, { id: '2' }],
      page: 1,
    };
    const result = adaptResponse(response, 'device_locations');
    expect(result.total).toBe(2);
  });

  it('should return empty array when dataKey is not found', () => {
    const response = {
      total: 0,
      page: 1,
    };
    const result = adaptResponse(response, 'nonexistent');
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should handle pageSize alias', () => {
    const response = {
      items: [{ id: '1' }],
      total: 1,
      page: 1,
      pageSize: 20,
    };
    const result = adaptResponse(response, 'items');
    expect(result.pageSize).toBe(20);
  });

  it('should handle totalPages alias', () => {
    const response = {
      items: [],
      total: 0,
      total_pages: 5,
    };
    const result = adaptResponse(response, 'items');
    expect(result.totalPages).toBe(5);
  });
});

describe('GIS mapApi', () => {
  const mockApiClient = apiClient.gis as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /statistics for getStatistics', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { device_points: 10 } });
    await mapApi.getStatistics();
    expect(mockApiClient.get).toHaveBeenCalledWith('/statistics');
  });

  it('should call GET /factory-maps with query params for listFactoryMaps', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { factory_maps: [], total: 0 } });
    await mapApi.listFactoryMaps({ page: 1, page_size: 10, search: 'test' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/factory-maps?page=1&page_size=10&search=test');
  });

  it('should call GET /factory-maps without query params when no params', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { factory_maps: [], total: 0 } });
    await mapApi.listFactoryMaps();
    expect(mockApiClient.get).toHaveBeenCalledWith('/factory-maps?');
  });

  it('should call GET /factory-maps/:id for getFactoryMap', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await mapApi.getFactoryMap('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/factory-maps/1');
  });

  it('should call POST /factory-maps for createFactoryMap', async () => {
    const data = { name: 'Test Map', code: 'TM001', map_type: 'floor', file_url: '/map.png' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await mapApi.createFactoryMap(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/factory-maps', data);
  });

  it('should call PUT /factory-maps/:id for updateFactoryMap', async () => {
    const data = { name: 'Updated Map' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await mapApi.updateFactoryMap('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/factory-maps/1', data);
  });

  it('should call DELETE /factory-maps/:id for deleteFactoryMap', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await mapApi.deleteFactoryMap('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/factory-maps/1');
  });

  it('should call GET /map-markers for listMapMarkers', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { map_markers: [], total: 0 } });
    await mapApi.listMapMarkers({ page: 2, page_size: 20 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/map-markers?page=2&page_size=20');
  });

  it('should call POST /map-markers for createMapMarker', async () => {
    const data = { marker_type: 'device', name: 'Marker1', position: { lat: 1.0, lng: 2.0 } };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await mapApi.createMapMarker(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/map-markers', data);
  });

  it('should call PUT /map-markers/:id for updateMapMarker', async () => {
    const data = { name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await mapApi.updateMapMarker('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/map-markers/1', data);
  });

  it('should call DELETE /map-markers/:id for deleteMapMarker', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await mapApi.deleteMapMarker('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/map-markers/1');
  });

  it('should call GET /search for search', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await mapApi.search('test');
    expect(mockApiClient.get).toHaveBeenCalledWith('/search?q=test');
  });

  it('should call GET /search with type filter', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await mapApi.search('test', 'device');
    expect(mockApiClient.get).toHaveBeenCalledWith('/search?q=test&type=device');
  });

  it('should call GET /geojson/export for exportGeoJSON', async () => {
    mockApiClient.get.mockResolvedValue({
      success: true,
      data: { type: 'FeatureCollection', features: [] },
    });
    await mapApi.exportGeoJSON();
    expect(mockApiClient.get).toHaveBeenCalledWith('/geojson/export');
  });

  it('should call GET /health for health', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: 'OK' });
    await mapApi.health();
    expect(mockApiClient.get).toHaveBeenCalledWith('/health');
  });
});

describe('GIS deviceApi', () => {
  const mockApiClient = apiClient.gis as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /device-locations with query params for listDevicePoints', async () => {
    mockApiClient.get.mockResolvedValue({
      success: true,
      data: { device_locations: [], total: 0 },
    });
    await deviceApi.listDevicePoints({ page: 1, page_size: 10, status: 'active' });
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/device-locations?page=1&page_size=10&status=active'
    );
  });

  it('should call GET /device-locations/:id for getDevicePoint', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await deviceApi.getDevicePoint('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/device-locations/1');
  });

  it('should call GET /device-locations/map/:mapId for listDevicePointsByMap', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await deviceApi.listDevicePointsByMap('map1', { page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/device-locations/map/map1?page=1');
  });

  it('should call POST /device-locations for createDevicePoint', async () => {
    const data = { name: 'Device1', device_type: 'sensor', latitude: 1.0, longitude: 2.0 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await deviceApi.createDevicePoint(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/device-locations', data);
  });

  it('should call PUT /device-locations/:id for updateDevicePoint', async () => {
    const data = { name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await deviceApi.updateDevicePoint('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/device-locations/1', data);
  });

  it('should call DELETE /device-locations/:id for deleteDevicePoint', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await deviceApi.deleteDevicePoint('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/device-locations/1');
  });

  it('should call GET /device-tracks with params for getDeviceTrack', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await deviceApi.getDeviceTrack({
      device_id: 'dev1',
      start_time: '2024-01-01',
      end_time: '2024-01-02',
    });
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/device-tracks?device_id=dev1&start_time=2024-01-01&end_time=2024-01-02'
    );
  });

  it('should call GET /device-tracks/:device_id/statistics for getDeviceTrackStatistics', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { total_distance: 1000 } });
    await deviceApi.getDeviceTrackStatistics('dev1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/device-tracks/dev1/statistics');
  });

  it('should call GET /device-tracks/devices for listDevicesWithTracks', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await deviceApi.listDevicesWithTracks();
    expect(mockApiClient.get).toHaveBeenCalledWith('/device-tracks/devices');
  });
});

describe('GIS pipelineApi', () => {
  const mockApiClient = apiClient.gis as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /pipelines for listPipelines', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { pipelines: [], total: 0 } });
    await pipelineApi.listPipelines({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/pipelines?page=1');
  });

  it('should call GET /pipelines/:id for getPipeline', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await pipelineApi.getPipeline('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/pipelines/1');
  });

  it('should call GET /pipelines/map/:mapId for listPipelinesByMap', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await pipelineApi.listPipelinesByMap('map1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/pipelines/map/map1?');
  });

  it('should call POST /pipelines for createPipeline', async () => {
    const data = {
      name: 'Pipeline1',
      pipeline_type: 'water',
      start_point: [1, 2],
      end_point: [3, 4],
    };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await pipelineApi.createPipeline(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/pipelines', data);
  });

  it('should call PUT /pipelines/:id for updatePipeline', async () => {
    const data = { name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await pipelineApi.updatePipeline('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/pipelines/1', data);
  });

  it('should call DELETE /pipelines/:id for deletePipeline', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await pipelineApi.deletePipeline('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/pipelines/1');
  });
});

describe('GIS storageApi', () => {
  const mockApiClient = apiClient.gis as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /warehouse-locations for listStorageLocations', async () => {
    mockApiClient.get.mockResolvedValue({
      success: true,
      data: { warehouse_locations: [], total: 0 },
    });
    await storageApi.listStorageLocations();
    expect(mockApiClient.get).toHaveBeenCalledWith('/warehouse-locations?');
  });

  it('should call GET /warehouse-locations/:id for getStorageLocation', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await storageApi.getStorageLocation('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/warehouse-locations/1');
  });

  it('should call GET /warehouse-locations/map/:mapId for listStorageLocationsByMap', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await storageApi.listStorageLocationsByMap('map1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/warehouse-locations/map/map1?');
  });

  it('should call POST /warehouse-locations for createStorageLocation', async () => {
    const data = { name: 'Storage1', location_type: 'warehouse', latitude: 1.0, longitude: 2.0 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await storageApi.createStorageLocation(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/warehouse-locations', data);
  });

  it('should call PUT /warehouse-locations/:id for updateStorageLocation', async () => {
    const data = { name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await storageApi.updateStorageLocation('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/warehouse-locations/1', data);
  });

  it('should call DELETE /warehouse-locations/:id for deleteStorageLocation', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await storageApi.deleteStorageLocation('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/warehouse-locations/1');
  });

  it('should call GET /location-photos for listEvidenceRecords', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { location_photos: [], total: 0 } });
    await storageApi.listEvidenceRecords();
    expect(mockApiClient.get).toHaveBeenCalledWith('/location-photos?');
  });

  it('should call GET /location-photos/:id for getEvidenceRecord', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await storageApi.getEvidenceRecord('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/location-photos/1');
  });

  it('should call POST /location-photos for createEvidenceRecord', async () => {
    const data = {
      title: 'Evidence1',
      evidence_type: 'photo',
      latitude: 1.0,
      longitude: 2.0,
      recorded_by: 'user1',
    };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await storageApi.createEvidenceRecord(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/location-photos', data);
  });

  it('should call DELETE /location-photos/:id for deleteEvidenceRecord', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await storageApi.deleteEvidenceRecord('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/location-photos/1');
  });
});

describe('GIS businessApi', () => {
  const mockApiClient = apiClient.gis as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /business-locations for listBusinessLocations', async () => {
    mockApiClient.get.mockResolvedValue({
      success: true,
      data: { business_locations: [], total: 0 },
    });
    await businessApi.listBusinessLocations();
    expect(mockApiClient.get).toHaveBeenCalledWith('/business-locations?');
  });

  it('should call GET /business-locations/:id for getBusinessLocation', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await businessApi.getBusinessLocation('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/business-locations/1');
  });

  it('should call GET /business-locations/type/:type for listBusinessLocationsByType', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await businessApi.listBusinessLocationsByType('office');
    expect(mockApiClient.get).toHaveBeenCalledWith('/business-locations/type/office?');
  });

  it('should call POST /business-locations for createBusinessLocation', async () => {
    const data = {
      business_type: 'office',
      business_name: 'Office1',
      position: { lat: 1.0, lng: 2.0 },
    };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await businessApi.createBusinessLocation(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/business-locations', data);
  });

  it('should call PUT /business-locations/:id for updateBusinessLocation', async () => {
    const data = { business_name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await businessApi.updateBusinessLocation('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/business-locations/1', data);
  });

  it('should call DELETE /business-locations/:id for deleteBusinessLocation', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await businessApi.deleteBusinessLocation('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/business-locations/1');
  });
});
