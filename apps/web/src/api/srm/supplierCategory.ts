/**
 * SRM · 供应商分类 API 绑定
 *
 * 后端: svc/srm/src/modules/supplier_category.rs
 * 路由:
 *   GET    /supplier-categories
 *   POST   /supplier-categories
 *   GET    /supplier-categories/{id}
 *   PUT    /supplier-categories/{id}
 *   DELETE /supplier-categories/{id}
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export interface SupplierCategory {
  id: string;
  code: string;
  name: string;
  parent_id?: string | null;
  level: number;
  path?: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierCategoryRequest {
  code: string;
  name: string;
  parent_id?: string | null;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateSupplierCategoryRequest {
  code?: string;
  name?: string;
  parent_id?: string | null;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface SupplierCategoryQuery {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  parent_id?: string;
}

export interface SupplierCategoryNode extends SupplierCategory {
  children?: SupplierCategoryNode[];
}

const buildQuery = (params?: SupplierCategoryQuery): string => {
  if (!params) return '';
  const usp = new URLSearchParams();
  if (params.page !== undefined) usp.set('page', String(params.page));
  if (params.page_size !== undefined) usp.set('page_size', String(params.page_size));
  if (params.search) usp.set('search', params.search);
  if (params.is_active !== undefined) usp.set('is_active', String(params.is_active));
  if (params.parent_id) usp.set('parent_id', params.parent_id);
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
};

export const supplierCategoryApi = {
  listCategories: async (
    params?: SupplierCategoryQuery
  ): Promise<ApiResponse<PaginatedResponse<SupplierCategory>>> => {
    return apiClient.srm.get(`/supplier-categories${buildQuery(params)}`);
  },

  listAllCategories: async (
    params?: Omit<SupplierCategoryQuery, 'page' | 'page_size'>
  ): Promise<ApiResponse<SupplierCategory[]>> => {
    return apiClient.srm.get(`/supplier-categories${buildQuery({ ...params })}`);
  },

  getCategory: async (id: string): Promise<ApiResponse<SupplierCategory>> => {
    return apiClient.srm.get(`/supplier-categories/${id}`);
  },

  createCategory: async (
    data: CreateSupplierCategoryRequest
  ): Promise<ApiResponse<SupplierCategory>> => {
    return apiClient.srm.post('/supplier-categories', data);
  },

  updateCategory: async (
    id: string,
    data: UpdateSupplierCategoryRequest
  ): Promise<ApiResponse<SupplierCategory>> => {
    return apiClient.srm.put(`/supplier-categories/${id}`, data);
  },

  deleteCategory: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete(`/supplier-categories/${id}`);
  },

  /** 返回扁平列表按 parent_id 组装为树形结构 */
  buildTree(list: SupplierCategory[]): SupplierCategoryNode[] {
    const byId = new Map<string, SupplierCategoryNode>();
    list.forEach((c) => byId.set(c.id, { ...c }));
    const roots: SupplierCategoryNode[] = [];
    byId.forEach((node) => {
      if (node.parent_id && byId.has(node.parent_id)) {
        const parent = byId.get(node.parent_id)!;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  },
};

export default supplierCategoryApi;
