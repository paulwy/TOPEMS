import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { Carrier, CreateCarrierRequest, UpdateCarrierRequest, PaginationParams } from './types';

export const carrierApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Carrier>>> => {
    return apiClient.tms.get('/carriers', { params });
  },

  get: async (id: string): Promise<ApiResponse<Carrier>> => {
    return apiClient.tms.get(`/carriers/${id}`);
  },

  create: async (data: CreateCarrierRequest): Promise<ApiResponse<Carrier>> => {
    return apiClient.tms.post('/carriers', data);
  },

  update: async (id: string, data: UpdateCarrierRequest): Promise<ApiResponse<Carrier>> => {
    return apiClient.tms.put(`/carriers/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.tms.delete(`/carriers/${id}`);
  },
};

export default carrierApi;
