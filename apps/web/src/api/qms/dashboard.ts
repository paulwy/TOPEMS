import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { QualityOverview, QualityOverviewBackend } from './types';
import { adaptQualityOverviewToFrontend } from './adapters';

export interface QualityTrendItem {
  period: string;
  total_count: number;
  qualified_count: number;
  qualification_rate: number;
  issue_count: number;
}

export interface QualityDefectDistribution {
  category: string;
  count: number;
  percentage: number;
}

export const qualityDashboardApi = {
  getQualityOverview: async (params?: {
    startDate?: string;
    endDate?: string;
    department?: string;
  }): Promise<ApiResponse<QualityOverview | undefined>> => {
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

  getQualityTrend: async (params?: {
    days?: number;
  }): Promise<ApiResponse<QualityTrendItem[]>> => {
    return apiClient.qms.get<QualityTrendItem[]>(
      '/quality-dashboard/trend',
      {
        params: { days: params?.days ?? 30 },
      }
    );
  },

  getDefectDistribution: async (): Promise<ApiResponse<QualityDefectDistribution[]>> => {
    return apiClient.qms.get<QualityDefectDistribution[]>(
      '/quality-dashboard/defect-distribution'
    );
  },
};
