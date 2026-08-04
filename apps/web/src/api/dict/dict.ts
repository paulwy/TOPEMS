import apiClient from '@/api/client';
import type { ApiResponse } from '@/api/client';

export interface DictType {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DictItem {
  id: string;
  dict_type_id: string;
  code: string;
  name: string;
  value?: string;
  sort_order: number;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export const dictApi = {
  getTypes: async (): Promise<ApiResponse<DictType[]>> => {
    return apiClient.core.get<DictType[]>('/dict/types');
  },

  getType: async (code: string): Promise<ApiResponse<DictType>> => {
    return apiClient.core.get<DictType>(`/dict/types/${code}`);
  },

  createType: async (data: {
    code: string;
    name: string;
    category?: string;
    description?: string;
  }): Promise<ApiResponse<DictType>> => {
    return apiClient.core.post<DictType>('/dict/types', data);
  },

  updateType: async (
    code: string,
    data: { name?: string; category?: string; description?: string }
  ): Promise<ApiResponse<DictType>> => {
    return apiClient.core.put<DictType>(`/dict/types/${code}`, data);
  },

  deleteType: async (code: string): Promise<ApiResponse<boolean>> => {
    return apiClient.core.delete<boolean>(`/dict/types/${code}`);
  },

  getItems: async (typeCode: string): Promise<ApiResponse<DictItem[]>> => {
    return apiClient.core.get<DictItem[]>(`/dict/types/${typeCode}/items`);
  },

  getItem: async (typeCode: string, itemCode: string): Promise<ApiResponse<DictItem>> => {
    return apiClient.core.get<DictItem>(`/dict/types/${typeCode}/items/${itemCode}`);
  },

  createItem: async (
    typeCode: string,
    data: { code: string; name: string; value?: string; sort_order?: number; is_default?: boolean }
  ): Promise<ApiResponse<DictItem>> => {
    return apiClient.core.post<DictItem>(`/dict/types/${typeCode}/items`, data);
  },

  updateItem: async (
    typeCode: string,
    itemCode: string,
    data: { name?: string; value?: string; sort_order?: number; is_default?: boolean }
  ): Promise<ApiResponse<DictItem>> => {
    return apiClient.core.put<DictItem>(`/dict/types/${typeCode}/items/${itemCode}`, data);
  },

  deleteItem: async (typeCode: string, itemCode: string): Promise<ApiResponse<boolean>> => {
    return apiClient.core.delete<boolean>(`/dict/types/${typeCode}/items/${itemCode}`);
  },

  getAllByCategory: async (category: string): Promise<ApiResponse<DictType[]>> => {
    return apiClient.core.get<DictType[]>('/dict/types', { params: { category } });
  },
};
