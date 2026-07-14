import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { RsStatistics } from './types';

export const rdStatisticsApi = {
  getStatistics: async (): Promise<ApiResponse<RsStatistics>> => {
    return apiClient.rd.get('/statistics');
  },
};