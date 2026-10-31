import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 finance 5 条（2026-10-29）──
export const financeReadOps2 = {
  listVoucherSummary: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.get('/cqrs/views/voucher-summary'),
  getVarianceTrend: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.get('/forecasting/budget-variance/{period}/trend'),
  listRiskAssessments: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.get('/compliance-v51/risk-assessments'),
  lists: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.get('/events/handlers'),
  listSagas: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.get('/sagas'),
};
