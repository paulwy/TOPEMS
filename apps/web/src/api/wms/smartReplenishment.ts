/**
 * WMS · 智能补货 API 绑定
 *
 * 后端: svc/wms/src/modules/smart_replenishment/
 * 路由:
 *   GET    /wms/smart-replenishment/suggestions
 *   POST   /wms/smart-replenishment/suggestions/generate
 *   GET    /wms/smart-replenishment/suggestions/{id}
 *   POST   /wms/smart-replenishment/suggestions/{id}
 *   GET    /wms/smart-replenishment/rules
 *   POST   /wms/smart-replenishment/rules
 *   GET    /wms/smart-replenishment/rules/{id}
 *   PUT    /wms/smart-replenishment/rules/{id}
 *   DELETE /wms/smart-replenishment/rules/{id}
 *   GET    /wms/smart-replenishment/statistics
 *   GET    /wms/smart-replenishment/orders
 *   POST   /wms/smart-replenishment/orders
 *   GET    /wms/smart-replenishment/orders/{id}
 *   PUT    /wms/smart-replenishment/orders/{id}
 *   DELETE /wms/smart-replenishment/orders/{id}
 *   GET    /wms/smart-replenishment/orders/{id}/items
 *   POST   /wms/smart-replenishment/orders/{id}/confirm
 *   POST   /wms/smart-replenishment/orders/{id}/complete
 *   GET    /wms/smart-replenishment/safety-stock
 *   GET    /wms/smart-replenishment/safety-stock/{id}
 *   PUT    /wms/smart-replenishment/safety-stock/{id}
 *   POST   /wms/smart-replenishment/safety-stock/batch-update
 *   POST   /wms/smart-replenishment/safety-stock/calculate
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type SuggestionStatus = 'pending' | 'confirmed' | 'rejected';
export type RuleType = 'reorder_point' | 'safety_stock' | 'eoq' | 'periodic';
export type OrderStatus = 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
type OrderType = 'purchase' | 'transfer' | 'production';

export interface ReplenishmentSuggestion {
  id: string;
  material_id: string;
  material_code: string;
  material_name: string;
  warehouse_id: string;
  warehouse_name: string;
  current_quantity: number;
  reorder_point: number;
  suggested_quantity: number;
  min_order_quantity?: number;
  unit: string;
  suggestion_date: string;
  status: SuggestionStatus;
  rule_id?: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

interface ReplenishmentRule {
  id: string;
  name: string;
  rule_type: RuleType;
  material_id?: string;
  material_code?: string;
  warehouse_id?: string;
  min_quantity?: number;
  max_quantity?: number;
  reorder_point?: number;
  safety_stock?: number;
  eoq?: number;
  review_period_days?: number;
  lead_time_days?: number;
  enabled: boolean;
  priority?: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface ReplenishmentOrder {
  id: string;
  order_no: string;
  order_type: OrderType;
  status: OrderStatus;
  warehouse_id: string;
  warehouse_name: string;
  supplier_id?: string;
  supplier_name?: string;
  expected_date?: string;
  total_items: number;
  total_quantity: number;
  notes?: string;
  created_by?: string;
  confirmed_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReplenishmentOrderItem {
  id: string;
  order_id: string;
  material_id: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  suggested_supplier?: string;
  remarks?: string;
}

interface SafetyStock {
  id: string;
  material_id: string;
  material_code: string;
  material_name: string;
  warehouse_id: string;
  warehouse_name: string;
  safety_stock: number;
  reorder_point: number;
  max_stock?: number;
  avg_demand?: number;
  lead_time_days?: number;
  service_level?: number;
  last_calculated_at?: string;
  created_at: string;
  updated_at: string;
}

interface SuggestionListResponse {
  suggestions: ReplenishmentSuggestion[];
  total: number;
  page: number;
  page_size: number;
}

interface RuleListResponse {
  rules: ReplenishmentRule[];
  total: number;
  page: number;
  page_size: number;
}

interface OrderListResponse {
  orders: ReplenishmentOrder[];
  total: number;
  page: number;
  page_size: number;
}

interface OrderItemListResponse {
  items: ReplenishmentOrderItem[];
  total: number;
}

interface SafetyStockListResponse {
  items: SafetyStock[];
  total: number;
  page: number;
  page_size: number;
}

export interface ReplenishmentStatistics {
  total_suggestions: number;
  pending_suggestions: number;
  confirmed_suggestions: number;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  total_quantity_ordered: number;
  byMaterial: Array<{ material_code: string; material_name: string; count: number }>;
  byWarehouse: Array<{ warehouse_id: string; warehouse_name: string; count: number }>;
}

interface CreateReplenishmentRuleRequest {
  name: string;
  rule_type: RuleType;
  material_id?: string;
  material_code?: string;
  warehouse_id?: string;
  min_quantity?: number;
  max_quantity?: number;
  reorder_point?: number;
  safety_stock?: number;
  eoq?: number;
  review_period_days?: number;
  lead_time_days?: number;
  enabled?: boolean;
  priority?: number;
  remarks?: string;
}

interface UpdateReplenishmentRuleRequest {
  name?: string;
  rule_type?: RuleType;
  min_quantity?: number;
  max_quantity?: number;
  reorder_point?: number;
  safety_stock?: number;
  eoq?: number;
  review_period_days?: number;
  lead_time_days?: number;
  enabled?: boolean;
  priority?: number;
  remarks?: string;
}

interface ComputeReplenishmentRequest {
  warehouse_id?: string;
  material_ids?: string[];
  rule_ids?: string[];
  min_quantity?: number;
}

interface ConfirmSuggestionRequest {
  confirmed_quantity?: number;
  notes?: string;
}

export interface CreateReplenishmentOrderRequest {
  order_type: OrderType;
  warehouse_id: string;
  supplier_id?: string;
  expected_date?: string;
  notes?: string;
  items: Array<{
    material_id: string;
    material_code: string;
    material_name: string;
    quantity: number;
    unit_price?: number;
  }>;
}

interface UpdateReplenishmentOrderRequest {
  status?: OrderStatus;
  supplier_id?: string;
  expected_date?: string;
  notes?: string;
}

export interface UpdateSafetyStockRequest {
  safety_stock: number;
  reorder_point: number;
  max_stock?: number;
}

interface BatchUpdateSafetyStockRequest {
  updates: Array<{
    id: string;
    safety_stock: number;
    reorder_point: number;
    max_stock?: number;
  }>;
}

interface CalculateSafetyStockRequest {
  material_id: string;
  warehouse_id: string;
  service_level?: number;
  lead_time_days?: number;
  avg_demand?: number;
  demand_variability?: number;
}

export const advancedReplenishmentApi = {
  // ==================== 建议 ====================

  listSuggestions: async (params?: {
    page?: number;
    page_size?: number;
    status?: SuggestionStatus;
    warehouse_id?: string;
    material_id?: string;
  }): Promise<ApiResponse<SuggestionListResponse>> => {
    return apiClient.wms.get('/smart-replenishment/suggestions', { params });
  },

  generateSuggestions: async (
    data: ComputeReplenishmentRequest
  ): Promise<ApiResponse<SuggestionListResponse>> => {
    return apiClient.wms.post('/smart-replenishment/suggestions/generate', data);
  },

  getSuggestion: async (id: string): Promise<ApiResponse<ReplenishmentSuggestion>> => {
    return apiClient.wms.get(`/smart-replenishment/suggestions/${id}`);
  },

  confirmSuggestion: async (
    id: string,
    data?: ConfirmSuggestionRequest
  ): Promise<ApiResponse<ReplenishmentSuggestion>> => {
    return apiClient.wms.post(`/smart-replenishment/suggestions/${id}`, data ?? {});
  },

  // ==================== 规则 ====================

  listRules: async (params?: {
    page?: number;
    page_size?: number;
    rule_type?: RuleType;
    enabled?: boolean;
    warehouse_id?: string;
  }): Promise<ApiResponse<RuleListResponse>> => {
    return apiClient.wms.get('/smart-replenishment/rules', { params });
  },

  createRule: async (
    data: CreateReplenishmentRuleRequest
  ): Promise<ApiResponse<ReplenishmentRule>> => {
    return apiClient.wms.post('/smart-replenishment/rules', data);
  },

  getRule: async (id: string): Promise<ApiResponse<ReplenishmentRule>> => {
    return apiClient.wms.get(`/smart-replenishment/rules/${id}`);
  },

  updateRule: async (
    id: string,
    data: UpdateReplenishmentRuleRequest
  ): Promise<ApiResponse<ReplenishmentRule>> => {
    return apiClient.wms.put(`/smart-replenishment/rules/${id}`, data);
  },

  deleteRule: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/smart-replenishment/rules/${id}`);
  },

  // ==================== 统计 ====================

  getStatistics: async (): Promise<ApiResponse<ReplenishmentStatistics>> => {
    return apiClient.wms.get('/smart-replenishment/statistics');
  },

  // ==================== 订单 ====================

  listOrders: async (params?: {
    page?: number;
    page_size?: number;
    status?: OrderStatus;
    order_type?: OrderType;
    warehouse_id?: string;
  }): Promise<ApiResponse<OrderListResponse>> => {
    return apiClient.wms.get('/smart-replenishment/orders', { params });
  },

  createOrder: async (
    data: CreateReplenishmentOrderRequest
  ): Promise<ApiResponse<ReplenishmentOrder>> => {
    return apiClient.wms.post('/smart-replenishment/orders', data);
  },

  getOrder: async (id: string): Promise<ApiResponse<ReplenishmentOrder>> => {
    return apiClient.wms.get(`/smart-replenishment/orders/${id}`);
  },

  updateOrder: async (
    id: string,
    data: UpdateReplenishmentOrderRequest
  ): Promise<ApiResponse<ReplenishmentOrder>> => {
    return apiClient.wms.put(`/smart-replenishment/orders/${id}`, data);
  },

  deleteOrder: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/smart-replenishment/orders/${id}`);
  },

  listOrderItems: async (orderId: string): Promise<ApiResponse<OrderItemListResponse>> => {
    return apiClient.wms.get(`/smart-replenishment/orders/${orderId}/items`);
  },

  confirmOrder: async (id: string): Promise<ApiResponse<ReplenishmentOrder>> => {
    return apiClient.wms.post(`/smart-replenishment/orders/${id}/confirm`, {});
  },

  completeOrder: async (id: string): Promise<ApiResponse<ReplenishmentOrder>> => {
    return apiClient.wms.post(`/smart-replenishment/orders/${id}/complete`, {});
  },

  // ==================== 安全库存 ====================

  listSafetyStock: async (params?: {
    page?: number;
    page_size?: number;
    warehouse_id?: string;
    material_id?: string;
  }): Promise<ApiResponse<SafetyStockListResponse>> => {
    return apiClient.wms.get('/smart-replenishment/safety-stock', { params });
  },

  getSafetyStock: async (id: string): Promise<ApiResponse<SafetyStock>> => {
    return apiClient.wms.get(`/smart-replenishment/safety-stock/${id}`);
  },

  updateSafetyStock: async (
    id: string,
    data: UpdateSafetyStockRequest
  ): Promise<ApiResponse<SafetyStock>> => {
    return apiClient.wms.put(`/smart-replenishment/safety-stock/${id}`, data);
  },

  batchUpdateSafetyStock: async (
    data: BatchUpdateSafetyStockRequest
  ): Promise<ApiResponse<{ updated_count: number }>> => {
    return apiClient.wms.post('/smart-replenishment/safety-stock/batch-update', data);
  },

  calculateSafetyStock: async (
    data: CalculateSafetyStockRequest
  ): Promise<ApiResponse<SafetyStock>> => {
    return apiClient.wms.post('/smart-replenishment/safety-stock/calculate', data);
  },
};

export default advancedReplenishmentApi;
