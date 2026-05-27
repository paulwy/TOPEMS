import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface Reagent {
  id: string;
  name: string;
  code: string;
  category: string;
  specification: string;
  supplier: string;
  batch_number: string;
  quantity: number;
  unit: string;
  location: string;
  storage_condition: string;
  expiration_date: string;
  status: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ReagentUsage {
  id: string;
  reagent_id: string;
  reagent_name: string;
  quantity: number;
  usage_date: string;
  purpose: string;
  used_by: string;
  created_at: string;
}

export interface ReagentCreateRequest {
  name: string;
  code: string;
  category?: string;
  specification?: string;
  supplier?: string;
  batch_number?: string;
  quantity: number;
  unit: string;
  location?: string;
  storage_condition?: string;
  expiration_date?: string;
  description?: string;
}

export interface ReagentUsageRequest {
  reagent_id: string;
  quantity: number;
  usage_date: string;
  purpose?: string;
  used_by: string;
}

export interface ReagentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  status?: string;
}

export const reagentApi = {
  list: async (params: ReagentListParams = {}): Promise<ApiResponse<PaginatedResponse<Reagent>>> => {
    const response = await apiClient.get('/api/reagents', { params });
    return response.data;
  },

  get: async (id: string): Promise<ApiResponse<Reagent>> => {
    const response = await apiClient.get(`/api/reagents/${id}`);
    return response.data;
  },

  create: async (data: ReagentCreateRequest): Promise<ApiResponse<Reagent>> => {
    const response = await apiClient.post('/api/reagents', data);
    return response.data;
  },

  update: async (id: string, data: Partial<ReagentCreateRequest>): Promise<ApiResponse<Reagent>> => {
    const response = await apiClient.put(`/api/reagents/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/api/reagents/${id}`);
    return response.data;
  },

  use: async (data: ReagentUsageRequest): Promise<ApiResponse<ReagentUsage>> => {
    const response = await apiClient.post('/api/reagents/use', data);
    return response.data;
  },

  getUsages: async (reagentId: string): Promise<ApiResponse<ReagentUsage[]>> => {
    const response = await apiClient.get(`/api/reagents/${reagentId}/usages`);
    return response.data;
  },
};