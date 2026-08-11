import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type { PmStatistics, DashboardOverview, StatisticsQuery } from './types';

export const dashboardApi = {
  getStatistics(params?: StatisticsQuery): Promise<ApiResponse<PmStatistics>> {
    return apiClient.pm.get<PmStatistics>('/statistics', { params });
  },

  getDashboard(): Promise<ApiResponse<DashboardOverview>> {
    return apiClient.pm.get<DashboardOverview>('/statistics/dashboard');
  },
};

export default dashboardApi;