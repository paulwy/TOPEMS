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
  RawPaginatedResponse,
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

    const rawResponse = await apiClient.gis.get<RawPaginatedResponse>(
      `/warehouse-locations?${queryParams.toString()}`
    );
    if (rawResponse.success && rawResponse.data) {
      return {
        ...rawResponse,
        data: adaptResponse<StorageLocation>(rawResponse.data, 'warehouse_locations'),
      } as unknown as ApiResponse<PaginatedResponse<StorageLocation>>;
    }
    return rawResponse as unknown as ApiResponse<PaginatedResponse<StorageLocation>>;
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

    const rawResponse = await apiClient.gis.get<RawPaginatedResponse>(
      `/location-photos?${queryParams.toString()}`
    );
    if (rawResponse.success && rawResponse.data) {
      return {
        ...rawResponse,
        data: adaptResponse<EvidenceRecord>(rawResponse.data, 'location_photos'),
      } as unknown as ApiResponse<PaginatedResponse<EvidenceRecord>>;
    }
    return rawResponse as unknown as ApiResponse<PaginatedResponse<EvidenceRecord>>;
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
