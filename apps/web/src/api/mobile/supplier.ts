/**
 * Mobile · 移动端 SRM 供应商管理 API 绑定
 *
 * 后端: svc/mobile/src/main.rs (通过 ERP/SRM 服务客户端)
 * 路由:
 *   GET    /mobile/suppliers
 *   GET    /mobile/suppliers/{id}
 *   POST   /mobile/suppliers
 *   PUT    /mobile/suppliers/{id}
 *   DELETE /mobile/suppliers/{id}
 *   GET    /mobile/suppliers/{id}/evaluations
 *   POST   /mobile/suppliers/{id}/evaluations
 *   GET    /mobile/suppliers/{id}/contracts
 *   GET    /mobile/suppliers/{id}/products
 *   GET    /mobile/suppliers/categories
 *   GET    /mobile/suppliers/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type SupplierStatus = 'active' | 'inactive' | 'pending_approval' | 'blocked';
export type EvaluationScore = 'excellent' | 'good' | 'average' | 'poor';
export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated';

export interface Supplier {
  id: string;
  name: string;
  code?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  status: SupplierStatus;
  rating?: number;
  total_orders?: number;
  last_order_date?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierEvaluation {
  id: string;
  supplier_id: string;
  period: string;
  quality_score: number;
  delivery_score: number;
  service_score: number;
  price_score: number;
  overall_score: number;
  grade: EvaluationScore;
  evaluator: string;
  remarks?: string;
  created_at: string;
}

export interface SupplierContract {
  id: string;
  contract_no: string;
  supplier_id: string;
  supplier_name: string;
  title: string;
  status: ContractStatus;
  start_date: string;
  end_date?: string;
  total_amount?: number;
  created_at: string;
}

export interface SupplierProduct {
  id: string;
  supplier_id: string;
  product_name: string;
  product_code?: string;
  category?: string;
  unit_price: number;
  min_order_quantity?: number;
  lead_time_days?: number;
  is_active: boolean;
}

export interface SupplierCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  supplier_count: number;
}

export interface SupplierStats {
  total_suppliers: number;
  active_suppliers: number;
  pending_approval: number;
  blocked_suppliers: number;
  by_category: Array<{
    category: string;
    count: number;
  }>;
  by_status: Array<{
    status: SupplierStatus;
    count: number;
  }>;
  top_rated: Supplier[];
}

export interface CreateSupplierRequest {
  name: string;
  code?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
}

export interface CreateEvaluationRequest {
  period: string;
  quality_score: number;
  delivery_score: number;
  service_score: number;
  price_score: number;
  remarks?: string;
}

export const supplierApi = {
  // ==================== 供应商管理 ====================

  listSuppliers: async (params?: {
    keyword?: string;
    category?: string;
    status?: SupplierStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Supplier>>> => {
    return apiClient.mobile.get('/mobile/suppliers', { params });
  },

  getSupplier: async (id: string): Promise<ApiResponse<Supplier>> => {
    return apiClient.mobile.get(`/mobile/suppliers/${id}`);
  },

  createSupplier: async (data: CreateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.mobile.post('/mobile/suppliers', data);
  },

  updateSupplier: async (
    id: string,
    data: Partial<CreateSupplierRequest>
  ): Promise<ApiResponse<Supplier>> => {
    return apiClient.mobile.put(`/mobile/suppliers/${id}`, data);
  },

  deleteSupplier: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`/mobile/suppliers/${id}`);
  },

  // ==================== 供应商评估 ====================

  listEvaluations: async (supplierId: string): Promise<ApiResponse<SupplierEvaluation[]>> => {
    return apiClient.mobile.get(`/mobile/suppliers/${supplierId}/evaluations`);
  },

  createEvaluation: async (
    supplierId: string,
    data: CreateEvaluationRequest
  ): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.mobile.post(`/mobile/suppliers/${supplierId}/evaluations`, data);
  },

  // ==================== 供应商合同 ====================

  listContracts: async (
    supplierId: string,
    params?: {
      status?: ContractStatus;
    }
  ): Promise<ApiResponse<SupplierContract[]>> => {
    return apiClient.mobile.get(`/mobile/suppliers/${supplierId}/contracts`, { params });
  },

  // ==================== 供应商产品 ====================

  listProducts: async (supplierId: string): Promise<ApiResponse<SupplierProduct[]>> => {
    return apiClient.mobile.get(`/mobile/suppliers/${supplierId}/products`);
  },

  // ==================== 供应商分类 ====================

  listCategories: async (): Promise<ApiResponse<SupplierCategory[]>> => {
    return apiClient.mobile.get('/mobile/suppliers/categories');
  },

  // ==================== 供应商统计 ====================

  getSupplierStats: async (): Promise<ApiResponse<SupplierStats>> => {
    return apiClient.mobile.get('/mobile/suppliers/stats');
  },
};

export default supplierApi;
