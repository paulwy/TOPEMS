import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 hrm 3 条（2026-10-29）──
export const hrmReadOps2 = {
  getCourseRecords: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.hrm.get('/training-courses/{id}/records'),
  listPayrollItems: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.hrm.get('/payroll-items'),
  listPayrollSlips: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.hrm.get('/payroll-slips'),
};