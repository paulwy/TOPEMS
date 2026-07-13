import { createAxiosClient } from '@/api/client';
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

const dictAxios = createAxiosClient({ baseURL: '/api/core/dict/v1' });
const API_BASE = '';

export const dictApi = {
  getTypes: async (): Promise<ApiResponse<DictType[]>> => {
    const response = await dictAxios.get(`${API_BASE}/types`);
    return response.data;
  },

  getType: async (code: string): Promise<ApiResponse<DictType>> => {
    const response = await dictAxios.get(`${API_BASE}/types/${code}`);
    return response.data;
  },

  createType: async (data: {
    code: string;
    name: string;
    category?: string;
    description?: string;
  }): Promise<ApiResponse<DictType>> => {
    const response = await dictAxios.post(`${API_BASE}/types`, data);
    return response.data;
  },

  updateType: async (
    code: string,
    data: { name?: string; category?: string; description?: string }
  ): Promise<ApiResponse<DictType>> => {
    const response = await dictAxios.put(`${API_BASE}/types/${code}`, data);
    return response.data;
  },

  deleteType: async (code: string): Promise<ApiResponse<boolean>> => {
    const response = await dictAxios.delete(`${API_BASE}/types/${code}`);
    return response.data;
  },

  getItems: async (typeCode: string): Promise<ApiResponse<DictItem[]>> => {
    const response = await dictAxios.get(`${API_BASE}/types/${typeCode}/items`);
    return response.data;
  },

  getItem: async (typeCode: string, itemCode: string): Promise<ApiResponse<DictItem>> => {
    const response = await dictAxios.get(`${API_BASE}/types/${typeCode}/items/${itemCode}`);
    return response.data;
  },

  createItem: async (
    typeCode: string,
    data: { code: string; name: string; value?: string; sort_order?: number; is_default?: boolean }
  ): Promise<ApiResponse<DictItem>> => {
    const response = await dictAxios.post(`${API_BASE}/types/${typeCode}/items`, data);
    return response.data;
  },

  updateItem: async (
    typeCode: string,
    itemCode: string,
    data: { name?: string; value?: string; sort_order?: number; is_default?: boolean }
  ): Promise<ApiResponse<DictItem>> => {
    const response = await dictAxios.put(`${API_BASE}/types/${typeCode}/items/${itemCode}`, data);
    return response.data;
  },

  deleteItem: async (typeCode: string, itemCode: string): Promise<ApiResponse<boolean>> => {
    const response = await dictAxios.delete(`${API_BASE}/types/${typeCode}/items/${itemCode}`);
    return response.data;
  },

  getAllByCategory: async (category: string): Promise<ApiResponse<DictType[]>> => {
    const response = await dictAxios.get(`${API_BASE}/types`, { params: { category } });
    return response.data;
  },
};
