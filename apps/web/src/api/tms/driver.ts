import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { Driver, CreateDriverRequest, UpdateDriverRequest, PaginationParams } from './types';

export const driverApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Driver>>> => {
    return apiClient.tms.get('/drivers', { params });
  },

  get: async (id: string): Promise<ApiResponse<Driver>> => {
    return apiClient.tms.get(`/drivers/${id}`);
  },

  create: async (data: CreateDriverRequest): Promise<ApiResponse<Driver>> => {
    return apiClient.tms.post('/drivers', data);
  },

  update: async (id: string, data: UpdateDriverRequest): Promise<ApiResponse<Driver>> => {
    return apiClient.tms.put(`/drivers/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.tms.delete(`/drivers/${id}`);
  },
};

export default driverApi;
