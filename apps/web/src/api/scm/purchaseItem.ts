import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  PurchaseItem,
  CreatePurchaseItemRequest,
  UpdatePurchaseItemRequest,
  PurchaseItemQueryParams,
} from './types';

export const purchaseItemApi = {
  list: async (
    params?: PurchaseItemQueryParams
  ): Promise<ApiResponse<PaginatedResponse<PurchaseItem>>> => {
    return apiClient.scm.get('/purchase-items', { params });
  },

  create: async (data: CreatePurchaseItemRequest): Promise<ApiResponse<PurchaseItem>> => {
    return apiClient.scm.post('/purchase-items', data);
  },

  get: async (id: string): Promise<ApiResponse<PurchaseItem>> => {
    return apiClient.scm.get(`/purchase-items/${id}`);
  },

  update: async (
    id: string,
    data: UpdatePurchaseItemRequest
  ): Promise<ApiResponse<PurchaseItem>> => {
    return apiClient.scm.put(`/purchase-items/${id}`, data);
  },
};
