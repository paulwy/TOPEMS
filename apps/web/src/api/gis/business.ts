import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  BusinessLocation,
  CreateBusinessLocationRequest,
  ListQueryParams,
  PaginatedResponse,
} from './types';
import { adaptResponse } from './utils';

export const businessApi = {
  listBusinessLocations: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<BusinessLocation>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.gis.get<any>(`/business-locations?${queryParams.toString()}`);
    if (response.success && response.data) {
      response.data = adaptResponse<BusinessLocation>(response.data, 'business_locations');
    }
    return response as ApiResponse<PaginatedResponse<BusinessLocation>>;
  },

  getBusinessLocation: async (id: string): Promise<ApiResponse<BusinessLocation>> => {
    return apiClient.gis.get<BusinessLocation>(`/business-locations/${id}`);
  },

  listBusinessLocationsByType: async (
    type: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<BusinessLocation>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());

    const response = await apiClient.gis.get<any>(
      `/business-locations/type/${type}?${queryParams.toString()}`
    );
    if (response.success && response.data) {
      response.data = adaptResponse<BusinessLocation>(response.data, 'business_locations');
    }
    return response as ApiResponse<PaginatedResponse<BusinessLocation>>;
  },

  createBusinessLocation: async (
    data: CreateBusinessLocationRequest
  ): Promise<ApiResponse<BusinessLocation>> => {
    return apiClient.gis.post<BusinessLocation>('/business-locations', data);
  },

  updateBusinessLocation: async (
    id: string,
    data: Partial<CreateBusinessLocationRequest>
  ): Promise<ApiResponse<BusinessLocation>> => {
    return apiClient.gis.put<BusinessLocation>(`/business-locations/${id}`, data);
  },

  deleteBusinessLocation: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/business-locations/${id}`);
  },
};
