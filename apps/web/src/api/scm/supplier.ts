import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../client';
import type {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from './types';

export const supplierApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Supplier>>> => {
    return apiClient.scm.get('/api/scm/suppliers', { params });
  },

  create: async (data: CreateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.scm.post('/api/scm/suppliers', data);
  },

  get: async (id: string): Promise<ApiResponse<Supplier>> => {
    return apiClient.scm.get(`/api/scm/suppliers/${id}`);
  },

  update: async (id: string, data: UpdateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.scm.put(`/api/scm/suppliers/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/suppliers/${id}`);
  },
};
