/**
 * SCM (Supply Chain Management) API Client
 * 供应链管理 API 客户端
 */

import type { ApiResponse, PaginationParams, PaginatedResponse } from './client';
import { apiClient } from './client';

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

/**
 * MRP 物料需求计划
 */
export interface MrpPlan {
  id: string;
  plan_name: string;
  plan_code?: string;
  start_date: string;
  end_date: string;
  status: string;
  description?: string;
  calculated_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMrpPlanRequest {
  plan_name: string;
  plan_code?: string;
  start_date: string;
  end_date: string;
  description?: string;
}

export interface UpdateMrpPlanRequest {
  plan_name?: string;
  plan_code?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  description?: string;
}

export interface MrpPlanQueryParams extends PaginationParams {
  status?: string;
}

export interface MrpSuggestion {
  id: string;
  plan_id: string;
  product_code: string;
  product_name: string;
  specification?: string;
  unit?: string;
  required_quantity: number;
  available_quantity: number;
  suggested_quantity: number;
  suggestion_type: string;
  due_date?: string;
  supplier_id?: string;
  supplier_name?: string;
  status: string;
  created_at: string;
}

export interface MrpSuggestionQueryParams extends PaginationParams {
  plan_id?: string;
  suggestion_type?: string;
  status?: string;
}

export interface MrpCalculationResult {
  plan_id: string;
  total_items: number;
  total_suggestions: number;
  purchase_suggestions: number;
  production_suggestions: number;
  calculated_at: string;
  message?: string;
}

export interface MrpMaterialSummary {
  product_code: string;
  product_name: string;
  specification?: string;
  unit?: string;
  total_demand: number;
  total_supply: number;
  net_demand: number;
  safety_stock?: number;
  category?: string;
}

export interface MrpMaterialSummaryQueryParams {
  plan_id?: string;
  category?: string;
}

/**
 * 到货检验
 */
export interface IncomingInspection {
  id: string;
  inspection_no: string;
  notice_no?: string;
  supplier_id?: string;
  supplier_name?: string;
  order_id?: string;
  order_no?: string;
  warehouse?: string;
  inspection_date?: string;
  inspector?: string;
  status: string;
  total_quantity?: number;
  qualified_quantity?: number;
  unqualified_quantity?: number;
  inspection_result?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIncomingInspectionRequest {
  inspection_no: string;
  notice_no?: string;
  supplier_id?: string;
  order_id?: string;
  warehouse?: string;
  remarks?: string;
}

export interface UpdateIncomingInspectionRequest {
  supplier_id?: string;
  order_id?: string;
  warehouse?: string;
  inspection_date?: string;
  inspector?: string;
  status?: string;
  total_quantity?: number;
  qualified_quantity?: number;
  unqualified_quantity?: number;
  inspection_result?: string;
  remarks?: string;
}

export interface IncomingInspectionQueryParams extends PaginationParams {
  status?: string;
  supplier_id?: string;
}

export interface InspectionRecord {
  id: string;
  inspection_id: string;
  item_code?: string;
  item_name: string;
  specification?: string;
  unit?: string;
  batch_no?: string;
  quantity: number;
  sample_size?: number;
  inspection_items?: string;
  inspection_method?: string;
  inspection_standard?: string;
  result: string;
  defect_details?: string;
  created_at: string;
}

export interface CreateInspectionRecordRequest {
  inspection_id: string;
  item_code?: string;
  item_name: string;
  specification?: string;
  unit?: string;
  batch_no?: string;
  quantity: number;
  sample_size?: number;
  inspection_items?: string;
  inspection_method?: string;
  inspection_standard?: string;
  result: string;
  defect_details?: string;
}

export interface UpdateInspectionRecordRequest {
  item_code?: string;
  item_name?: string;
  specification?: string;
  unit?: string;
  batch_no?: string;
  quantity?: number;
  sample_size?: number;
  inspection_items?: string;
  inspection_method?: string;
  inspection_standard?: string;
  result?: string;
  defect_details?: string;
}

export interface InspectionDisposalRequest {
  inspection_id: string;
  disposal_type: string;
  disposal_quantity: number;
  remarks?: string;
}

/**
 * 库存周转分析
 */
export interface InventoryTurnoverStat {
  id: string;
  product_code: string;
  product_name: string;
  specification?: string;
  unit?: string;
  category?: string;
  period: string;
  turnover_rate: number;
  turnover_days: number;
  beginning_inventory?: number;
  ending_inventory?: number;
  average_inventory?: number;
  cost_of_goods_sold?: number;
  sales_quantity?: number;
  abc_category?: string;
  calculated_at: string;
}

export interface InventoryTurnoverQueryParams extends PaginationParams {
  period?: string;
  category?: string;
  abc_category?: string;
}

export interface AbcClassification {
  product_code: string;
  product_name: string;
  specification?: string;
  category: string;
  cumulative_value: number;
  cumulative_percentage: number;
  abc_level: string;
  annual_usage_value: number;
  percentage_of_total: number;
}

export interface AbcClassificationQueryParams {
  period?: string;
  category?: string;
}

export interface TurnoverTrendData {
  date: string;
  turnover_rate: number;
  turnover_days: number;
  average_inventory: number;
  sales_amount: number;
}

export interface TurnoverTrendQueryParams {
  product_code?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  granularity?: string;
}

/**
 * 供应链看板
 */
export interface SupplyChainOverview {
  total_suppliers: number;
  active_suppliers: number;
  total_purchase_orders: number;
  pending_orders: number;
  total_inventory_value: number;
  inventory_turnover_rate: number;
  on_time_delivery_rate: number;
  quality_pass_rate: number;
  pending_inspection_count: number;
  total_amount_month: number;
  order_completion_rate: number;
}

export interface SupplyChainFullLinkStat {
  procurement_cycle_avg: number;
  inspection_cycle_avg: number;
  inventory_cycle_avg: number;
  total_cycle_avg: number;
  bottleneck_stage?: string;
  improvement_suggestions?: string[];
}

export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  order_count: number;
  on_time_delivery_rate: number;
  quality_pass_rate: number;
  price_stability_score: number;
  service_score: number;
  overall_score: number;
  grade?: string;
  rank?: number;
}

export interface SupplierPerformanceQueryParams extends PaginationParams {
  period?: string;
  grade?: string;
}

/**
 * 价格比价
 */
export interface PriceComparison {
  id: string;
  comparison_no: string;
  title: string;
  product_code?: string;
  product_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  deadline?: string;
  status: string;
  result_supplier_id?: string;
  result_supplier_name?: string;
  result_price?: number;
  result_amount?: number;
  creator?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePriceComparisonRequest {
  comparison_no: string;
  title: string;
  product_code?: string;
  product_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  deadline?: string;
  supplier_ids?: string[];
}

export interface UpdatePriceComparisonRequest {
  title?: string;
  product_code?: string;
  product_name?: string;
  specification?: string;
  unit?: string;
  quantity?: number;
  deadline?: string;
  status?: string;
  result_supplier_id?: string;
  result_price?: number;
  result_amount?: number;
}

export interface PriceComparisonQueryParams extends PaginationParams {
  status?: string;
  product_code?: string;
}

export interface SupplierQuote {
  id: string;
  comparison_id: string;
  supplier_id: string;
  supplier_name: string;
  unit_price: number;
  total_amount: number;
  delivery_date?: string;
  payment_terms?: string;
  warranty_period?: string;
  quote_remarks?: string;
  quote_time?: string;
  status: string;
}

export interface CreateSupplierQuoteRequest {
  comparison_id: string;
  supplier_id: string;
  unit_price: number;
  total_amount: number;
  delivery_date?: string;
  payment_terms?: string;
  warranty_period?: string;
  quote_remarks?: string;
}

export interface PriceComparisonResult {
  comparison_id: string;
  total_quotes: number;
  lowest_price: number;
  highest_price: number;
  average_price: number;
  recommended_supplier_id?: string;
  recommended_supplier_name?: string;
  price_difference_percentage: number;
  quotes: SupplierQuote[];
}

/**
 * 数据同步
 */
export interface SyncRecord {
  id: string;
  sync_no: string;
  source_system: string;
  target_system: string;
  sync_type: string;
  sync_direction: string;
  status: string;
  total_count?: number;
  success_count?: number;
  failed_count?: number;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
  operator?: string;
  created_at: string;
}

export interface CreateSyncRecordRequest {
  source_system: string;
  target_system: string;
  sync_type: string;
  sync_direction: string;
}

export interface SyncRecordQueryParams extends PaginationParams {
  source_system?: string;
  target_system?: string;
  sync_type?: string;
  status?: string;
}

export interface SyncResult {
  sync_id: string;
  status: string;
  total_count: number;
  success_count: number;
  failed_count: number;
  message?: string;
  started_at: string;
  completed_at?: string;
}

export interface SyncDetailRecord {
  id: string;
  sync_id: string;
  record_id?: string;
  record_name?: string;
  status: string;
  error_message?: string;
  created_at: string;
}

/**
 * 审计日志
 */
export interface AuditLog {
  id: string;
  module: string;
  action: string;
  target_id?: string;
  target_name?: string;
  operator_id?: string;
  operator_name: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_url?: string;
  request_params?: string;
  old_value?: string;
  new_value?: string;
  status: string;
  error_message?: string;
  created_at: string;
}

export interface AuditLogQueryParams extends PaginationParams {
  module?: string;
  action?: string;
  operator_id?: string;
  target_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface AuditLogDetail {
  id: string;
  module: string;
  action: string;
  target_id?: string;
  target_name?: string;
  operator_id?: string;
  operator_name: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_url?: string;
  request_params?: Record<string, any>;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  status: string;
  error_message?: string;
  created_at: string;
  change_fields?: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
}

// ==================== Supplier API ====================

const supplierApi = {
  /**
   * 获取供应商列表
   */
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Supplier>>> => {
    return apiClient.scm.get('/api/scm/suppliers', { params });
  },

  /**
   * 创建供应商
   */
  create: async (data: CreateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.scm.post('/api/scm/suppliers', data);
  },

  /**
   * 获取供应商详情
   */
  get: async (id: string): Promise<ApiResponse<Supplier>> => {
    return apiClient.scm.get(`/api/scm/suppliers/${id}`);
  },

  /**
   * 更新供应商
   */
  update: async (id: string, data: UpdateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.scm.put(`/api/scm/suppliers/${id}`, data);
  },

  /**
   * 删除供应商
   */
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/suppliers/${id}`);
  },
};

// ==================== Purchase Order API ====================

const purchaseOrderApi = {
  /**
   * 获取采购订单列表
   */
  list: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<PurchaseOrder>>> => {
    return apiClient.scm.get('/api/scm/purchase-orders', { params });
  },

  /**
   * 创建采购订单
   */
  create: async (data: CreatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.post('/api/scm/purchase-orders', data);
  },

  /**
   * 获取采购订单详情
   */
  get: async (id: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.get(`/api/scm/purchase-orders/${id}`);
  },

  /**
   * 更新采购订单
   */
  update: async (
    id: string,
    data: UpdatePurchaseOrderRequest
  ): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.put(`/api/scm/purchase-orders/${id}`, data);
  },

  /**
   * 删除采购订单
   */
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/purchase-orders/${id}`);
  },

