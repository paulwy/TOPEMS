import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type {
  PmStatistics,
  ProjectStatistics,
  ContractStatistics,
  BudgetStatistics,
  RiskStatistics,
  TaskStatistics,
  DashboardOverview,
  StatisticsQuery,
} from './types';

export type { StatisticsQuery } from './types';

export const pmStatisticsApi = {
  getStatistics(params?: StatisticsQuery): Promise<ApiResponse<PmStatistics>> {
    return apiClient.pm.get<PmStatistics>('/statistics', { params });
  },

  getProjectStatistics(params?: StatisticsQuery): Promise<ApiResponse<ProjectStatistics>> {
    return apiClient.pm.get<ProjectStatistics>('/statistics/projects', { params });
  },

  getContractStatistics(params?: StatisticsQuery): Promise<ApiResponse<ContractStatistics>> {
    return apiClient.pm.get<ContractStatistics>('/statistics/contracts', { params });
  },

  getBudgetStatistics(params?: StatisticsQuery): Promise<ApiResponse<BudgetStatistics>> {
    return apiClient.pm.get<BudgetStatistics>('/statistics/budget', { params });
  },

  getRiskStatistics(params?: StatisticsQuery): Promise<ApiResponse<RiskStatistics>> {
    return apiClient.pm.get<RiskStatistics>('/statistics/risks', { params });
  },

  getTaskStatistics(params?: StatisticsQuery): Promise<ApiResponse<TaskStatistics>> {
    return apiClient.pm.get<TaskStatistics>('/statistics/tasks', { params });
  },

  getDashboard(): Promise<ApiResponse<DashboardOverview>> {
    return apiClient.pm.get<DashboardOverview>('/statistics/dashboard');
  },
};

export default pmStatisticsApi;
