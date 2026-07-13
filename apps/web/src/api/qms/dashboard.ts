import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { QualityOverview, QualityOverviewBackend } from './types';
import { adaptQualityOverviewToFrontend } from './adapters';

export const qualityDashboardApi = {
  getQualityOverview: async (params?: {
    startDate?: string;
    endDate?: string;
    department?: string;
  }): Promise<ApiResponse<QualityOverview>> => {
    const response = await apiClient.qms.get<QualityOverviewBackend>(
      '/quality-dashboard/overview',
      {
        params: {
          start_date: params?.startDate,
          end_date: params?.endDate,
          department: params?.department,
        },
      }
    );
    return {
      ...response,
      data: response.data ? adaptQualityOverviewToFrontend(response.data) : ({} as QualityOverview),
    };
  },
};
