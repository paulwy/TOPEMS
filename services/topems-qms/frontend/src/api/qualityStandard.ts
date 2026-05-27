import apiClient from './client';

export interface QualityStandard {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  version?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const qualityStandardApi = {
  list: async (params?: { page?: number; pageSize?: number; search?: string; status?: string }) => {
    const response = await apiClient.get('/api/v1/standards', { params });
    return response.data;
  },
  
  get: async (id: string) => {
    const response = await apiClient.get(`/api/v1/standards/${id}`);
    return response.data;
  },
  
  create: async (data: { code: string; name: string; description?: string; category?: string; version?: string }) => {
    const response = await apiClient.post('/api/v1/standards', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<QualityStandard>) => {
    const response = await apiClient.put(`/api/v1/standards/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/standards/${id}`);
    return response.data;
  },
};
