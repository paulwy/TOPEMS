import apiClient from '../client';
import type { ApiResponse, PaginationParams } from '../client';

// ==================== ERP 数据字典 ====================

export interface ErpDictionary {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  items?: unknown[] | null;
  status: string;
  description?: string | null;
}

export interface CreateDictionaryRequest {
  code: string;
  name: string;
  category?: string;
  items?: unknown[];
  status?: string;
  description?: string;
}

export interface UpdateDictionaryRequest {
  name?: string;
  category?: string;
  items?: unknown[];
  status?: string;
  description?: string;
}

export interface DictionaryListResponse {
  items: ErpDictionary[];
  total: number;
  page: number;
  page_size: number;
}

export const dictionaryApi = {
  list: (params: PaginationParams & { search?: string; status?: string; category?: string }) =>
    apiClient.get<ApiResponse<DictionaryListResponse>>('/api/erp/dictionaries', { params }),
  get: (id: string) => apiClient.get<ApiResponse<ErpDictionary>>(`/api/erp/dictionaries/${id}`),
  create: (data: CreateDictionaryRequest) =>
    apiClient.post<ApiResponse<{ id: string }>>('/api/erp/dictionaries', data),
  update: (id: string, data: UpdateDictionaryRequest) =>
    apiClient.put<ApiResponse<{ id: string }>>(`/api/erp/dictionaries/${id}`, data),
  remove: (id: string) => apiClient.delete<ApiResponse<string>>(`/api/erp/dictionaries/${id}`),
};
