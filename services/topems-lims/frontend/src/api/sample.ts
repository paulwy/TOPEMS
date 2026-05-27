import { apiClient, ApiResponse } from './client';

export interface Sample {
  id: string;
  name: string;
  description: string | null;
  status: string;
  project_id: string | null;
  received_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSampleRequest {
  name: string;
  description?: string;
  status: string;
  project_id?: string;
}

export interface UpdateSampleRequest {
  name?: string;
  description?: string;
  status?: string;
  project_id?: string;
}

export const sampleApi = {
  list: async (params?: { page?: number; page_size?: number; search?: string; status?: string }) => {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/samples', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Sample>>(`/api/v1/samples/${id}`);
    return response.data;
  },

  create: async (data: CreateSampleRequest) => {
    const response = await apiClient.post<ApiResponse<Sample>>('/api/v1/samples', data);
    return response.data;
  },

  update: async (id: string, data: UpdateSampleRequest) => {
    const response = await apiClient.put<ApiResponse<Sample>>(`/api/v1/samples/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<any>>(`/api/v1/samples/${id}`);
    return response.data;
  },
};
