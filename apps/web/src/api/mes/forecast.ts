import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 to_bind 补绑（2026-10-29）──
export const forecastApi = {
  getForecast: async (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.mes.get(`/demand-forecasts/${id}`);
  },

  calculateForecast: async (
    id: string,
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.mes.post(`/demand-forecasts/${id}/calculate`, data);
  },

  validateForecast: async (
    id: string,
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.mes.post(`/demand-forecasts/${id}/validate`, data);
  },

  adoptForecast: async (
    id: string,
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.mes.post(`/demand-forecasts/${id}/adopt`, data);
  },
};
