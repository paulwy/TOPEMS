import apiClient from '@/api/client';
import type { ApiResponse } from '@/api/client';

/**
 * @deprecated 本文件为无消费方死代码（2026-09-09 审计 P1 主题四④ 确认）。
 * 活跃 dict API 为：
 *   - apps/web/src/api/erp/core/dict.ts（erpApi.dictApi → /api/erp/system/dict-*，后端 svc/erp/src/modules/dict.rs）
 *   - apps/web/src/api/master/dictionary.ts（master 聚合 → 同上 /system/dict-* 体系）
 * 下方 /dict/types（斜杠）路径与 master-data 后端 /dict-types（连字符）不匹配，
 * 且无任何页面 import；如需使用 master-data 数据字典，请改调
 * apiClient.master-data 的 /dict-types 系列（svc/master-data/src/modules/dict/handlers.rs）。
 * 全仓无消费方，保留仅为兼容旧引用；请勿新代码 import 本文件。
 */

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
