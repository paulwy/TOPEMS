import apiClient, { downloadBlob } from '../client';
import type {
  AddressbookEntry,
  AddressbookDetail,
  AddressbookQueryParams,
  AddressbookSearchParams,
  ApiResponse,
  DepartmentNode,
  ExportParams,
  PaginatedResponse,
} from '../../types/addressbook';
import config from '../../config/runtime';

export const addressbookApi = {
  getContacts: async (
    params: AddressbookQueryParams
  ): Promise<ApiResponse<PaginatedResponse<AddressbookEntry>>> => {
    const response = await apiClient.erp.get('/addressbook', { params });
    return response;
  },

  getContactDetail: async (
    id: string,
    contactType: string
  ): Promise<ApiResponse<AddressbookDetail>> => {
    const response = await apiClient.erp.get(`/addressbook/${id}`, {
      params: { contact_type: contactType },
    });
    return response;
  },

  search: async (
    params: AddressbookSearchParams
  ): Promise<ApiResponse<Record<string, unknown>[]>> => {
    const response = await apiClient.erp.get('/addressbook/search', {
      params,
    });
    return response;
  },

  getDepartmentTree: async (): Promise<ApiResponse<DepartmentNode[]>> => {
    const response = await apiClient.erp.get('/addressbook/departments/tree');
    return response;
  },

  exportContacts: async (params: ExportParams): Promise<Blob> => {
    const baseURL = apiClient.erp.defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, '/addressbook/export', {
      params: params as unknown as Record<string, unknown>,
    });
  },
};

export default addressbookApi;
