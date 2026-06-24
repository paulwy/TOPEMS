/**
 * PM财务模块React Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import type { ProjectFinance, ProjectBudgetItem } from '@/types/pm-finance';
import { apiClient } from '@/api/client';

/**
 * 获取项目财务数据
 */
export const useProjectFinance = (projectId: string) => {
  return useQuery({
    queryKey: ['project-finance', projectId],
    queryFn: async () => {
      const response = await apiClient.pm.get<{ data: ProjectFinance }>(
        `/api/pm/projects/${projectId}/finance`
      );
      return response.data;
    },
    enabled: !!projectId,
  });
};

/**
 * 获取项目预算项列表
 */
export const useProjectBudgetItems = (projectId: string) => {
  return useQuery({
    queryKey: ['project-budget-items', projectId],
    queryFn: async () => {
      const response = await apiClient.pm.get<{ data: ProjectBudgetItem[] }>(
        `/api/pm/projects/${projectId}/budget-items`
      );
      return response.data;
    },
    enabled: !!projectId,
  });
};

/**
 * 获取项目成本绩效指标
 */
export const useProjectCostPerformance = (projectId: string) => {
  return useQuery({
    queryKey: ['project-cost-performance', projectId],
    queryFn: async () => {
      const response = await apiClient.pm.get<{
        data: {
          cpi: number; // 成本绩效指数
          spi: number; // 进度绩效指数
          cv: number; // 成本差异
          sv: number; // 进度差异
        };
      }>(`/api/pm/projects/${projectId}/cost-performance`);
      return response.data;
    },
    enabled: !!projectId,
  });
};
