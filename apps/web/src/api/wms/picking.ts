/**
 * WMS · 高级拣货 (Advanced Picking) API 绑定
 *
 * 后端: svc/wms/src/modules/picking.rs
 * 路由:
 *   GET    /picking/tasks
 *   POST   /picking/tasks
 *   GET    /picking/tasks/{id}
 *   POST   /picking/tasks/{id}/start
 *   POST   /picking/tasks/{id}/complete
 *   POST   /picking/tasks/{id}/cancel
 *   POST   /picking/tasks/{id}/assign
 *   GET    /picking/tasks/{id}/lines
 *   POST   /picking/tasks/{id}/lines/{line_id}/pick
 *   POST   /picking/tasks/{id}/lines/{line_id}/short-pick
 *   GET    /picking/lists
 *   POST   /picking/lists
 *   GET    /picking/lists/{id}
 *   POST   /picking/strategies
 *   GET    /picking/strategies
 *   GET    /picking/statistics
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type PickingTaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type PickingStrategy = 'order' | 'zone' | 'batch' | 'wave' | 'manual';
export type ShortPickReason = 'insufficient_stock' | 'damaged' | 'expired' | 'not_found';

export interface PickingTask {
  id: string;
  tenant_id: string;
  task_no: string;
  warehouse_id: string;
  warehouse_name?: string;
  strategy: PickingStrategy;
  status: PickingTaskStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to?: string;
  assigned_user_name?: string;
  batch_id?: string;
  start_time?: string;
  end_time?: string;
  total_lines: number;
  picked_lines: number;
  total_quantity: number;
  picked_quantity: number;
  short_picked_quantity: number;
  expected_duration?: number;
  zone?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface PickingTaskLine {
  id: string;
  task_id: string;
  outbound_order_id?: string;
  outbound_order_no?: string;
  material_id?: string;
  material_code: string;
  material_name: string;
  location_id: string;
  location_name: string;
  batch_no?: string;
  serial_no?: string;
  required_quantity: number;
  picked_quantity: number;
  short_picked_quantity: number;
  status: 'pending' | 'picked' | 'short_picked' | 'skipped';
  pick_sequence: number;
  remark?: string;
  picked_at?: string;
  picked_by?: string;
}

export interface PickingList {
  id: string;
  tenant_id: string;
  list_no: string;
  warehouse_id: string;
  strategy: PickingStrategy;
  task_ids: string[];
  total_tasks: number;
  total_lines: number;
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed';
  created_at: string;
}

export interface PickingStrategyConfig {
  id: string;
  tenant_id: string;
  name: string;
  strategy: PickingStrategy;
  warehouse_id: string;
  params: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface PickingStatistics {
  period: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  total_lines: number;
  picked_lines: number;
  short_picked_lines: number;
  avg_pick_time_per_line: number;
  avg_task_completion_time: number;
  short_pick_rate: number;
  by_strategy: Array<{ strategy: PickingStrategy; tasks: number; lines: number }>;
  by_warehouse: Array<{ warehouse_id: string; warehouse_name: string; tasks: number }>;
}

export interface CreatePickingTaskRequest {
  warehouse_id: string;
  outbound_order_ids: string[];
  strategy?: PickingStrategy;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  zone?: string;
  assign_to?: string;
  remark?: string;
}

export interface AssignPickingTaskRequest {
  assignee_id: string;
}

export interface PickLineRequest {
  picked_quantity: number;
  location_id?: string;
  serial_no?: string;
  remark?: string;
}

export interface ShortPickLineRequest {
  reason: ShortPickReason;
  short_picked_quantity?: number;
  remark?: string;
}

export interface CreatePickingListRequest {
  warehouse_id: string;
  strategy: PickingStrategy;
  outbound_order_ids: string[];
  name?: string;
}

export interface CreatePickingStrategyRequest {
  name: string;
  strategy: PickingStrategy;
  warehouse_id: string;
  params?: Record<string, unknown>;
  is_default?: boolean;
}

export const pickingApi = {
  listTasks: async (params?: {
    status?: PickingTaskStatus;
    strategy?: PickingStrategy;
    warehouse_id?: string;
    assigned_to?: string;
    priority?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: PickingTask[]; total: number }>> => {
    return apiClient.wms.get('/picking/tasks', { params });
  },

  getTask: async (id: string): Promise<ApiResponse<PickingTask>> => {
    return apiClient.wms.get(`/picking/tasks/${id}`);
  },

  createTask: async (data: CreatePickingTaskRequest): Promise<ApiResponse<PickingTask>> => {
    return apiClient.wms.post('/picking/tasks', data);
  },

  startTask: async (id: string): Promise<ApiResponse<PickingTask>> => {
    return apiClient.wms.post(`/picking/tasks/${id}/start`);
  },

  completeTask: async (
    id: string,
    data?: { remark?: string }
  ): Promise<ApiResponse<PickingTask>> => {
    return apiClient.wms.post(`/picking/tasks/${id}/complete`, data || {});
  },

  cancelTask: async (id: string, reason?: string): Promise<ApiResponse<PickingTask>> => {
    return apiClient.wms.post(`/picking/tasks/${id}/cancel`, { reason });
  },

  assignTask: async (
    id: string,
    data: AssignPickingTaskRequest
  ): Promise<ApiResponse<PickingTask>> => {
    return apiClient.wms.post(`/picking/tasks/${id}/assign`, data);
  },

  listTaskLines: async (taskId: string): Promise<ApiResponse<PickingTaskLine[]>> => {
    return apiClient.wms.get(`/picking/tasks/${taskId}/lines`);
  },

  pickLine: async (
    taskId: string,
    lineId: string,
    data: PickLineRequest
  ): Promise<ApiResponse<PickingTaskLine>> => {
    return apiClient.wms.post(`/picking/tasks/${taskId}/lines/${lineId}/pick`, data);
  },

  shortPickLine: async (
    taskId: string,
    lineId: string,
    data: ShortPickLineRequest
  ): Promise<ApiResponse<PickingTaskLine>> => {
    return apiClient.wms.post(`/picking/tasks/${taskId}/lines/${lineId}/short-pick`, data);
  },

  listLists: async (params?: {
    warehouse_id?: string;
    status?: 'draft' | 'confirmed' | 'in_progress' | 'completed';
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: PickingList[]; total: number }>> => {
    return apiClient.wms.get('/picking/lists', { params });
  },

  createList: async (data: CreatePickingListRequest): Promise<ApiResponse<PickingList>> => {
    return apiClient.wms.post('/picking/lists', data);
  },

  getList: async (id: string): Promise<ApiResponse<PickingList>> => {
    return apiClient.wms.get(`/picking/lists/${id}`);
  },

  createStrategy: async (
    data: CreatePickingStrategyRequest
  ): Promise<ApiResponse<PickingStrategyConfig>> => {
    return apiClient.wms.post('/picking/strategies', data);
  },

  listStrategies: async (warehouseId?: string): Promise<ApiResponse<PickingStrategyConfig[]>> => {
    return apiClient.wms.get('/picking/strategies', { params: { warehouse_id: warehouseId } });
  },

  getStatistics: async (params?: {
    period?: 'day' | 'week' | 'month';
    warehouse_id?: string;
  }): Promise<ApiResponse<PickingStatistics>> => {
    return apiClient.wms.get('/picking/statistics', { params });
  },
};

export default pickingApi;
