import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../client';
import type {
  CustomerSegment,
  CreateSegmentRequest,
  SegmentQueryParams,
  SegmentedCustomer,
  RecommendationResult,
  RecommendationRequest,
  RecommendationQueryParams,
} from './types';

export const customerSegmentationApi = {
  list: async (
    params?: SegmentQueryParams
  ): Promise<ApiResponse<PaginatedResponse<CustomerSegment>>> => {
    return apiClient.crm.get('/api/crm/segments', { params });
  },

  create: async (data: CreateSegmentRequest): Promise<ApiResponse<CustomerSegment>> => {
    return apiClient.crm.post('/api/crm/segments', data);
  },

  get: async (id: string): Promise<ApiResponse<CustomerSegment>> => {
    return apiClient.crm.get(`/api/crm/segments/${id}`);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/crm/segments/${id}`);
  },

  getCustomers: async (
    id: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<SegmentedCustomer>>> => {
    return apiClient.crm.get(`/api/crm/segments/${id}/customers`, { params });
  },

  autoSegment: async (): Promise<ApiResponse<{ segments: any[] }>> => {
    return apiClient.crm.get('/api/crm/segments/auto');
  },
};

export const customerRecommendationApi = {
  list: async (
    params?: RecommendationQueryParams
  ): Promise<ApiResponse<PaginatedResponse<RecommendationResult>>> => {
    return apiClient.crm.get('/api/crm/recommendations', { params });
  },

  create: async (data: RecommendationRequest): Promise<ApiResponse<RecommendationResult>> => {
    return apiClient.crm.post('/api/crm/recommendations', data);
  },

  get: async (id: string): Promise<ApiResponse<RecommendationResult>> => {
    return apiClient.crm.get(`/api/crm/recommendations/${id}`);
  },

  getCustomerRecommendations: async (
    customerId: string,
    params?: RecommendationQueryParams
  ): Promise<ApiResponse<RecommendationResult>> => {
    return apiClient.crm.get(`/api/crm/customers/${customerId}/recommendations`, { params });
  },
};

export default customerSegmentationApi;
