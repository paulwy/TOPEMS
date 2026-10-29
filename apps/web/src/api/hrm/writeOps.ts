import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（hrm 写端点补绑，2026-10-29）──
export const hrmWriteApi = {
  generatePayrollVoucher: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.hrm.post('/payroll-runs/{id}/generate-voucher', data ?? {}),
};