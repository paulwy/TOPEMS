import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  PurchaseRequisition,
  CreatePurchaseRequisitionRequest,
  UpdatePurchaseRequisitionRequest,
  PurchaseRequisitionQueryParams,
} from './types';

export const purchaseRequisitionApi = {
  list: async (
    params?: PurchaseRequisitionQueryParams
  ): Promise<ApiResponse<PaginatedResponse<PurchaseRequisition>>> => {
    return apiClient.scm.get('/purchase-requisitions', { params });
  },

  create: async (
    data: CreatePurchaseRequisitionRequest
  ): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.post('/purchase-requisitions', data);
  },

  get: async (id: string): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.get(`/purchase-requisitions/${id}`);
  },

  update: async (
    id: string,
    data: UpdatePurchaseRequisitionRequest
  ): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.put(`/purchase-requisitions/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/purchase-requisitions/${id}`);
  },

  submit: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.post(`/purchase-requisitions/${id}/submit`, { remarks });
  },

  approve: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.post(`/purchase-requisitions/${id}/approve`, { remarks });
  },

  reject: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.post(`/purchase-requisitions/${id}/reject`, { remarks });
  },

  cancel: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.post(`/purchase-requisitions/${id}/cancel`, { remarks });
  },

  convertToOrder: async (id: string): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.post(`/purchase-requisitions/${id}/convert-to-order`);
  },
};
