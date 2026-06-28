import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  PurchaseContract,
  CreatePurchaseContractRequest,
  UpdatePurchaseContractRequest,
  PurchaseContractQueryParams,
} from './types';

export const purchaseContractApi = {
  list: async (
    params?: PurchaseContractQueryParams
  ): Promise<ApiResponse<PaginatedResponse<PurchaseContract>>> => {
    return apiClient.scm.get('/api/scm/purchase-contracts', { params });
  },

  create: async (
    data: CreatePurchaseContractRequest
  ): Promise<ApiResponse<PurchaseContract>> => {
    return apiClient.scm.post('/api/scm/purchase-contracts', data);
  },

  get: async (id: string): Promise<ApiResponse<PurchaseContract>> => {
    return apiClient.scm.get(`/api/scm/purchase-contracts/${id}`);
  },

  update: async (
    id: string,
    data: UpdatePurchaseContractRequest
  ): Promise<ApiResponse<PurchaseContract>> => {
    return apiClient.scm.put(`/api/scm/purchase-contracts/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/purchase-contracts/${id}`);
  },

  submit: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseContract>> => {
    return apiClient.scm.post(`/api/scm/purchase-contracts/${id}/submit`, { remarks });
  },

  approve: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseContract>> => {
    return apiClient.scm.post(`/api/scm/purchase-contracts/${id}/approve`, { remarks });
  },

  reject: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseContract>> => {
    return apiClient.scm.post(`/api/scm/purchase-contracts/${id}/reject`, { remarks });
  },

  cancel: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseContract>> => {
    return apiClient.scm.post(`/api/scm/purchase-contracts/${id}/cancel`, { remarks });
  },

  terminate: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseContract>> => {
    return apiClient.scm.post(`/api/scm/purchase-contracts/${id}/terminate`, { remarks });
  },

  renew: async (id: string): Promise<ApiResponse<PurchaseContract>> => {
    return apiClient.scm.post(`/api/scm/purchase-contracts/${id}/renew`);
  },
};
