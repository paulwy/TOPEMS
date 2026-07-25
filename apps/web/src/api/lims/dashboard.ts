import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface LimsDashboardStats {
  pending_samples: number;
  in_progress_tasks: number;
  instrument_usage: number;
  pass_rate: number;
  test_items?: Array<{ name: string; value: number }>;
  task_completion?: Array<{ name: string; value: number }>;
  instrument_status?: Array<{ name: string; value: number }>;
}

export const limsDashboardApi = {
  async getOverview(): Promise<ApiResponse<LimsDashboardStats>> {
    return apiClient.lims.get<LimsDashboardStats>('/dashboard');
  },
};
