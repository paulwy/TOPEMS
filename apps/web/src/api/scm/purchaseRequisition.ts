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
    return apiClient.scm.get('/api/scm/purchase-requisitions', { params });
  },

  create: async (
    data: CreatePurchaseRequisitionRequest
  ): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.post('/api/scm/purchase-requisitions', data);
  },

  get: async (id: string): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.get(`/api/scm/purchase-requisitions/${id}`);
  },

  update: async (
    id: string,
    data: UpdatePurchaseRequisitionRequest
  ): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.put(`/api/scm/purchase-requisitions/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/purchase-requisitions/${id}`);
  },

  submit: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.post(`/api/scm/purchase-requisitions/${id}/submit`, { remarks });
  },

  approve: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.post(`/api/scm/purchase-requisitions/${id}/approve`, { remarks });
  },

  reject: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.post(`/api/scm/purchase-requisitions/${id}/reject`, { remarks });
  },

  cancel: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.post(`/api/scm/purchase-requisitions/${id}/cancel`, { remarks });
  },

  convertToOrder: async (id: string): Promise<ApiResponse<PurchaseRequisition>> => {
    return apiClient.scm.post(`/api/scm/purchase-requisitions/${id}/convert-to-order`);
  },
};
