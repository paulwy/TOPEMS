/**
 * SRM · 供应商产品 API 绑定
 *
 * 后端: svc/srm/src/modules/supplier_product.rs
 * 路由:
 *   GET    /supplier-products
 *   POST   /supplier-products
 *   GET    /supplier-products/{id}
 *   PUT    /supplier-products/{id}
 *   DELETE /supplier-products/{id}
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export interface SupplierProduct {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_name_en?: string | null;
  sku: string;
  name: string;
  name_en?: string | null;
  category?: string;
  specification?: string;
  unit?: string;
  price?: number;
  currency?: string;
  lead_time_days?: number;
  moq?: number;
  status: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierProductRequest {
  supplier_id: string;
  sku: string;
  name: string;
  category?: string;
  specification?: string;
  unit?: string;
  price?: number;
  currency?: string;
  lead_time_days?: number;
  moq?: number;
  status?: string;
  description?: string;
}

export interface UpdateSupplierProductRequest {
  supplier_id?: string;
  sku?: string;
  name?: string;
  category?: string;
  specification?: string;
  unit?: string;
  price?: number;
  currency?: string;
  lead_time_days?: number;
  moq?: number;
  status?: string;
  description?: string;
}

export interface SupplierProductQuery {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  supplier_id?: string;
  category?: string;
}

const buildQuery = (params?: SupplierProductQuery): string => {
  if (!params) return '';
  const usp = new URLSearchParams();
  if (params.page !== undefined) usp.set('page', String(params.page));
  if (params.page_size !== undefined) usp.set('page_size', String(params.page_size));
  if (params.search) usp.set('search', params.search);
  if (params.status) usp.set('status', params.status);
  if (params.supplier_id) usp.set('supplier_id', params.supplier_id);
  if (params.category) usp.set('category', params.category);
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
};

export const supplierProductApi = {
  listProducts: async (
    params?: SupplierProductQuery
  ): Promise<ApiResponse<PaginatedResponse<SupplierProduct>>> => {
    return apiClient.srm.get(`/supplier-products${buildQuery(params)}`);
  },

  listSupplierProducts: async (
    supplierId: string,
    params?: Omit<SupplierProductQuery, 'supplier_id'>
  ): Promise<ApiResponse<PaginatedResponse<SupplierProduct>>> => {
    return apiClient.srm.get(
      `/supplier-products${buildQuery({ ...params, supplier_id: supplierId })}`
    );
  },

  getProduct: async (id: string): Promise<ApiResponse<SupplierProduct>> => {
    return apiClient.srm.get(`/supplier-products/${id}`);
  },

  createProduct: async (
    data: CreateSupplierProductRequest
  ): Promise<ApiResponse<SupplierProduct>> => {
    return apiClient.srm.post('/supplier-products', data);
  },

  updateProduct: async (
    id: string,
    data: UpdateSupplierProductRequest
  ): Promise<ApiResponse<SupplierProduct>> => {
    return apiClient.srm.put(`/supplier-products/${id}`, data);
  },

  deleteProduct: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete(`/supplier-products/${id}`);
  },
};

export default supplierProductApi;
