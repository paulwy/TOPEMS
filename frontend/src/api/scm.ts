/**
 * SCM (Supply Chain Management) API Client
 * 供应链管理 API 客户端
 */

import { apiClient, ApiResponse, PaginationParams, PaginatedResponse } from './client';

// ==================== Types ====================

/**
 * 供应商
 */
export interface Supplier {
  id: string;
  name: string;
  short_name?: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  bank_account?: string;
  tax_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  short_name?: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  bank_account?: string;
  tax_number?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  short_name?: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  bank_account?: string;
  tax_number?: string;
  status?: string;
}

/**
 * 采购订单
 */
export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id?: string;
  order_date: string;
  delivery_date?: string;
  total_amount?: number;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderRequest {
  order_number: string;
  supplier_id?: string;
  order_date: string;
  delivery_date?: string;
  total_amount?: number;
  remarks?: string;
}

export interface UpdatePurchaseOrderRequest {
  supplier_id?: string;
  delivery_date?: string;
  total_amount?: number;
  status?: string;
  remarks?: string;
}

/**
 * 采购明细
 */
export interface PurchaseItem {
  id: string;
  order_id: string;
  product_code?: string;
  product_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unit_price?: number;
  amount?: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseItemRequest {
  order_id: string;
  product_code?: string;
  product_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unit_price?: number;
  amount?: number;
}

export interface UpdatePurchaseItemRequest {
  product_code?: string;
  product_name?: string;
  specification?: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
}

export interface PurchaseItemQueryParams extends PaginationParams {
  order_id?: string;
}

/**
 * 供应商评估
 */
export interface SupplierEvaluation {
  id: string;
  supplier_id: string;
  evaluation_date: string;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  overall_score?: number;
  comments?: string;
  evaluator?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierEvaluationRequest {
  supplier_id: string;
  evaluation_date: string;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  overall_score?: number;
  comments?: string;
  evaluator?: string;
}

export interface UpdateSupplierEvaluationRequest {
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  overall_score?: number;
  comments?: string;
  evaluator?: string;
}

export interface SupplierEvaluationQueryParams extends PaginationParams {
  supplier_id?: string;
}

// ==================== Supplier API ====================

const supplierApi = {
  /**
   * 获取供应商列表
   */
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Supplier>>> => {
    return apiClient.scm.get('/api/v1/suppliers', { params });
  },

  /**
   * 创建供应商
   */
  create: async (data: CreateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.scm.post('/api/v1/suppliers', data);
  },

  /**
   * 获取供应商详情
   */
  get: async (id: string): Promise<ApiResponse<Supplier>> => {
    return apiClient.scm.get(`/api/v1/suppliers/${id}`);
  },

  /**
   * 更新供应商
   */
  update: async (id: string, data: UpdateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.scm.put(`/api/v1/suppliers/${id}`, data);
  },

  /**
   * 删除供应商
   */
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/v1/suppliers/${id}`);
  },
};

// ==================== Purchase Order API ====================

const purchaseOrderApi = {
  /**
   * 获取采购订单列表
   */
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<PurchaseOrder>>> => {
    return apiClient.scm.get('/api/v1/purchase-orders', { params });
  },

  /**
   * 创建采购订单
   */
  create: async (data: CreatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.post('/api/v1/purchase-orders', data);
  },

  /**
   * 获取采购订单详情
   */
  get: async (id: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.get(`/api/v1/purchase-orders/${id}`);
  },

  /**
   * 更新采购订单
   */
  update: async (id: string, data: UpdatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.put(`/api/v1/purchase-orders/${id}`, data);
  },
};

// ==================== Purchase Item API ====================

const purchaseItemApi = {
  /**
   * 获取采购明细列表
   */
  list: async (params?: PurchaseItemQueryParams): Promise<ApiResponse<PaginatedResponse<PurchaseItem>>> => {
    return apiClient.scm.get('/api/v1/purchase-items', { params });
  },

  /**
   * 创建采购明细
   */
  create: async (data: CreatePurchaseItemRequest): Promise<ApiResponse<PurchaseItem>> => {
    return apiClient.scm.post('/api/v1/purchase-items', data);
  },

  /**
   * 获取采购明细详情
   */
  get: async (id: string): Promise<ApiResponse<PurchaseItem>> => {
    return apiClient.scm.get(`/api/v1/purchase-items/${id}`);
  },

  /**
   * 更新采购明细
   */
  update: async (id: string, data: UpdatePurchaseItemRequest): Promise<ApiResponse<PurchaseItem>> => {
    return apiClient.scm.put(`/api/v1/purchase-items/${id}`, data);
  },
};

// ==================== Supplier Evaluation API ====================

const supplierEvaluationApi = {
  /**
   * 获取供应商评估列表
   */
  list: async (params?: SupplierEvaluationQueryParams): Promise<ApiResponse<PaginatedResponse<SupplierEvaluation>>> => {
    return apiClient.scm.get('/api/v1/evaluations', { params });
  },

  /**
   * 创建供应商评估
   */
  create: async (data: CreateSupplierEvaluationRequest): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.scm.post('/api/v1/evaluations', data);
  },

  /**
   * 获取供应商评估详情
   */
  get: async (id: string): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.scm.get(`/api/v1/evaluations/${id}`);
  },

  /**
   * 更新供应商评估
   */
  update: async (id: string, data: UpdateSupplierEvaluationRequest): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.scm.put(`/api/v1/evaluations/${id}`, data);
  },
};

// ==================== SCM API Export ====================

/**
 * SCM API 统一导出
 */
export const scmApi = {
  suppliers: supplierApi,
  purchaseOrders: purchaseOrderApi,
  purchaseItems: purchaseItemApi,
  evaluations: supplierEvaluationApi,
  
  /**
   * 健康检查
   */
  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.scm.get('/health');
  },
};