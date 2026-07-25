import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface CrmDashboardStats {
  total_opportunities: number;
  won_amount: number;
  conversion_rate: number;
  average_cycle: number;
  opportunity_stages?: Array<{ name: string; value: number }>;
  monthly_performance?: Array<{ name: string; value: number }>;
  industries?: Array<{ name: string; value: number }>;
}

export const crmDashboardApi = {
  async getOverview(): Promise<ApiResponse<CrmDashboardStats>> {
    return apiClient.crm.get<CrmDashboardStats>('/dashboard');
  },
};
