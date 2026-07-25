import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type { PmStatistics } from './types';

export const dashboardApi = {
  getStatistics: async (): Promise<ApiResponse<PmStatistics>> => {
    return apiClient.pm.get<PmStatistics>('/statistics');
  },
};

export default dashboardApi;
