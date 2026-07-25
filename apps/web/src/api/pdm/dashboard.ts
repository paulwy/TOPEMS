import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface PdmDashboardStats {
  ongoing_projects: number;
  pending_reviews: number;
  bom_changes: number;
  completion_rate: number;
  project_distribution?: Array<{ name: string; value: number }>;
  document_types?: Array<{ name: string; value: number }>;
  change_trend?: Array<{ name: string; value: number }>;
}

export const pdmDashboardApi = {
  async getOverview(): Promise<ApiResponse<PdmDashboardStats>> {
    return apiClient.pdm.get<PdmDashboardStats>('/dashboard');
  },
};
