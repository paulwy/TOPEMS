import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { BillingRecord, BillingQueryParams } from './types';

export const billingApi = {
  list: async (
    params?: BillingQueryParams
  ): Promise<ApiResponse<PaginatedResponse<BillingRecord>>> => {
    return apiClient.crm.get('/billing', { params });
  },

  create: async (data: Partial<BillingRecord>): Promise<ApiResponse<BillingRecord>> => {
    return apiClient.crm.post('/billing', data);
  },

  get: async (id: string): Promise<ApiResponse<BillingRecord>> => {
    return apiClient.crm.get(`/billing/${id}`);
  },

  update: async (id: string, data: Partial<BillingRecord>): Promise<ApiResponse<BillingRecord>> => {
    return apiClient.crm.put(`/billing/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/billing/${id}`);
  },

  markPaid: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.post(`/billing/${id}/paid`);
  },

  sendNotification: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.post(`/billing/${id}/notify`);
  },
};

export default billingApi;
