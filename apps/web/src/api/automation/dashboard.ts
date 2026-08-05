import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { AutomationDashboardStats } from './types';

// 自动化仪表盘统计：对应 AutomationDashboardPage
export const automationDashboardApi = {
  /** 仪表盘汇总统计 */
  getStats: async (): Promise<ApiResponse<AutomationDashboardStats>> => {
    return apiClient.automation.get<AutomationDashboardStats>('/dashboard/stats');
  },

  /** 健康检查 */
  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.automation.get<string>('/health');
  },
};
