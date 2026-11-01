import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  DemandForecast,
  CreateDemandForecastRequest,
  UpdateDemandForecastRequest,
  PaginationParams,
} from './types';

export const forecastApi = {
  list: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<DemandForecast>>> => {
    return apiClient.aps.get('/demand-forecasts', { params });
  },

  get: async (id: string): Promise<ApiResponse<DemandForecast>> => {
    return apiClient.aps.get(`/demand-forecasts/${id}`);
  },

  create: async (data: CreateDemandForecastRequest): Promise<ApiResponse<DemandForecast>> => {
    return apiClient.aps.post('/demand-forecasts', data);
  },

  update: async (
    id: string,
    data: UpdateDemandForecastRequest
  ): Promise<ApiResponse<DemandForecast>> => {
    return apiClient.aps.put(`/demand-forecasts/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.aps.delete(`/demand-forecasts/${id}`);
  },

  calculate: async (id: string): Promise<ApiResponse<DemandForecast>> => {
    return apiClient.aps.post(`/demand-forecasts/${id}/calculate`);
  },

  validate: async (id: string): Promise<ApiResponse<DemandForecast>> => {
    return apiClient.aps.post(`/demand-forecasts/${id}/validate`);
  },
};

export default forecastApi;
