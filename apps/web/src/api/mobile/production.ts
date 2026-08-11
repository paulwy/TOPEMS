/**
 * Mobile · 移动端生产/设备/工单 API 绑定
 *
 * 后端: svc/mobile/src/main.rs
 * 路由:
 *   GET    /mobile/production/orders
 *   GET    /mobile/production/orders/{id}
 *   POST   /mobile/production/orders/{id}/start
 *   POST   /mobile/production/orders/{id}/pause
 *   POST   /mobile/production/orders/{id}/complete
 *   GET    /mobile/production/work-reports
 *   POST   /mobile/production/work-reports
 *   GET    /mobile/production/equipment
 *   GET    /mobile/production/equipment/{id}
 *   PUT    /mobile/production/equipment/{id}/status
 *   GET    /mobile/production/stats
 *   GET    /mobile/production/workstations
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type ProductionOrderStatus = 'pending' | 'in_progress' | 'paused' | 'completed';
export type EquipmentStatus = 'running' | 'idle' | 'maintenance' | 'fault';

export interface ProductionOrder {
  id: string;
  orderNo: string;
  product_name: string;
  quantity: number;
  completed_quantity: number;
  status: ProductionOrderStatus;
  workstation: string;
  start_time?: string;
  end_time?: string;
  due_date: string;
  created_at: string;
}

export interface WorkReport {
  id: string;
  order_id: string;
  orderNo: string;
  workstation: string;
  operator: string;
  quantity: number;
  good_quantity: number;
  bad_quantity: number;
  start_time: string;
  end_time: string;
  duration: number;
  created_at: string;
}

export interface Equipment {
  id: string;
  equipment_no: string;
  name: string;
  type: string;
  status: EquipmentStatus;
  location: string;
  last_maintenance?: string;
  next_maintenance?: string;
  running_hours: number;
}

export interface Workstation {
  id: string;
  name: string;
  code: string;
  area: string;
  status: 'online' | 'offline' | 'maintenance';
  current_order?: string;
  operators: string[];
}

export interface ProductionStats {
  today_output: number;
  today_good_rate: number;
  active_orders: number;
  completed_orders_today: number;
  equipment_utilization: number;
  avg_cycle_time_minutes: number;
  by_workstation: Array<{
    workstation: string;
    output: number;
    utilization: number;
  }>;
}

export interface SubmitWorkReportRequest {
  order_id: string;
  quantity: number;
  good_quantity: number;
  bad_quantity: number;
  start_time: string;
  end_time: string;
  workstation?: string;
  remark?: string;
}

export const productionApi = {
  // ==================== 生产工单 ====================

  listOrders: async (params?: {
    status?: ProductionOrderStatus;
    workstation?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<ProductionOrder>>> => {
    return apiClient.mobile.get('/mobile/production/orders', { params });
  },

  getOrder: async (id: string): Promise<ApiResponse<ProductionOrder>> => {
    return apiClient.mobile.get(`/mobile/production/orders/${id}`);
  },

  startOrder: async (id: string): Promise<ApiResponse<ProductionOrder>> => {
    return apiClient.mobile.post(`/mobile/production/orders/${id}/start`);
  },

  pauseOrder: async (
    id: string,
    data?: { reason?: string }
  ): Promise<ApiResponse<ProductionOrder>> => {
    return apiClient.mobile.post(`/mobile/production/orders/${id}/pause`, data);
  },

  completeOrder: async (
    id: string,
    data?: { final_quantity?: number; remarks?: string }
  ): Promise<ApiResponse<ProductionOrder>> => {
    return apiClient.mobile.post(`/mobile/production/orders/${id}/complete`, data);
  },

  // ==================== 工作报工 ====================

  listWorkReports: async (params?: {
    order_id?: string;
    date?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<WorkReport>>> => {
    return apiClient.mobile.get('/mobile/production/work-reports', { params });
  },

  submitWorkReport: async (data: SubmitWorkReportRequest): Promise<ApiResponse<WorkReport>> => {
    return apiClient.mobile.post('/mobile/production/work-reports', data);
  },

  // ==================== 设备管理 ====================

  listEquipment: async (params?: {
    status?: EquipmentStatus;
    type?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Equipment>>> => {
    return apiClient.mobile.get('/mobile/production/equipment', { params });
  },

  getEquipment: async (id: string): Promise<ApiResponse<Equipment>> => {
    return apiClient.mobile.get(`/mobile/production/equipment/${id}`);
  },

  updateEquipmentStatus: async (
    id: string,
    status: EquipmentStatus,
    note?: string
  ): Promise<ApiResponse<Equipment>> => {
    return apiClient.mobile.put(`/mobile/production/equipment/${id}/status`, {
      status,
      note,
    });
  },

  // ==================== 工位管理 ====================

  listWorkstations: async (params?: {
    area?: string;
    status?: 'online' | 'offline' | 'maintenance';
  }): Promise<ApiResponse<Workstation[]>> => {
    return apiClient.mobile.get('/mobile/production/workstations', { params });
  },

  // ==================== 生产统计 ====================

  getProductionStats: async (params?: {
    period?: 'today' | 'week' | 'month';
  }): Promise<ApiResponse<ProductionStats>> => {
    return apiClient.mobile.get('/mobile/production/stats', { params });
  },
};

export default productionApi;