  /**
   * 审批采购订单
   */
  approve: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.post(`/api/scm/purchase-orders/${id}/approve`, { remarks });
  },

  /**
   * 确认采购订单
   */
  confirm: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.post(`/api/scm/purchase-orders/${id}/confirm`, { remarks });
  },

  /**
   * 取消采购订单
   */
  cancel: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.post(`/api/scm/purchase-orders/${id}/cancel`, { remarks });
  },

  /**
   * 关闭采购订单
   */
  close: async (id: string, remarks?: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.scm.post(`/api/scm/purchase-orders/${id}/close`, { remarks });
  },
};

// ==================== Purchase Item API ====================

const purchaseItemApi = {
  /**
   * 获取采购明细列表
   */
  list: async (
    params?: PurchaseItemQueryParams
  ): Promise<ApiResponse<PaginatedResponse<PurchaseItem>>> => {
    return apiClient.scm.get('/api/scm/purchase-items', { params });
  },

  /**
   * 创建采购明细
   */
  create: async (data: CreatePurchaseItemRequest): Promise<ApiResponse<PurchaseItem>> => {
    return apiClient.scm.post('/api/scm/purchase-items', data);
  },

  /**
   * 获取采购明细详情
   */
  get: async (id: string): Promise<ApiResponse<PurchaseItem>> => {
    return apiClient.scm.get(`/api/scm/purchase-items/${id}`);
  },

  /**
   * 更新采购明细
   */
  update: async (
    id: string,
    data: UpdatePurchaseItemRequest
  ): Promise<ApiResponse<PurchaseItem>> => {
    return apiClient.scm.put(`/api/scm/purchase-items/${id}`, data);
  },
};

