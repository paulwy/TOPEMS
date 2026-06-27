import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  FactoryMap,
  CreateFactoryMapRequest,
  MapMarker,
  CreateMapMarkerRequest,
  GisStatistics,
  GeoJSON,
  ListQueryParams,
  PaginatedResponse,
} from './types';
import { adaptResponse } from './utils';

export const mapApi = {
  getStatistics: async (): Promise<ApiResponse<GisStatistics>> => {
    return apiClient.gis.get<GisStatistics>('/api/gis/statistics');
  },

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

  search: async (query: string, type?: string): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    return apiClient.gis.get<any>(`/api/gis/search?${params.toString()}`);
  },

  exportGeoJSON: async (): Promise<ApiResponse<GeoJSON>> => {
    return apiClient.gis.get<GeoJSON>('/api/gis/geojson/export');
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.gis.get<string>('/health');
  },

  importData: async (type: string, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return apiClient.gis.post<any>('/api/gis/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
