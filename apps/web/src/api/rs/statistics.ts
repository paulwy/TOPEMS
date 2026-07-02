import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { RsStatistics } from './types';

export const rsStatisticsApi = {
  getStatistics: async (): Promise<ApiResponse<RsStatistics>> => {
    return apiClient.rs.get('/statistics');
  },
};