// ==================== Supplier Evaluation API ====================

const supplierEvaluationApi = {
  /**
   * 获取供应商评估列表
   */
  list: async (
    params?: SupplierEvaluationQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SupplierEvaluation>>> => {
    return apiClient.scm.get('/api/scm/evaluations', { params });
  },

  /**
   * 创建供应商评估
   */
  create: async (
    data: CreateSupplierEvaluationRequest
  ): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.scm.post('/api/scm/evaluations', data);
  },

  /**
   * 获取供应商评估详情
   */
  get: async (id: string): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.scm.get(`/api/scm/evaluations/${id}`);
  },

  /**
   * 更新供应商评估
   */
  update: async (
    id: string,
    data: UpdateSupplierEvaluationRequest
  ): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.scm.put(`/api/scm/evaluations/${id}`, data);
  },

  /**
   * 删除供应商评估
   */
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/evaluations/${id}`);
  },
};

// ==================== MRP Plan API ====================

const mrpPlanApi = {
  /**
   * 获取 MRP 计划列表
   */
  list: async (
    params?: MrpPlanQueryParams
  ): Promise<ApiResponse<PaginatedResponse<MrpPlan>>> => {
    return apiClient.scm.get('/api/scm/mrp-plans', { params });
  },

  /**
   * 创建 MRP 计划
   */
  create: async (data: CreateMrpPlanRequest): Promise<ApiResponse<MrpPlan>> => {
    return apiClient.scm.post('/api/scm/mrp-plans', data);
  },

  /**
   * 获取 MRP 计划详情
   */
  get: async (id: string): Promise<ApiResponse<MrpPlan>> => {
    return apiClient.scm.get(`/api/scm/mrp-plans/${id}`);
  },

  /**
   * 更新 MRP 计划
   */
  update: async (
    id: string,
    data: UpdateMrpPlanRequest
  ): Promise<ApiResponse<MrpPlan>> => {
    return apiClient.scm.put(`/api/scm/mrp-plans/${id}`, data);
  },

  /**
   * 删除 MRP 计划
   */
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/mrp-plans/${id}`);
  },

  /**
   * 执行 MRP 计算
   */
  calculate: async (id: string): Promise<ApiResponse<MrpCalculationResult>> => {
    return apiClient.scm.post(`/api/scm/mrp-calculations/${id}`);
  },
};

