import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface WmsDashboardStats {
  total_inventory: number;
  pending_inbound: number;
  pending_outbound: number;
  location_utilization: number;
  inbound_trend?: Array<{ name: string; value: number }>;
  inventory_categories?: Array<{ name: string; value: number }>;
  outbound_trend?: Array<{ name: string; value: number }>;
}

export const wmsDashboardApi = {
  async getOverview(): Promise<ApiResponse<WmsDashboardStats>> {
    return apiClient.wms.get<WmsDashboardStats>('/dashboard');
  },
};
