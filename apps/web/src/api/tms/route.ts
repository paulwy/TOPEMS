import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { Route, CreateRouteRequest, UpdateRouteRequest, PaginationParams } from './types';

export const routeApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Route>>> => {
    return apiClient.tms.get('/routes', { params });
  },

  get: async (id: string): Promise<ApiResponse<Route>> => {
    return apiClient.tms.get(`/routes/${id}`);
  },

  create: async (data: CreateRouteRequest): Promise<ApiResponse<Route>> => {
    return apiClient.tms.post('/routes', data);
  },

  update: async (id: string, data: UpdateRouteRequest): Promise<ApiResponse<Route>> => {
    return apiClient.tms.put(`/routes/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.tms.delete(`/routes/${id}`);
  },
};

export default routeApi;
