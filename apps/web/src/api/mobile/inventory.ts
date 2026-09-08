/**
 * Mobile · 移动端库存/盘点/出入库 API 绑定
 *
 * 后端: svc/mobile/src/main.rs
 * 路由:
 *   GET    /mobile/inventory/items
 *   GET    /mobile/inventory/items/{id}
 *   POST   /mobile/inventory/items/{id}/adjust
 *   GET    /mobile/inventory/stocktake
 *   POST   /mobile/inventory/stocktake
 *   GET    /mobile/inventory/stocktake/{id}
 *   POST   /mobile/inventory/stocktake/{id}/records
 *   PUT    /mobile/inventory/stocktake/{id}/complete
 *   GET    /mobile/inventory/inbound
 *   POST   /mobile/inventory/inbound/{id}/confirm
 *   GET    /mobile/inventory/outbound
 *   POST   /mobile/inventory/outbound/{id}/confirm
 *   GET    /mobile/inventory/transfer
 *   POST   /mobile/inventory/transfer/{id}/confirm
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type InventoryStatus = 'normal' | 'low_stock' | 'out_of_stock' | 'frozen';
export type StocktakeStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type InventoryMovementType = 'inbound' | 'outbound' | 'transfer' | 'adjust';
export type InventoryMovementStatus =
  'pending' | 'in_progress' | 'confirmed' | 'completed' | 'cancelled';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  batch_no?: string;
  expiry_date?: string;
  status: InventoryStatus;
  last_updated: string;
}

export interface StocktakeTask {
  id: string;
  title: string;
  warehouse: string;
  status: StocktakeStatus;
  total_items: number;
  counted_items: number;
  assignee: string;
  due_date: string;
  created_at: string;
}

export interface StocktakeRecord {
  id: string;
  task_id: string;
  item_id: string;
  item_name: string;
  sku: string;
  system_quantity: number;
  actual_quantity: number;
  difference: number;
  status: 'normal' | 'surplus' | 'shortage';
  counted_by: string;
  counted_at: string;
}

export interface InboundOrder {
  id: string;
  orderNo: string;
  supplier: string;
  type: 'purchase' | 'return' | 'transfer';
  status: InventoryMovementStatus;
  total_items: number;
  total_quantity: number;
  expected_date: string;
  confirmed_at?: string;
  created_at: string;
}

export interface OutboundOrder {
  id: string;
  orderNo: string;
  customer: string;
  type: 'sales' | 'transfer' | 'return';
  status: InventoryMovementStatus;
  total_items: number;
  total_quantity: number;
  expected_date: string;
  confirmed_at?: string;
  created_at: string;
}

export interface TransferOrder {
  id: string;
  orderNo: string;
  from_warehouse: string;
  to_warehouse: string;
  status: InventoryMovementStatus;
  total_items: number;
  total_quantity: number;
  requested_date: string;
  confirmed_at?: string;
  created_at: string;
}

export interface InventoryAdjustRequest {
  reason: string;
  quantity_change: number;
  reference?: string;
}

export interface CreateStocktakeRequest {
  title: string;
  warehouse: string;
  item_ids?: string[];
  due_date?: string;
}

export interface StocktakeRecordInput {
  item_id: string;
  actual_quantity: number;
  note?: string;
}

export const inventoryApi = {
  // ==================== 库存查询 ====================

  listItems: async (params?: {
    keyword?: string;
    category?: string;
    status?: InventoryStatus;
    location?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<InventoryItem>>> => {
    return apiClient.mobile.get('inventory/items', { params });
  },

  getItem: async (id: string): Promise<ApiResponse<InventoryItem>> => {
    return apiClient.mobile.get(`inventory/items/${id}`);
  },

  adjustItem: async (
    id: string,
    data: InventoryAdjustRequest
  ): Promise<ApiResponse<InventoryItem>> => {
    return apiClient.mobile.post(`inventory/items/${id}/adjust`, data);
  },

  // ==================== 盘点管理 ====================

  listStocktakeTasks: async (params?: {
    status?: StocktakeStatus;
    warehouse?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<StocktakeTask>>> => {
    return apiClient.mobile.get('inventory/stocktake', { params });
  },

  createStocktakeTask: async (
    data: CreateStocktakeRequest
  ): Promise<ApiResponse<StocktakeTask>> => {
    return apiClient.mobile.post('inventory/stocktake', data);
  },

  getStocktakeTask: async (id: string): Promise<ApiResponse<StocktakeTask>> => {
    return apiClient.mobile.get(`inventory/stocktake/${id}`);
  },

  submitStocktakeRecord: async (
    taskId: string,
    data: StocktakeRecordInput
  ): Promise<ApiResponse<StocktakeRecord>> => {
    return apiClient.mobile.post(`inventory/stocktake/${taskId}/records`, data);
  },

  completeStocktakeTask: async (
    id: string,
    data?: { remarks?: string }
  ): Promise<ApiResponse<StocktakeTask>> => {
    return apiClient.mobile.put(`inventory/stocktake/${id}/complete`, data);
  },

  // ==================== 入库管理 ====================

  listInboundOrders: async (params?: {
    status?: InventoryMovementStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<InboundOrder>>> => {
    return apiClient.mobile.get('inventory/inbound', { params });
  },

  confirmInboundOrder: async (
    id: string,
    data?: { received_quantity?: number; remarks?: string }
  ): Promise<ApiResponse<InboundOrder>> => {
    return apiClient.mobile.post(`inventory/inbound/${id}/confirm`, data);
  },

  // ==================== 出库管理 ====================

  listOutboundOrders: async (params?: {
    status?: InventoryMovementStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<OutboundOrder>>> => {
    return apiClient.mobile.get('inventory/outbound', { params });
  },

  confirmOutboundOrder: async (
    id: string,
    data?: { shipped_quantity?: number; remarks?: string }
  ): Promise<ApiResponse<OutboundOrder>> => {
    return apiClient.mobile.post(`inventory/outbound/${id}/confirm`, data);
  },

  // ==================== 调拨管理 ====================

  listTransferOrders: async (params?: {
    status?: InventoryMovementStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<TransferOrder>>> => {
    return apiClient.mobile.get('inventory/transfer', { params });
  },

  confirmTransferOrder: async (
    id: string,
    data?: { remarks?: string }
  ): Promise<ApiResponse<TransferOrder>> => {
    return apiClient.mobile.post(`inventory/transfer/${id}/confirm`, data);
  },
};

export default inventoryApi;
