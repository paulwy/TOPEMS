import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 hrm 5 条（2026-10-29）──
export const hrmReadApi = {
  getEmployeeRecords: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.hrm.get('/employees/{id}/training-records'),
  listRenewals: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.hrm.get('/contract-renewals'),
  getEmployeeDetails: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.hrm.get('/employees/{id}/details'),
  listExpiringContracts: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.hrm.get('/contracts/expiring'),
  listExpiringTail: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.hrm.get('/contracts/expiring/{tail}'),
};