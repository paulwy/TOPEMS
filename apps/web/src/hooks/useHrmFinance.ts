/**
 * HRM财务模块React Query Hooks
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import type { EmployeeFinance, PayrollRecord } from '@/types/hrm-finance';
import { apiClient } from '@/api/client';

/**
 * 获取员工财务数据
 */
export const useEmployeeFinance = (employeeId: string) => {
  return useQuery({
    queryKey: ['employee-finance', employeeId],
    queryFn: async () => {
      const response = await apiClient.hrm.get<{ data: EmployeeFinance }>(
        `/employees/${employeeId}/finance`
      );
      return response.data?.data!;
    },
    enabled: !!employeeId,
  });
};

/**
 * 获取员工财务信息（新接口，兼容旧接口）
 */
export const useEmployeeFinanceInfo = (employeeId: string) => {
  return useQuery({
    queryKey: ['employee-finance-info', employeeId],
    queryFn: async () => {
      const response = await apiClient.hrm.get<{ data: EmployeeFinance }>(
        `/employees/${employeeId}/finance`
      );
      return response.data?.data!;
    },
    enabled: !!employeeId,
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
  });
};

/**
 * 获取员工工资条列表
 */
export const useEmployeePayrolls = (employeeId: string) => {
  return useQuery({
    queryKey: ['employee-payrolls', employeeId],
    queryFn: async () => {
      const response = await apiClient.hrm.get<{ data: PayrollRecord[] }>(
        `/employees/${employeeId}/payrolls`
      );
      return response.data;
    },
    enabled: !!employeeId,
  });
};

/**
 * 获取部门工资汇总
 */
export const useDepartmentPayrollSummary = (departmentId: string, period: string) => {
  return useQuery({
    queryKey: ['department-payroll-summary', departmentId, period],
    queryFn: async () => {
      const response = await apiClient.hrm.get<{
        data: {
          department_id: string;
          department_name: string;
          employee_count: number;
          total_base_salary: number;
          total_bonus: number;
          total_allowance: number;
          total_social_security: number;
          total_housing_fund: number;
          total_tax: number;
          total_net_salary: number;
        };
      }>(`/departments/${departmentId}/payroll-summary`, {
        params: { period },
      });
      return response.data;
    },
    enabled: !!departmentId && !!period,
  });
};

/**
 * 获取工资期间列表
 */
export const usePayrollPeriods = () => {
  return useQuery({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const response = await apiClient.hrm.get<{ data: string[] }>('/payroll/periods');
      return response.data;
    },
  });
};
