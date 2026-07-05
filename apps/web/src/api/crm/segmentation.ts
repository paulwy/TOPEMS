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
    return apiClient.crm.get('/segments', { params });
  },

  create: async (data: CreateSegmentRequest): Promise<ApiResponse<CustomerSegment>> => {
    return apiClient.crm.post('/segments', data);
  },

  get: async (id: string): Promise<ApiResponse<CustomerSegment>> => {
    return apiClient.crm.get(`/segments/${id}`);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/segments/${id}`);
  },

  getCustomers: async (
    id: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<SegmentedCustomer>>> => {
    return apiClient.crm.get(`/segments/${id}/customers`, { params });
  },

  autoSegment: async (): Promise<ApiResponse<{ segments: CustomerSegment[] }>> => {
    return apiClient.crm.get('/segments/auto');
  },
};

export const customerRecommendationApi = {
  list: async (
    params?: RecommendationQueryParams
  ): Promise<ApiResponse<PaginatedResponse<RecommendationResult>>> => {
    return apiClient.crm.get('/recommendations', { params });
  },

  create: async (data: RecommendationRequest): Promise<ApiResponse<RecommendationResult>> => {
    return apiClient.crm.post('/recommendations', data);
  },

  get: async (id: string): Promise<ApiResponse<RecommendationResult>> => {
    return apiClient.crm.get(`/recommendations/${id}`);
  },

  getCustomerRecommendations: async (
    customerId: string,
    params?: RecommendationQueryParams
  ): Promise<ApiResponse<RecommendationResult>> => {
    return apiClient.crm.get(`/customers/${customerId}/recommendations`, { params });
  },
};

export default customerSegmentationApi;
