import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { SalesForecast, CreateSalesForecastRequest, SalesForecastQueryParams } from './types';

export const salesForecastApi = {
  list: async (
    params?: SalesForecastQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SalesForecast>>> => {
    return apiClient.crm.get('/sales-forecast', { params });
  },

  get: async (id: string): Promise<ApiResponse<SalesForecast>> => {
    return apiClient.crm.get(`/sales-forecast/${id}`);
  },

  create: async (data: CreateSalesForecastRequest): Promise<ApiResponse<SalesForecast>> => {
    return apiClient.crm.post('/sales-forecast', data);
  },

  update: async (id: string, data: Partial<SalesForecast>): Promise<ApiResponse<SalesForecast>> => {
    return apiClient.crm.put(`/sales-forecast/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/sales-forecast/${id}`);
  },

  generate: async (data: CreateSalesForecastRequest): Promise<ApiResponse<SalesForecast>> => {
    return apiClient.crm.post('/sales-forecast/generate', data);
  },
};

export default salesForecastApi;
