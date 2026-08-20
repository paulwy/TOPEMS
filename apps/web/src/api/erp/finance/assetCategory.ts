import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams, PaginatedResult } from '../types';

/**
 * V19.0 Stub: 资产分类管理
 * 后端尚未实现，前端先建立接口契约；后端就绪后此区块无需改动。
 */
export interface AssetCategory {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetCategoryRequest {
  name: string;
  code: string;
  parentId?: string;
  description?: string;
  status?: string;
}

interface UpdateAssetCategoryRequest {
  name?: string;
  code?: string;
  parentId?: string;
  description?: string;
  status?: string;
}

export const assetCategoryApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResult<AssetCategory>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get<PaginatedResult<AssetCategory>>(
      `/asset-categories${queryString ? `?${queryString}` : ''}`
    );
  },

  get: async (id: string): Promise<ApiResponse<AssetCategory>> => {
    return apiClient.erp.get<AssetCategory>(`/asset-categories/${id}`);
  },

  create: async (data: CreateAssetCategoryRequest): Promise<ApiResponse<AssetCategory>> => {
    return apiClient.erp.post<AssetCategory>('/asset-categories', data);
  },

  update: async (
    id: string,
    data: UpdateAssetCategoryRequest
  ): Promise<ApiResponse<AssetCategory>> => {
    return apiClient.erp.put<AssetCategory>(`/asset-categories/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete<string>(`/asset-categories/${id}`);
  },
};

export default assetCategoryApi;
