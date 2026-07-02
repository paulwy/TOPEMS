import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../client';
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerQueryParams,
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
} from './types';

export const customerApi = {
  list: async (params?: CustomerQueryParams): Promise<ApiResponse<PaginatedResponse<Customer>>> => {
    return apiClient.crm.get('/customers', { params });
  },

  create: async (data: CreateCustomerRequest): Promise<ApiResponse<Customer>> => {
    return apiClient.crm.post('/customers', data);
  },

  get: async (id: string): Promise<ApiResponse<Customer>> => {
    return apiClient.crm.get(`/customers/${id}`);
  },

  update: async (id: string, data: UpdateCustomerRequest): Promise<ApiResponse<Customer>> => {
    return apiClient.crm.put(`/customers/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/customers/${id}`);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post('/customers/batch-delete', { ids });
  },

  getTags: async (id: string): Promise<ApiResponse<Tag[]>> => {
    return apiClient.crm.get(`/customers/${id}/tags`);
  },

  addTag: async (id: string, tagId: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.post(`/customers/${id}/tags`, {
      tag_id: tagId,
    });
  },

  removeTag: async (id: string, tagId: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/customers/${id}/tags/${tagId}`);
  },
};

export const tagApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Tag>>> => {
    return apiClient.crm.get('/tags', { params });
  },

  create: async (data: CreateTagRequest): Promise<ApiResponse<Tag>> => {
    return apiClient.crm.post('/tags', data);
  },

  get: async (id: string): Promise<ApiResponse<Tag>> => {
    return apiClient.crm.get(`/tags/${id}`);
  },

  update: async (id: string, data: UpdateTagRequest): Promise<ApiResponse<Tag>> => {
    return apiClient.crm.put(`/tags/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/tags/${id}`);
  },

  getTaggedCustomers: async (id: string): Promise<ApiResponse<any[]>> => {
    return apiClient.crm.get(`/tags/${id}/customers`);
  },
};

export default customerApi;
