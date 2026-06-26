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
    return apiClient.crm.get('/api/crm/customers', { params });
  },

  create: async (data: CreateCustomerRequest): Promise<ApiResponse<Customer>> => {
    return apiClient.crm.post('/api/crm/customers', data);
  },

  get: async (id: string): Promise<ApiResponse<Customer>> => {
    return apiClient.crm.get(`/api/crm/customers/${id}`);
  },

  update: async (id: string, data: UpdateCustomerRequest): Promise<ApiResponse<Customer>> => {
    return apiClient.crm.put(`/api/crm/customers/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/crm/customers/${id}`);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post('/api/crm/customers/batch-delete', { ids });
  },

  getTags: async (id: string): Promise<ApiResponse<Tag[]>> => {
    return apiClient.crm.get(`/api/crm/customers/${id}/tags`);
  },

  addTag: async (id: string, tagId: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.post(`/api/crm/customers/${id}/tags`, {
      tag_id: tagId,
    });
  },

  removeTag: async (id: string, tagId: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/crm/customers/${id}/tags/${tagId}`);
  },
};

export const tagApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Tag>>> => {
    return apiClient.crm.get('/api/crm/tags', { params });
  },

  create: async (data: CreateTagRequest): Promise<ApiResponse<Tag>> => {
    return apiClient.crm.post('/api/crm/tags', data);
  },

  get: async (id: string): Promise<ApiResponse<Tag>> => {
    return apiClient.crm.get(`/api/crm/tags/${id}`);
  },

  update: async (id: string, data: UpdateTagRequest): Promise<ApiResponse<Tag>> => {
    return apiClient.crm.put(`/api/crm/tags/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/crm/tags/${id}`);
  },

  getTaggedCustomers: async (id: string): Promise<ApiResponse<any[]>> => {
    return apiClient.crm.get(`/api/crm/tags/${id}/customers`);
  },
};

export default customerApi;
