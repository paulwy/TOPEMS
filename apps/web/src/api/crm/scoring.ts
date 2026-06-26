import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  CustomerScore,
  CreateCustomerScoreRequest,
  CustomerScoringQueryParams,
} from './types';

export const customerScoringApi = {
  list: async (
    params?: CustomerScoringQueryParams
  ): Promise<ApiResponse<PaginatedResponse<CustomerScore>>> => {
    return apiClient.crm.get('/api/crm/customer-scoring', { params });
  },

  get: async (id: string): Promise<ApiResponse<CustomerScore>> => {
    return apiClient.crm.get(`/api/crm/customer-scoring/${id}`);
  },

  create: async (data: CreateCustomerScoreRequest): Promise<ApiResponse<CustomerScore>> => {
    return apiClient.crm.post('/api/crm/customer-scoring', data);
  },

  update: async (
    id: string,
    data: Partial<CreateCustomerScoreRequest>
  ): Promise<ApiResponse<CustomerScore>> => {
    return apiClient.crm.put(`/api/crm/customer-scoring/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/crm/customer-scoring/${id}`);
  },

  calculateBatch: async (customerIds: string[]): Promise<ApiResponse<CustomerScore[]>> => {
    return apiClient.crm.post('/api/crm/customer-scoring/calculate', {
      customer_ids: customerIds,
    });
  },
};

export default customerScoringApi;
