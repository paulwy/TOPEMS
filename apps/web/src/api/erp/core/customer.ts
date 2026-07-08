import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type {
  PaginationParams,
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from './types';

export const customerApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      customers: Customer[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pagesize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.industry) searchParams.set('industry', params.industry);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/customers${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Customer>> {
    return apiClient.erp.get(`/customers/${id}`);
  },

  async create(data: CreateCustomerRequest): Promise<ApiResponse<Customer>> {
    return apiClient.erp.post('/customers', data);
  },

  async update(id: string, data: UpdateCustomerRequest): Promise<ApiResponse<Customer>> {
    return apiClient.erp.put(`/customers/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/customers/${id}`);
  },
};