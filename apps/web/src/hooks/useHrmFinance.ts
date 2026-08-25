/**
 * HRM财务模块React Query Hooks
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import type { EmployeeFinance } from '@/types/hrm-finance';
import { apiClient } from '@/api/client';

/**
 * 获取员工财务信息
 */
export const useEmployeeFinanceInfo = (employeeId: string) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.EMPLOYEE_FINANCE_INFO_BASE, employeeId],
    queryFn: async () => {
      const response = await apiClient.hrm.get<{ data: EmployeeFinance }>(
        `/employees/${employeeId}/finance`
      );
      return response.data?.data!;
    },
    enabled: !!employeeId,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
};

/**
 * 更新员工财务信息
 */
export const useUpdateEmployeeFinanceInfo = () => {
  return useMutation({
    mutationFn: async ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: Partial<EmployeeFinance>;
    }) => {
      const response = await apiClient.hrm.put<{ data: EmployeeFinance }>(
        `/employees/${employeeId}/finance`,
        data
      );
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.EMPLOYEE_FINANCE_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
};
