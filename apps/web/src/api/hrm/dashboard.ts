import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface HrmDashboardStats {
  total_employees: number;
  new_hires: number;
  on_leave: number;
  avg_salary: number;
  department_distribution?: Array<{ name: string; value: number }>;
  hire_trend?: Array<{ name: string; value: number }>;
  education_distribution?: Array<{ name: string; value: number }>;
}

export const hrmDashboardApi = {
  async getOverview(): Promise<ApiResponse<HrmDashboardStats>> {
    return apiClient.hrm.get<HrmDashboardStats>('/dashboard');
  },
};
