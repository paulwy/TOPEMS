import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { PaginationParams, PaginatedResult } from '@/api/erp/types';

/**
 * 资产分类管理（表 erp.asset_categories）
 * 后端已实现完整 CRUD（svc/erp/src/modules/asset_category.rs，挂载路由 /erp/asset-categories），
 * 下方 5 个方法契约 list/get/create/update/delete 与后端一一对应；
 * 响应层将 parent_id 映射为驼峰 parentId。
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
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
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
