import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../client';
import type {
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
} from './types';

export const purchaseOrderApi = {
  list: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<PurchaseOrder>>> => {
    return apiClient.scm.get('/purchase-orders', { params });
  },

  create: async (data: CreatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.post('/purchase-orders', data);
  },

  get: async (id: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.get(`/purchase-orders/${id}`);
  },

  update: async (
    id: string,
    data: UpdatePurchaseOrderRequest
  ): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.put(`/purchase-orders/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/purchase-orders/${id}`);
  },

  approve: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.post(`/purchase-orders/${id}/approve`, { remarks });
  },

  confirm: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.post(`/purchase-orders/${id}/confirm`, { remarks });
  },

  cancel: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.post(`/purchase-orders/${id}/cancel`, { remarks });
  },

  close: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.post(`/purchase-orders/${id}/close`, { remarks });
  },
};
