import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface EhsDashboardStats {
  total_accidents: number;
  pending_hazards: number;
  training_rate: number;
  drill_count: number;
  accident_trend?: Array<{ name: string; value: number }>;
  hazard_types?: Array<{ name: string; value: number }>;
  training_trend?: Array<{ name: string; value: number }>;
}

export const ehsDashboardApi = {
  async getOverview(): Promise<ApiResponse<EhsDashboardStats>> {
    return apiClient.ehs.get<EhsDashboardStats>('/dashboard');
  },
};
