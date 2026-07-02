import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../client';
import type { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from './types';

export const supplierApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Supplier>>> => {
    return apiClient.scm.get('/suppliers', { params });
  },

  create: async (data: CreateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.scm.post('/suppliers', data);
  },

  get: async (id: string): Promise<ApiResponse<Supplier>> => {
    return apiClient.scm.get(`/suppliers/${id}`);
  },

  update: async (id: string, data: UpdateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.scm.put(`/suppliers/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/suppliers/${id}`);
  },
};
