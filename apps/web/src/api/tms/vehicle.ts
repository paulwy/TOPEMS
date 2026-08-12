import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { Vehicle, CreateVehicleRequest, UpdateVehicleRequest, PaginationParams } from './types';

export const vehicleApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Vehicle>>> => {
    return apiClient.tms.get('/vehicles', { params });
  },

  get: async (id: string): Promise<ApiResponse<Vehicle>> => {
    return apiClient.tms.get(`/vehicles/${id}`);
  },

  create: async (data: CreateVehicleRequest): Promise<ApiResponse<Vehicle>> => {
    return apiClient.tms.post('/vehicles', data);
  },

  update: async (id: string, data: UpdateVehicleRequest): Promise<ApiResponse<Vehicle>> => {
    return apiClient.tms.put(`/vehicles/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.tms.delete(`/vehicles/${id}`);
  },
};

export default vehicleApi;
