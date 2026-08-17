import apiClient, { downloadBlob } from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export interface DictType {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DictItem {
  id: string;
  dict_type_id: string;
  code: string;
  name: string;
  value?: string;
  sort_order?: number;
  parent_id?: string;
  extra_data?: Record<string, unknown>;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DictTypeCreateRequest {
  code: string;
  name: string;
  category?: string;
  description?: string;
  sort_order?: number;
}

export interface DictItemCreateRequest {
  dict_type_id: string;
  code: string;
  name: string;
  value?: string;
  sort_order?: number;
  parent_id?: string;
  extra_data?: Record<string, unknown>;
}

export interface DictItemBatchRequest {
  dict_type_id: string;
  items: Array<DictItemCreateRequest>;
}

export const dictionaryApi = {
  listTypes: async (params?: {
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<DictType>>> => {
    return apiClient.erp.get('/system/dict-types', { params });
  },

  getType: async (id: string): Promise<ApiResponse<DictType>> => {
    return apiClient.erp.get(`/system/dict-types/${id}`);
  },

  createType: async (data: DictTypeCreateRequest): Promise<ApiResponse<DictType>> => {
    return apiClient.erp.post('/system/dict-types', data);
  },

  updateType: async (
    id: string,
    data: Partial<DictTypeCreateRequest>
  ): Promise<ApiResponse<DictType>> => {
    return apiClient.erp.put(`/system/dict-types/${id}`, data);
  },

  deleteType: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.delete(`/system/dict-types/${id}`);
  },

  listItems: async (
    dictTypeId: string,
    params?: { page?: number; page_size?: number; search?: string }
  ): Promise<ApiResponse<PaginatedResponse<DictItem>>> => {
    return apiClient.erp.get(`/system/dict-types/${dictTypeId}/items`, { params });
  },

  exportItems: async (dictTypeId: string, format?: 'csv' | 'xlsx'): Promise<Blob> => {
    return downloadBlob('erp', `/system/dict-types/${dictTypeId}/items/export`, {
      params: { format } as unknown as Record<string, unknown>,
    });
  },

  getItem: async (id: string): Promise<ApiResponse<DictItem>> => {
    return apiClient.erp.get(`/system/dict-items/${id}`);
  },

  createItem: async (data: DictItemCreateRequest): Promise<ApiResponse<DictItem>> => {
    return apiClient.erp.post('/system/dict-items', data);
  },

  updateItem: async (
    id: string,
    data: Partial<DictItemCreateRequest>
  ): Promise<ApiResponse<DictItem>> => {
    return apiClient.erp.put(`/system/dict-items/${id}`, data);
  },

  deleteItem: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.delete(`/system/dict-items/${id}`);
  },

  batchCreateItems: async (data: DictItemBatchRequest): Promise<ApiResponse<DictItem[]>> => {
    return apiClient.erp.post('/system/dict-items/batch', data);
  },
};

export default dictionaryApi;
