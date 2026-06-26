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
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.gis.get<any>(
      `/api/gis/business-locations?${queryParams.toString()}`
    );
    if (response.success && response.data) {
      response.data = adaptResponse<BusinessLocation>(
        response.data,
        'business_locations'
      );
    }
    return response as ApiResponse<PaginatedResponse<BusinessLocation>>;
  },

  getBusinessLocation: async (
    id: string
  ): Promise<ApiResponse<BusinessLocation>> => {
    return apiClient.gis.get<BusinessLocation>(
      `/api/gis/business-locations/${id}`
    );
  },

  listBusinessLocationsByType: async (
    type: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<BusinessLocation>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const response = await apiClient.gis.get<any>(
      `/api/gis/business-locations/type/${type}?${queryParams.toString()}`
    );
    if (response.success && response.data) {
      response.data = adaptResponse<BusinessLocation>(
        response.data,
        'business_locations'
      );
    }
    return response as ApiResponse<PaginatedResponse<BusinessLocation>>;
  },

  createBusinessLocation: async (
    data: CreateBusinessLocationRequest
  ): Promise<ApiResponse<BusinessLocation>> => {
    return apiClient.gis.post<BusinessLocation>(
      '/api/gis/business-locations',
      data
    );
  },

  updateBusinessLocation: async (
    id: string,
    data: Partial<CreateBusinessLocationRequest>
  ): Promise<ApiResponse<BusinessLocation>> => {
    return apiClient.gis.put<BusinessLocation>(
      `/api/gis/business-locations/${id}`,
      data
    );
  },

  deleteBusinessLocation: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/api/gis/business-locations/${id}`);
  },
};
