import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  Location,
  CreateLocationRequest,
  UpdateLocationRequest,
  LocationStatusSummary,
  LocationPaginationParams,
} from './types';

export const locationApi = {
  list: async (
    params?: LocationPaginationParams
  ): Promise<ApiResponse<PaginatedResponse<Location>>> => {
    return apiClient.wms.get('/locations', { params });
  },

  get: async (id: string): Promise<ApiResponse<Location>> => {
    return apiClient.wms.get(`/locations/${id}`);
  },

  create: async (data: CreateLocationRequest): Promise<ApiResponse<Location>> => {
    return apiClient.wms.post('/locations', data);
  },

  update: async (id: string, data: UpdateLocationRequest): Promise<ApiResponse<Location>> => {
    return apiClient.wms.put(`/locations/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/locations/${id}`);
  },

  getStatus: async (warehouse_id?: string): Promise<ApiResponse<LocationStatusSummary>> => {
    return apiClient.wms.get('/locations/status', { params: { warehouse_id } });
  },

  batchCreate: async (
    data: CreateLocationRequest[]
  ): Promise<ApiResponse<{ created_count: number; locations: Location[] }>> => {
    return apiClient.wms.post('/locations/batch', data);
  },

  batchUpdate: async (data: {
    ids: string[];
    updates: UpdateLocationRequest;
  }): Promise<ApiResponse<{ updated_count: number }>> => {
    return apiClient.wms.put('/locations/batch', data);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<{ deleted_count: number }>> => {
    return apiClient.wms.post('/locations/batch-delete', { ids });
  },
};

export async function listLocations(
  params?: LocationPaginationParams
): Promise<ApiResponse<PaginatedResponse<Location>>> {
  return locationApi.list(params);
}

export async function getLocation(id: string): Promise<ApiResponse<Location>> {
  return locationApi.get(id);
}

export async function createLocation(data: CreateLocationRequest): Promise<ApiResponse<Location>> {
  return locationApi.create(data);
}

export async function updateLocation(
  id: string,
  data: UpdateLocationRequest
): Promise<ApiResponse<Location>> {
  return locationApi.update(id, data);
}

export async function deleteLocation(id: string): Promise<ApiResponse<string>> {
  return locationApi.delete(id);
}

export async function getLocationStatus(
  warehouse_id?: string
): Promise<ApiResponse<LocationStatusSummary>> {
  return locationApi.getStatus(warehouse_id);
}

export async function batchCreateLocations(
  data: CreateLocationRequest[]
): Promise<ApiResponse<{ created_count: number; locations: Location[] }>> {
  return locationApi.batchCreate(data);
}

export async function batchUpdateLocations(data: {
  ids: string[];
  updates: UpdateLocationRequest;
}): Promise<ApiResponse<{ updated_count: number }>> {
  return locationApi.batchUpdate(data);
}

export async function batchDeleteLocations(
  ids: string[]
): Promise<ApiResponse<{ deleted_count: number }>> {
  return locationApi.batchDelete(ids);
}

export default locationApi;
