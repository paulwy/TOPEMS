import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface SuppressionRule {
  id: string;
  name: string;
  description?: string;
  match_conditions: Record<string, unknown>;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface SuppressionCreateRequest {
  name: string;
  description?: string;
  match_conditions: Record<string, unknown>;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  enabled?: boolean;
}

export const suppressionApi = {
  list: (params?: {
    enabled?: boolean;
    keyword?: string;
  }): Promise<ApiResponse<SuppressionRule[]>> => {
    return apiClient.monitor.get('/suppression', { params });
  },

  get: (id: string): Promise<ApiResponse<SuppressionRule>> => {
    return apiClient.monitor.get(`/suppression/${id}`);
  },

  create: (data: SuppressionCreateRequest): Promise<ApiResponse<SuppressionRule>> => {
    return apiClient.monitor.post('/suppression', data);
  },

  update: (
    id: string,
    data: Partial<SuppressionCreateRequest>
  ): Promise<ApiResponse<SuppressionRule>> => {
    return apiClient.monitor.put(`/suppression/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.monitor.delete(`/suppression/${id}`);
  },
};

export default suppressionApi;
