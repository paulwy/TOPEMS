/**
 * WMS · 组装与拆箱 (Kitting) API 绑定
 *
 * 后端: svc/wms/src/modules/kitting.rs
 * 路由:
 *   GET    /kitting/orders
 *   POST   /kitting/orders
 *   GET    /kitting/orders/{id}
 *   POST   /kitting/orders/{id}/start
 *   POST   /kitting/orders/{id}/complete
 *   POST   /kitting/orders/{id}/cancel
 *   GET    /kitting/boms
 *   POST   /kitting/boms
 *   GET    /kitting/boms/{id}
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type KittingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface KittingOrder {
  id: string;
  tenant_id: string;
  order_no: string;
  bom_id: string;
  bom_code: string;
  warehouse_id: string;
  location_id?: string;
  status: KittingStatus;
  quantity: number;
  completed_quantity: number;
  components: Array<{
    component_id: string;
    component_code: string;
    component_name: string;
    required_qty: number;
    picked_qty: number;
    remaining_qty: number;
  }>;
  assignee_id?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
}

export interface BillOfMaterials {
  id: string;
  tenant_id: string;
  bom_code: string;
  product_id: string;
  product_code: string;
  product_name: string;
  version: string;
  components: Array<{
    component_id: string;
    component_code: string;
    component_name: string;
    quantity: number;
    unit: string;
  }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateKittingOrderRequest {
  bom_id: string;
  warehouse_id: string;
  location_id?: string;
  quantity: number;
  assignee_id?: string;
  notes?: string;
}

export const kittingApi = {
  listOrders: async (params?: {
    status?: KittingStatus;
    warehouse_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: KittingOrder[]; total: number }>> => {
    return apiClient.wms.get('/kitting/orders', { params });
  },

  getOrder: async (id: string): Promise<ApiResponse<KittingOrder>> => {
    return apiClient.wms.get(`/kitting/orders/${id}`);
  },

  createOrder: async (data: CreateKittingOrderRequest): Promise<ApiResponse<KittingOrder>> => {
    return apiClient.wms.post('/kitting/orders', data);
  },

  startOrder: async (id: string): Promise<ApiResponse<KittingOrder>> => {
    return apiClient.wms.post(`/kitting/orders/${id}/start`);
  },

  completeOrder: async (
    id: string,
    data?: { completed_components?: Array<{ component_id: string; picked_qty: number }> }
  ): Promise<ApiResponse<KittingOrder>> => {
    return apiClient.wms.post(`/kitting/orders/${id}/complete`, data || {});
  },

  cancelOrder: async (id: string, reason?: string): Promise<ApiResponse<KittingOrder>> => {
    return apiClient.wms.post(`/kitting/orders/${id}/cancel`, { reason });
  },

  listBoms: async (params?: {
    product_id?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<BillOfMaterials[]>> => {
    return apiClient.wms.get('/kitting/boms', { params });
  },

  createBom: async (
    data: Omit<BillOfMaterials, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<BillOfMaterials>> => {
    return apiClient.wms.post('/kitting/boms', data);
  },

  getBom: async (id: string): Promise<ApiResponse<BillOfMaterials>> => {
    return apiClient.wms.get(`/kitting/boms/${id}`);
  },
};

export default kittingApi;
