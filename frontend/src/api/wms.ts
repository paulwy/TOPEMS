/**
 * WMS (Warehouse Management System) API Client
 * 仓储管理 API 客户端
 */

import { apiClient, ApiResponse } from './client';

// ==================== Types ====================

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * 仓库
 */
export interface Warehouse {
  id: string;
  name: string;
  code?: string;
  address?: string;
  manager?: string;
  phone?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWarehouseRequest {
  name: string;
  code?: string;
  address?: string;
  manager?: string;
  phone?: string;
}

export interface UpdateWarehouseRequest {
  name?: string;
  code?: string;
  address?: string;
  manager?: string;
  phone?: string;
  status?: string;
}

/**
 * 库存项
 */
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  location_id?: string;
  warehouse_id?: string;
  min_quantity?: number;
  max_quantity?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemRequest {
  sku: string;
  name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  location_id?: string;
  warehouse_id?: string;
  min_quantity?: number;
  max_quantity?: number;
}

export interface UpdateInventoryItemRequest {
  sku?: string;
  name?: string;
  specification?: string;
  unit?: string;
  quantity?: number;
  location_id?: string;
  warehouse_id?: string;
  min_quantity?: number;
  max_quantity?: number;
  status?: string;
}

export interface InventoryQueryParams extends PaginationParams {
  warehouse_id?: string;
}

/**
 * 入库订单
 */
export interface InboundOrder {
  id: string;
  order_number: string;
  warehouse_id?: string;
  supplier_id?: string;
  order_date: string;
  expected_arrival?: string;
  actual_arrival?: string;
  total_amount?: number;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInboundOrderRequest {
  order_number: string;
  warehouse_id?: string;
  supplier_id?: string;
  order_date: string;
  expected_arrival?: string;
  total_amount?: number;
  remarks?: string;
}

export interface UpdateInboundOrderRequest {
  warehouse_id?: string;
  supplier_id?: string;
  expected_arrival?: string;
  actual_arrival?: string;
  total_amount?: number;
  status?: string;
  remarks?: string;
}

/**
 * 出库订单
 */
export interface OutboundOrder {
  id: string;
  order_number: string;
  warehouse_id?: string;
  customer_id?: string;
  order_date: string;
  expected_delivery?: string;
  actual_delivery?: string;
  total_amount?: number;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOutboundOrderRequest {
  order_number: string;
  warehouse_id?: string;
  customer_id?: string;
  order_date: string;
  expected_delivery?: string;
  total_amount?: number;
  remarks?: string;
}

export interface UpdateOutboundOrderRequest {
  warehouse_id?: string;
  customer_id?: string;
  expected_delivery?: string;
  actual_delivery?: string;
  total_amount?: number;
  status?: string;
  remarks?: string;
}

// ==================== Warehouse API ====================

const warehouseApi = {
  /**
   * 获取仓库列表
   */
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Warehouse>>> => {
    return apiClient.wms.get('/api/v1/warehouses', { params });
  },

  /**
   * 创建仓库
   */
  create: async (data: CreateWarehouseRequest): Promise<ApiResponse<Warehouse>> => {
    return apiClient.wms.post('/api/v1/warehouses', data);
  },

  /**
   * 获取仓库详情
   */
  get: async (id: string): Promise<ApiResponse<Warehouse>> => {
    return apiClient.wms.get(`/api/v1/warehouses/${id}`);
  },

  /**
   * 更新仓库
   */
  update: async (id: string, data: UpdateWarehouseRequest): Promise<ApiResponse<Warehouse>> => {
    return apiClient.wms.put(`/api/v1/warehouses/${id}`, data);
  },

  /**
   * 删除仓库
   */
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/api/v1/warehouses/${id}`);
  },
};

// ==================== Inventory API ====================

const inventoryApi = {
  /**
   * 获取库存列表
   */
  list: async (params?: InventoryQueryParams): Promise<ApiResponse<PaginatedResponse<InventoryItem>>> => {
    return apiClient.wms.get('/api/v1/inventory', { params });
  },

  /**
   * 创建库存项
   */
  create: async (data: CreateInventoryItemRequest): Promise<ApiResponse<InventoryItem>> => {
    return apiClient.wms.post('/api/v1/inventory', data);
  },

  /**
   * 获取库存项详情
   */
  get: async (id: string): Promise<ApiResponse<InventoryItem>> => {
    return apiClient.wms.get(`/api/v1/inventory/${id}`);
  },

  /**
   * 更新库存项
   */
  update: async (id: string, data: UpdateInventoryItemRequest): Promise<ApiResponse<InventoryItem>> => {
    return apiClient.wms.put(`/api/v1/inventory/${id}`, data);
  },

  /**
   * 删除库存项
   */
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/api/v1/inventory/${id}`);
  },
};

// ==================== Inbound Order API ====================

const inboundOrderApi = {
  /**
   * 获取入库订单列表
   */
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<InboundOrder>>> => {
    return apiClient.wms.get('/api/v1/inbound-orders', { params });
  },

  /**
   * 创建入库订单
   */
  create: async (data: CreateInboundOrderRequest): Promise<ApiResponse<InboundOrder>> => {
    return apiClient.wms.post('/api/v1/inbound-orders', data);
  },

  /**
   * 获取入库订单详情
   */
  get: async (id: string): Promise<ApiResponse<InboundOrder>> => {
    return apiClient.wms.get(`/api/v1/inbound-orders/${id}`);
  },

  /**
   * 更新入库订单
   */
  update: async (id: string, data: UpdateInboundOrderRequest): Promise<ApiResponse<InboundOrder>> => {
    return apiClient.wms.put(`/api/v1/inbound-orders/${id}`, data);
  },

  /**
   * 删除入库订单
   */
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/api/v1/inbound-orders/${id}`);
  },
};

// ==================== Outbound Order API ====================

const outboundOrderApi = {
  /**
   * 获取出库订单列表
   */
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<OutboundOrder>>> => {
    return apiClient.wms.get('/api/v1/outbound-orders', { params });
  },

  /**
   * 创建出库订单
   */
  create: async (data: CreateOutboundOrderRequest): Promise<ApiResponse<OutboundOrder>> => {
    return apiClient.wms.post('/api/v1/outbound-orders', data);
  },

  /**
   * 获取出库订单详情
   */
  get: async (id: string): Promise<ApiResponse<OutboundOrder>> => {
    return apiClient.wms.get(`/api/v1/outbound-orders/${id}`);
  },

  /**
   * 更新出库订单
   */
  update: async (id: string, data: UpdateOutboundOrderRequest): Promise<ApiResponse<OutboundOrder>> => {
    return apiClient.wms.put(`/api/v1/outbound-orders/${id}`, data);
  },

  /**
   * 删除出库订单
   */
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/api/v1/outbound-orders/${id}`);
  },
};

// ==================== WMS API Export ====================

/**
 * WMS API 统一导出
 */
export const wmsApi = {
  warehouses: warehouseApi,
  inventory: inventoryApi,
  inboundOrders: inboundOrderApi,
  outboundOrders: outboundOrderApi,
  
  /**
   * 健康检查
   */
  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.wms.get('/health');
  },
};