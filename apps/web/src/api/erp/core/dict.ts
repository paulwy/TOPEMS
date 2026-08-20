import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

export interface DictType {
  id: string;
  code: string;
  name: string;
  category?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DictItem {
  id: string;
  dict_type_id: string;
  code: string;
  name: string;
  value?: string;
  sort_order?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CreateDictTypeRequest {
  code: string;
  name: string;
  category?: string;
  description?: string;
  status?: string;
}

interface UpdateDictTypeRequest {
  name?: string;
  category?: string;
  description?: string;
  status?: string;
}

interface CreateDictItemRequest {
  dict_type_id: string;
  code: string;
  name: string;
  value?: string;
  sort_order?: number;
  status?: string;
}

interface UpdateDictItemRequest {
  name?: string;
  value?: string;
  sort_order?: number;
  status?: string;
}

interface BatchCreateDictItemRequest {
  dict_type_id: string;
  items: CreateDictItemRequest[];
}

interface DictTypeListResponse {
  items: DictType[];
  total: number;
}

interface DictItemListResponse {
  items: DictItem[];
  total: number;
}

interface DictTypeQueryParams extends PaginationParams {
  search?: string;
  category?: string;
  status?: string;
}

interface DictItemQueryParams extends PaginationParams {
  search?: string;
}

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps =
    (params as { pageSize?: number } | undefined)?.pageSize ??
    (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

const buildSearchParams = (params?: PaginationParams): URLSearchParams => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', params.page.toString());
  const ps = resolvePageSize(params);
  if (ps) sp.set('pagesize', ps);
  return sp;
};

export const dictApi = {
  // DictType
  async listTypes(params?: DictTypeQueryParams): Promise<ApiResponse<DictTypeListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.search) sp.set('search', params.search);
    if (params?.category) sp.set('category', params.category);
    if (params?.status) sp.set('status', params.status);
    const qs = sp.toString();
    return apiClient.erp.get<DictTypeListResponse>(`/system/dict-types${qs ? `?${qs}` : ''}`);
  },

  async getType(id: string): Promise<ApiResponse<DictType>> {
    return apiClient.erp.get<DictType>(`/system/dict-types/${id}`);
  },

  async createType(data: CreateDictTypeRequest): Promise<ApiResponse<DictType>> {
    return apiClient.erp.post<DictType>('/system/dict-types', data);
  },

  async updateType(id: string, data: UpdateDictTypeRequest): Promise<ApiResponse<DictType>> {
    return apiClient.erp.put<DictType>(`/system/dict-types/${id}`, data);
  },

  async removeType(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/system/dict-types/${id}`);
  },

  async deleteType(id: string): Promise<ApiResponse<string>> {
    return this.removeType(id);
  },

  // DictItem
  async listItems(
    typeId: string,
    params?: DictItemQueryParams
  ): Promise<ApiResponse<DictItemListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.search) sp.set('search', params.search);
    const qs = sp.toString();
    return apiClient.erp.get<DictItemListResponse>(
      `/system/dict-types/${typeId}/items${qs ? `?${qs}` : ''}`
    );
  },

  async getItem(id: string): Promise<ApiResponse<DictItem>> {
    return apiClient.erp.get<DictItem>(`/system/dict-items/${id}`);
  },

  async createItem(data: CreateDictItemRequest): Promise<ApiResponse<DictItem>> {
    return apiClient.erp.post<DictItem>('/system/dict-items', data);
  },

  async batchCreateItems(data: BatchCreateDictItemRequest): Promise<ApiResponse<DictItem[]>> {
    return apiClient.erp.post<DictItem[]>('/system/dict-items/batch', data);
  },

  async updateItem(id: string, data: UpdateDictItemRequest): Promise<ApiResponse<DictItem>> {
    return apiClient.erp.put<DictItem>(`/system/dict-items/${id}`, data);
  },

  async removeItem(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/system/dict-items/${id}`);
  },

  async deleteItem(id: string): Promise<ApiResponse<string>> {
    return this.removeItem(id);
  },

  async exportItems(typeId: string): Promise<ApiResponse<DictItem[]>> {
    return apiClient.erp.get<DictItem[]>(`/system/dict-types/${typeId}/items/export`);
  },
};
