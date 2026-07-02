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
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.gis.get<any>(`/warehouse-locations?${queryParams.toString()}`);
    if (response.success && response.data) {
      response.data = adaptResponse<StorageLocation>(response.data, 'warehouse_locations');
    }
    return response as ApiResponse<PaginatedResponse<StorageLocation>>;
  },

  getStorageLocation: async (id: string): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.get<StorageLocation>(`/warehouse-locations/${id}`);
  },

  listStorageLocationsByMap: async (
    mapId: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<StorageLocation>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());

    return apiClient.gis.get<PaginatedResponse<StorageLocation>>(
      `/warehouse-locations/map/${mapId}?${queryParams.toString()}`
    );
  },

  createStorageLocation: async (
    data: CreateStorageLocationRequest
  ): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.post<StorageLocation>('/warehouse-locations', data);
  },

  updateStorageLocation: async (
    id: string,
    data: Partial<CreateStorageLocationRequest>
  ): Promise<ApiResponse<StorageLocation>> => {
    return apiClient.gis.put<StorageLocation>(`/warehouse-locations/${id}`, data);
  },

  deleteStorageLocation: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/warehouse-locations/${id}`);
  },

  listEvidenceRecords: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EvidenceRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.gis.get<any>(`/location-photos?${queryParams.toString()}`);
    if (response.success && response.data) {
      response.data = adaptResponse<EvidenceRecord>(response.data, 'location_photos');
    }
    return response as ApiResponse<PaginatedResponse<EvidenceRecord>>;
  },

  getEvidenceRecord: async (id: string): Promise<ApiResponse<LocationPhoto>> => {
    return apiClient.gis.get<LocationPhoto>(`/location-photos/${id}`);
  },

  listEvidenceRecordsByMap: async (
    mapId: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EvidenceRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());

    return apiClient.gis.get<PaginatedResponse<EvidenceRecord>>(
      `/location-photos/map/${mapId}?${queryParams.toString()}`
    );
  },

  createEvidenceRecord: async (
    data: CreateEvidenceRecordRequest
  ): Promise<ApiResponse<EvidenceRecord>> => {
    return apiClient.gis.post<EvidenceRecord>('/location-photos', data);
  },

  deleteEvidenceRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/location-photos/${id}`);
  },
};
