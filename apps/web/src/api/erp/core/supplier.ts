import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type {
  PaginationParams,
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from './types';

export const supplierApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      suppliers: Supplier[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('page_size', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/suppliers${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Supplier>> {
    return apiClient.erp.get(`/suppliers/${id}`);
  },

  async create(data: CreateSupplierRequest): Promise<ApiResponse<Supplier>> {
    return apiClient.erp.post('/suppliers', data);
  },

  async update(id: string, data: UpdateSupplierRequest): Promise<ApiResponse<Supplier>> {
    return apiClient.erp.put(`/suppliers/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/suppliers/${id}`);
  },
};
