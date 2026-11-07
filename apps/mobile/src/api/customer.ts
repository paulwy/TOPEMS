import { apiClient } from './client';
import type { ApiResponse, Customer } from '@/types';

export const customerApi = {
  getCustomers: async (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  }): Promise<ApiResponse<{ items: Customer[]; total: number }>> => {
    return apiClient.get('/customers', { params });
  },

  getCustomerById: async (id: string): Promise<ApiResponse<Customer>> => {
    return apiClient.get(`/customers/${id}`);
  },

  createCustomer: async (data: {
    name: string;
    code?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    industry?: string;
  }): Promise<ApiResponse<Customer>> => {
    return apiClient.post('/customers', data);
  },

  updateCustomer: async (
    id: string,
    data: {
      name?: string;
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      address?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      industry?: string;
      status?: 'active' | 'inactive';
    },
  ): Promise<ApiResponse<Customer>> => {
    return apiClient.put(`/customers/${id}`, data);
  },

  deleteCustomer: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/customers/${id}`);
  },
};
