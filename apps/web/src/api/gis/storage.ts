import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  StorageLocation,
  CreateStorageLocationRequest,
  EvidenceRecord,
  CreateEvidenceRecordRequest,
  LocationPhoto,
  ListQueryParams,
  PaginatedResponse,
} from './types';
import { adaptResponse } from './utils';

export const storageApi = {
  listStorageLocations: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<StorageLocation>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.gis.get<any>(
      `/api/gis/warehouse-locations?${queryParams.toString()}`
    );
    if (response.success && response.data) {
      response.data = adaptResponse<StorageLocation>(response.data, 'warehouse_locations');
    }
    return response as ApiResponse<PaginatedResponse<StorageLocation>>;
  },

  getStorageLocation: async (id: string): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.get<StorageLocation>(`/api/gis/warehouse-locations/${id}`);
  },

  listStorageLocationsByMap: async (
    mapId: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<StorageLocation>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    return apiClient.gis.get<PaginatedResponse<StorageLocation>>(
      `/api/gis/warehouse-locations/map/${mapId}?${queryParams.toString()}`
    );
  },

  createStorageLocation: async (
    data: CreateStorageLocationRequest
  ): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.post<StorageLocation>('/api/gis/warehouse-locations', data);
  },

  updateStorageLocation: async (
    id: string,
    data: Partial<CreateStorageLocationRequest>
  ): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.put<StorageLocation>(`/api/gis/warehouse-locations/${id}`, data);
  },

  deleteStorageLocation: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/api/gis/warehouse-locations/${id}`);
  },

  listEvidenceRecords: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EvidenceRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.gis.get<any>(
      `/api/gis/location-photos?${queryParams.toString()}`
    );
    if (response.success && response.data) {
      response.data = adaptResponse<EvidenceRecord>(response.data, 'location_photos');
    }
    return response as ApiResponse<PaginatedResponse<EvidenceRecord>>;
  },

  getEvidenceRecord: async (id: string): Promise<ApiResponse<LocationPhoto>> => {
    return apiClient.gis.get<LocationPhoto>(`/api/gis/location-photos/${id}`);
  },

  listEvidenceRecordsByMap: async (
    mapId: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EvidenceRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    return apiClient.gis.get<PaginatedResponse<EvidenceRecord>>(
      `/api/gis/location-photos/map/${mapId}?${queryParams.toString()}`
    );
  },

  createEvidenceRecord: async (
    data: CreateEvidenceRecordRequest
  ): Promise<ApiResponse<EvidenceRecord>> => {
    return apiClient.gis.post<EvidenceRecord>('/api/gis/location-photos', data);
  },

  deleteEvidenceRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/api/gis/location-photos/${id}`);
  },
};
