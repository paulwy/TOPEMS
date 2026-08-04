import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  ReturnRecord,
  ReturnItem,
  ReturnFinanceStatus,
  ReturnInventoryStatus,
  CreateReturnRequest,
  UpdateReturnRequest,
  ReturnQueryParams,
} from './types';

export const returnsApi = {
  list: async (
    params?: ReturnQueryParams
  ): Promise<ApiResponse<PaginatedResponse<ReturnRecord>>> => {
    return apiClient.crm.get('/returns', { params });
  },

  create: async (data: CreateReturnRequest): Promise<ApiResponse<ReturnRecord>> => {
    return apiClient.crm.post('/returns', data);
  },

  get: async (id: string): Promise<ApiResponse<ReturnRecord>> => {
    return apiClient.crm.get(`/returns/${id}`);
  },

  update: async (id: string, data: UpdateReturnRequest): Promise<ApiResponse<ReturnRecord>> => {
    return apiClient.crm.put(`/returns/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/returns/${id}`);
  },

  approve: async (id: string): Promise<ApiResponse<ReturnRecord>> => {
    return apiClient.crm.post(`/returns/${id}/approve`);
  },

  reject: async (id: string): Promise<ApiResponse<ReturnRecord>> => {
    return apiClient.crm.post(`/returns/${id}/reject`);
  },

  receive: async (id: string): Promise<ApiResponse<ReturnRecord>> => {
    return apiClient.crm.post(`/returns/${id}/receive`);
  },

  complete: async (id: string): Promise<ApiResponse<ReturnRecord>> => {
    return apiClient.crm.post(`/returns/${id}/complete`);
  },

  cancel: async (id: string): Promise<ApiResponse<ReturnRecord>> => {
    return apiClient.crm.post(`/returns/${id}/cancel`);
  },

  listItems: async (id: string): Promise<ApiResponse<ReturnItem[]>> => {
    return apiClient.crm.get(`/returns/${id}/items`);
  },

  addItem: async (
    id: string,
    item: Omit<ReturnItem, 'id' | 'return_id'>
  ): Promise<ApiResponse<ReturnItem>> => {
    return apiClient.crm.post(`/returns/${id}/items`, item);
  },

  getFinanceStatus: async (id: string): Promise<ApiResponse<ReturnFinanceStatus>> => {
    return apiClient.crm.get(`/returns/${id}/finance-status`);
  },

  getInventoryStatus: async (id: string): Promise<ApiResponse<ReturnInventoryStatus>> => {
    return apiClient.crm.get(`/returns/${id}/inventory-status`);
  },
};
