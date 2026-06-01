import apiClient from './client';
import type {
  AddressbookEntry,
  AddressbookDetail,
  AddressbookQueryParams,
  AddressbookSearchParams,
  ApiResponse,
  DepartmentNode,
  ExportParams,
  PaginatedResponse,
} from '../types/addressbook';

export const addressbookApi = {
  getContacts: async (
    params: AddressbookQueryParams
  ): Promise<ApiResponse<PaginatedResponse<AddressbookEntry>>> => {
    const response = await apiClient.get('/api/v1/addressbook', { params });
    return response.data;
  },

  getContactDetail: async (
    id: string,
    contactType: string
  ): Promise<ApiResponse<AddressbookDetail>> => {
    const response = await apiClient.get(`/api/v1/addressbook/${id}`, {
      params: { type: contactType },
    });
    return response.data;
  },

  search: async (
    params: AddressbookSearchParams
  ): Promise<ApiResponse<Record<string, unknown>[]>> => {
    const response = await apiClient.get('/api/v1/addressbook/search', {
      params,
    });
    return response.data;
  },

  getDepartmentTree: async (): Promise<ApiResponse<DepartmentNode[]>> => {
    const response = await apiClient.get(
      '/api/v1/addressbook/departments/tree'
    );
    return response.data;
  },

  exportContacts: async (params: ExportParams): Promise<Blob> => {
    const response = await apiClient.get('/api/v1/addressbook/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
