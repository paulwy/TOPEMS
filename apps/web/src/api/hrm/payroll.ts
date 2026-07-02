import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PayrollRun,
  PayrollItem,
  PayrollDetail,
  SalaryAdjustment,
  ListParams,
  PaginatedResult,
} from './types';
import { buildQueryString } from './types';

export const payrollApi = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PayrollRun>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/payroll-runs${queryString}`);
  },

  get(id: string): Promise<ApiResponse<{ run: PayrollRun; items: PayrollItem[] }>> {
    return apiClient.hrm.get(`/payroll-runs/${id}`);
  },

  create(data: { pay_period: string }): Promise<ApiResponse<PayrollRun>> {
    return apiClient.hrm.post('/payroll-runs', data);
  },

  delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/payroll-runs/${id}`);
  },

  calculate(id: string): Promise<ApiResponse<PayrollRun>> {
    return apiClient.hrm.put(`/payroll-runs/${id}/calculate`);
  },

  pay(id: string): Promise<ApiResponse<PayrollRun>> {
    return apiClient.hrm.put(`/payroll-runs/${id}/pay`);
  },
};

export const payrollItemApi = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PayrollItem>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/payroll-items${queryString}`);
  },

  get(id: string): Promise<ApiResponse<{ item: PayrollItem; details: PayrollDetail[] }>> {
    return apiClient.hrm.get(`/payroll-items/${id}`);
  },
};

export const salaryAdjustmentApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<SalaryAdjustment>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/salary-adjustments${queryString}`);
  },
  get: async (id: string): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.get(`/salary-adjustments/${id}`);
  },
  create: async (data: Partial<SalaryAdjustment>): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.post('/salary-adjustments', data);
  },
  update: async (
    id: string,
    data: Partial<SalaryAdjustment>
  ): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.put(`/salary-adjustments/${id}`, data);
  },
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/salary-adjustments/${id}`);
  },
  approve: async (id: string, approverId: string): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.put(`/salary-adjustments/${id}/approve`, {
      approver_id: approverId,
    });
  },
  reject: async (
    id: string,
    approverId: string,
    reason: string
  ): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.put(`/salary-adjustments/${id}/reject`, {
      approver_id: approverId,
      reason,
    });
  },
};

export default payrollApi;