// ==================== MRP Suggestion API ====================

const mrpSuggestionApi = {
  /**
   * 获取 MRP 建议列表
   */
  list: async (
    params?: MrpSuggestionQueryParams
  ): Promise<ApiResponse<PaginatedResponse<MrpSuggestion>>> => {
    return apiClient.scm.get('/api/scm/mrp-suggestions', { params });
  },

  /**
   * 获取 MRP 建议详情
   */
  get: async (id: string): Promise<ApiResponse<MrpSuggestion>> => {
    return apiClient.scm.get(`/api/scm/mrp-suggestions/${id}`);
  },

  /**
   * 物料需求汇总
   */
  summary: async (
    params?: MrpMaterialSummaryQueryParams
  ): Promise<ApiResponse<MrpMaterialSummary[]>> => {
    return apiClient.scm.get('/api/scm/mrp-suggestions/summary', { params });
  },
};

// ==================== Incoming Inspection API ====================

const incomingInspectionApi = {
  /**
   * 获取到货检验列表
   */
  list: async (
    params?: IncomingInspectionQueryParams
  ): Promise<ApiResponse<PaginatedResponse<IncomingInspection>>> => {
    return apiClient.scm.get('/api/scm/incoming-inspections', { params });
  },

  /**
   * 创建到货检验
   */
  create: async (
    data: CreateIncomingInspectionRequest
  ): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.post('/api/scm/incoming-inspections', data);
  },

  /**
   * 获取到货检验详情
   */
  get: async (id: string): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.get(`/api/scm/incoming-inspections/${id}`);
  },

  /**
   * 更新到货检验
   */
  update: async (
    id: string,
    data: UpdateIncomingInspectionRequest
  ): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.put(`/api/scm/incoming-inspections/${id}`, data);
  },

  /**
   * 删除到货检验
   */
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/incoming-inspections/${id}`);
  },

  /**
   * 合格处理
   */
  pass: async (id: string, remarks?: string): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.post(`/api/scm/incoming-inspections/${id}/pass`, { remarks });
  },

  /**
   * 不合格处理
   */
  reject: async (
    id: string,
    data: InspectionDisposalRequest
  ): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.post(`/api/scm/incoming-inspections/${id}/reject`, data);
  },
};

// ==================== Inspection Record API ====================

const inspectionRecordApi = {
  /**
   * 获取检验记录列表
   */
  list: async (
    inspectionId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<InspectionRecord>>> => {
    return apiClient.scm.get(`/api/scm/incoming-inspections/${inspectionId}/records`, { params });
  },

  /**
   * 创建检验记录
   */
  create: async (
    data: CreateInspectionRecordRequest
  ): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.scm.post('/api/scm/inspection-records', data);
  },

  /**
   * 获取检验记录详情
   */
  get: async (id: string): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.scm.get(`/api/scm/inspection-records/${id}`);
  },

  /**
   * 更新检验记录
   */
  update: async (
    id: string,
    data: UpdateInspectionRecordRequest
  ): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.scm.put(`/api/scm/inspection-records/${id}`, data);
  },

  /**
   * 删除检验记录
   */
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/inspection-records/${id}`);
  },
};

