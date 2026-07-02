import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  ContactQueryParams,
} from './types';

export const contactApi = {
  list: async (params?: ContactQueryParams): Promise<ApiResponse<PaginatedResponse<Contact>>> => {
    return apiClient.crm.get('/contacts', { params });
  },

  create: async (data: CreateContactRequest): Promise<ApiResponse<Contact>> => {
    return apiClient.crm.post('/contacts', data);
  },

  get: async (id: string): Promise<ApiResponse<Contact>> => {
    return apiClient.crm.get(`/contacts/${id}`);
  },

  update: async (id: string, data: UpdateContactRequest): Promise<ApiResponse<Contact>> => {
    return apiClient.crm.put(`/contacts/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/contacts/${id}`);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post('/contacts/batch-delete', { ids });
  },
};

export default contactApi;
