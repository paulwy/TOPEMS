import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateFactoryMapRequest,
  CreateMapMarkerRequest,
  FactoryMap,
  GeoJSON,
  GisStatistics,
  ListQueryParams,
  MapMarker,
  PaginatedResponse,
  RawPaginatedResponse,
} from './types';
import { adaptResponse } from './utils';

export const mapApi = {
  getStatistics: async (): Promise<ApiResponse<GisStatistics>> => {
    return apiClient.gis.get<GisStatistics>('/statistics');
  },

  listFactoryMaps: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<FactoryMap>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);

    const rawResponse = await apiClient.gis.get<RawPaginatedResponse>(
      `/factory-maps?${queryParams.toString()}`
    );
    if (rawResponse.success && rawResponse.data) {
      return {
        ...rawResponse,
        data: adaptResponse<FactoryMap>(rawResponse.data, 'factory_maps'),
      } as unknown as ApiResponse<PaginatedResponse<FactoryMap>>;
    }
    return rawResponse as unknown as ApiResponse<PaginatedResponse<FactoryMap>>;
  },

  getFactoryMap: async (id: string): Promise<ApiResponse<FactoryMap>> => {
    return apiClient.gis.get<FactoryMap>(`/factory-maps/${id}`);
  },

  createFactoryMap: async (data: CreateFactoryMapRequest): Promise<ApiResponse<FactoryMap>> => {
    return apiClient.gis.post<FactoryMap>('/factory-maps', data);
  },

  updateFactoryMap: async (
    id: string,
    data: Partial<CreateFactoryMapRequest>
  ): Promise<ApiResponse<FactoryMap>> => {
    return apiClient.gis.put<FactoryMap>(`/factory-maps/${id}`, data);
  },

  deleteFactoryMap: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/factory-maps/${id}`);
  },

  listMapMarkers: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<MapMarker>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);

    const rawResponse = await apiClient.gis.get<RawPaginatedResponse>(
      `/map-markers?${queryParams.toString()}`
    );
    if (rawResponse.success && rawResponse.data) {
      return {
        ...rawResponse,
        data: adaptResponse<MapMarker>(rawResponse.data, 'map_markers'),
      } as unknown as ApiResponse<PaginatedResponse<MapMarker>>;
    }
    return rawResponse as unknown as ApiResponse<PaginatedResponse<MapMarker>>;
  },

  createMapMarker: async (data: CreateMapMarkerRequest): Promise<ApiResponse<MapMarker>> => {
    return apiClient.gis.post<MapMarker>('/map-markers', data);
  },

  updateMapMarker: async (
    id: string,
    data: Partial<CreateMapMarkerRequest>
  ): Promise<ApiResponse<MapMarker>> => {
    return apiClient.gis.put<MapMarker>(`/map-markers/${id}`, data);
  },

  deleteMapMarker: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/map-markers/${id}`);
  },

  search: async (query: string, type?: string): Promise<ApiResponse<unknown>> => {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    return apiClient.gis.get<unknown>(`/search?${params.toString()}`);
  },

  exportGeoJSON: async (): Promise<ApiResponse<GeoJSON>> => {
    return apiClient.gis.get<GeoJSON>('/geojson/export');
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.gis.get<string>('/health');
  },

  importData: async (type: string, file: File): Promise<ApiResponse<unknown>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return apiClient.gis.post<unknown>('/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
