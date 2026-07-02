import { apiClient } from '../client';
import type { PmStatistics } from './types';

export const dashboardApi = {
  getStatistics: async (): Promise<any> => {
    return apiClient.pm.get('/statistics');
  },
};

export default dashboardApi;
