import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { DemandForecast, CreateDemandForecastRequest, UpdateDemandForecastRequest, PaginationParams } from './types';

export const forecastApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<DemandForecast>>> => {
    return apiClient.aps.get('/forecasts', { params });
  },

  get: async (id: string): Promise<ApiResponse<DemandForecast>> => {
    return apiClient.aps.get(`/forecasts/${id}`);
  },

  create: async (data: CreateDemandForecastRequest): Promise<ApiResponse<DemandForecast>> => {
    return apiClient.aps.post('/forecasts', data);
  },

  update: async (id: string, data: UpdateDemandForecastRequest): Promise<ApiResponse<DemandForecast>> => {
    return apiClient.aps.put(`/forecasts/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.aps.delete(`/forecasts/${id}`);
  },

  calculate: async (id: string): Promise<ApiResponse<DemandForecast>> => {
    return apiClient.aps.post(`/forecasts/${id}/calculate`);
  },

  validate: async (id: string): Promise<ApiResponse<DemandForecast>> => {
    return apiClient.aps.post(`/forecasts/${id}/validate`);
  },
};

export default forecastApi;