// ==================== Inventory Turnover API ====================

const inventoryTurnoverApi = {
  /**
   * 获取周转率统计
   */
  list: async (
    params?: InventoryTurnoverQueryParams
  ): Promise<ApiResponse<PaginatedResponse<InventoryTurnoverStat>>> => {
    return apiClient.scm.get('/api/scm/inventory-turnover', { params });
  },

  /**
   * 获取库存周转详情
   */
  get: async (id: string): Promise<ApiResponse<InventoryTurnoverStat>> => {
    return apiClient.scm.get(`/api/scm/inventory-turnover/${id}`);
  },

  /**
   * ABC 分类
   */
  abcClassification: async (
    params?: AbcClassificationQueryParams
  ): Promise<ApiResponse<AbcClassification[]>> => {
    return apiClient.scm.get('/api/scm/inventory-turnover/abc-classification', { params });
  },

  /**
   * 趋势分析
   */
  trend: async (params?: TurnoverTrendQueryParams): Promise<ApiResponse<TurnoverTrendData[]>> => {
    return apiClient.scm.get('/api/scm/inventory-turnover/trend', { params });
  },
};

// ==================== Supply Chain Dashboard API ====================

const supplyChainDashboardApi = {
  /**
   * 获取概览数据
   */
  overview: async (): Promise<ApiResponse<SupplyChainOverview>> => {
    return apiClient.scm.get('/api/scm/supply-chain-dashboard/overview');
  },

  /**
   * 获取全链路统计
   */
  fullLinkStats: async (): Promise<ApiResponse<SupplyChainFullLinkStat>> => {
    return apiClient.scm.get('/api/scm/supply-chain-dashboard/full-link-stats');
  },

  /**
   * 获取供应商绩效
   */
  supplierPerformance: async (
    params?: SupplierPerformanceQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SupplierPerformance>>> => {
    return apiClient.scm.get('/api/scm/supply-chain-dashboard/supplier-performance', { params });
  },
};

// ==================== Price Comparison API ====================

const priceComparisonApi = {
  /**
   * 获取比价单列表
   */
  list: async (
    params?: PriceComparisonQueryParams
  ): Promise<ApiResponse<PaginatedResponse<PriceComparison>>> => {
    return apiClient.scm.get('/api/scm/price-comparisons', { params });
  },

  /**
   * 创建比价单
   */
  create: async (
    data: CreatePriceComparisonRequest
  ): Promise<ApiResponse<PriceComparison>> => {
    return apiClient.scm.post('/api/scm/price-comparisons', data);
  },

  /**
   * 获取比价单详情
   */
  get: async (id: string): Promise<ApiResponse<PriceComparison>> => {
    return apiClient.scm.get(`/api/scm/price-comparisons/${id}`);
  },

  /**
   * 更新比价单
   */
  update: async (
    id: string,
    data: UpdatePriceComparisonRequest
  ): Promise<ApiResponse<PriceComparison>> => {
    return apiClient.scm.put(`/api/scm/price-comparisons/${id}`, data);
  },

  /**
   * 删除比价单
   */
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/price-comparisons/${id}`);
  },

  /**
   * 获取比价结果
   */
  result: async (id: string): Promise<ApiResponse<PriceComparisonResult>> => {
    return apiClient.scm.get(`/api/scm/price-comparisons/${id}/result`);
  },

  /**
   * 获取供应商报价列表
   */
  quotes: async (comparisonId: string): Promise<ApiResponse<SupplierQuote[]>> => {
    return apiClient.scm.get(`/api/scm/price-comparisons/${comparisonId}/quotes`);
  },

  /**
   * 创建供应商报价
   */
  createQuote: async (data: CreateSupplierQuoteRequest): Promise<ApiResponse<SupplierQuote>> => {
    return apiClient.scm.post('/api/scm/price-comparisons/quotes', data);
  },
};

// ==================== Sync Record API ====================

const syncRecordApi = {
  /**
   * 获取同步记录列表
   */
  list: async (
    params?: SyncRecordQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SyncRecord>>> => {
    return apiClient.scm.get('/api/scm/sync-records', { params });
  },

  /**
   * 创建同步记录
   */
  create: async (data: CreateSyncRecordRequest): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.scm.post('/api/scm/sync-records', data);
  },

  /**
   * 获取同步记录详情
   */
  get: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.scm.get(`/api/scm/sync-records/${id}`);
  },

  /**
   * 同步重试
   */
  retry: async (id: string): Promise<ApiResponse<SyncResult>> => {
    return apiClient.scm.post(`/api/scm/sync-records/${id}/retry`);
  },

  /**
   * 与 WMS 同步
   */
  syncWithWms: async (syncType: string): Promise<ApiResponse<SyncResult>> => {
    return apiClient.scm.post(`/api/scm/sync/wms/${syncType}`);
  },

  /**
   * 与 SRM 同步
   */
  syncWithSrm: async (syncType: string): Promise<ApiResponse<SyncResult>> => {
    return apiClient.scm.post(`/api/scm/sync/srm/${syncType}`);
  },

  /**
   * 获取同步详情记录
   */
  details: async (
    syncId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<SyncDetailRecord>>> => {
    return apiClient.scm.get(`/api/scm/sync-records/${syncId}/details`, { params });
  },
};

// ==================== Audit Log API ====================

const auditLogApi = {
  /**
   * 获取审计日志列表
   */
  list: async (
    params?: AuditLogQueryParams
  ): Promise<ApiResponse<PaginatedResponse<AuditLog>>> => {
    return apiClient.scm.get('/api/scm/audit-logs', { params });
  },

  /**
   * 获取审计日志详情
   */
  get: async (id: string): Promise<ApiResponse<AuditLogDetail>> => {
    return apiClient.scm.get(`/api/scm/audit-logs/${id}`);
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
  mrpPlans: mrpPlanApi,
  mrpSuggestions: mrpSuggestionApi,
  incomingInspections: incomingInspectionApi,
  inspectionRecords: inspectionRecordApi,
  inventoryTurnover: inventoryTurnoverApi,
  supplyChainDashboard: supplyChainDashboardApi,
  priceComparisons: priceComparisonApi,
  syncRecords: syncRecordApi,
  auditLogs: auditLogApi,

  /**
   * 健康检查
   */
  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.scm.get('/health');
  },
};
