import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { Capacity, CreateCapacityRequest, UpdateCapacityRequest, PaginationParams } from './types';

export const capacityApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Capacity>>> => {
    return apiClient.aps.get('/capacities', { params });
  },

  get: async (id: string): Promise<ApiResponse<Capacity>> => {
    return apiClient.aps.get(`/capacities/${id}`);
  },

  create: async (data: CreateCapacityRequest): Promise<ApiResponse<Capacity>> => {
    return apiClient.aps.post('/capacities', data);
  },

  update: async (id: string, data: UpdateCapacityRequest): Promise<ApiResponse<Capacity>> => {
    return apiClient.aps.put(`/capacities/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.aps.delete(`/capacities/${id}`);
  },
};

export default capacityApi;
