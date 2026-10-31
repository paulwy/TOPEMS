import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 crm 4 条（2026-10-29）──
export const crmReadApi = {
  getCustomerProfile: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.crm.get('/customers/{id}/profile'),
  listCustomerProfiles: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.crm.get('/customer-profiles'),
  getStageTransitions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.crm.get('/opportunities/stage-transitions'),
  getStageOpportunities: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.crm.get('/sales-funnel/stage/{stage}'),
};
