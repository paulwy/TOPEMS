/**
 * WMS · 高级上架 (Advanced Putaway) API 绑定
 *
 * 后端: svc/wms/src/modules/putaway.rs
 * 路由:
 *   GET    /putaway/plans
 *   POST   /putaway/plans
 *   GET    /putaway/plans/{id}
 *   POST   /putaway/plans/{id}/execute
 *   POST   /putaway/plans/{id}/cancel
 *   GET    /putaway/plans/{id}/items
 *   POST   /putaway/plans/{id}/items/{item_id}/confirm
 *   POST   /putaway/plans/{id}/items/{item_id}/reject
 *   GET    /putaway/suggestions
 *   POST   /putaway/suggestions/{id}/accept
 *   POST   /putaway/suggestions/{id}/reject
 *   GET    /putaway/rules
 *   POST   /putaway/rules
 *   GET    /putaway/statistics
 *   GET    /putaway/tasks
 *   POST   /putaway/tasks
 *   POST   /putaway/tasks/{id}/start
 *   POST   /putaway/tasks/{id}/complete
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type PutawayPlanStatus = 'pending' | 'executing' | 'completed' | 'cancelled';
export type PutawayStrategy = 'direct' | 'guided' | 'optimized' | 'manual';
export type PutawayTaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface PutawayPlan {
  id: string;
  tenant_id: string;
  plan_no: string;
  warehouse_id: string;
  warehouse_name?: string;
  strategy: PutawayStrategy;
  status: PutawayPlanStatus;
  source_type: 'inbound' | 'transfer' | 'adjustment' | 'return';
  source_id?: string;
  source_no?: string;
  total_items: number;
  completed_items: number;
  total_quantity: number;
  completed_quantity: number;
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface PutawayPlanItem {
  id: string;
  plan_id: string;
  material_id?: string;
  material_code: string;
  material_name: string;
  batch_no?: string;
  serial_no?: string;
  quantity: number;
  location_id: string;
  location_name: string;
  zone?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  suggested_location_id?: string;
  suggested_location_name?: string;
  remark?: string;
  confirmed_at?: string;
  confirmed_by?: string;
}

export interface PutawaySuggestion {
  id: string;
  tenant_id: string;
  material_id?: string;
  material_code: string;
  material_name: string;
  batch_no?: string;
  quantity: number;
  from_location_id?: string;
  from_location_name?: string;
  suggested_location_id: string;
  suggested_location_name: string;
  suggested_zone?: string;
  reason: string;
  score: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface PutawayRule {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  rule_type: 'zone_based' | 'capacity_based' | 'category_based' | 'fifo' | 'manual';
  priority: number;
  conditions: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  is_active: boolean;
  created_at: string;
}

export interface PutawayTask {
  id: string;
  tenant_id: string;
  task_no: string;
  plan_id: string;
  plan_no: string;
  warehouse_id: string;
  status: PutawayTaskStatus;
  assigned_to?: string;
  assigned_user_name?: string;
  total_items: number;
  completed_items: number;
  start_time?: string;
  end_time?: string;
  created_at: string;
}

export interface PutawayStatistics {
  period: string;
  total_plans: number;
  completed_plans: number;
  total_items: number;
  putaway_items: number;
  avg_putaway_time: number;
  by_strategy: Array<{ strategy: PutawayStrategy; plans: number; items: number }>;
  by_zone: Array<{ zone: string; items: number; avg_time: number }>;
}

export interface CreatePutawayPlanRequest {
  warehouse_id: string;
  strategy?: PutawayStrategy;
  source_type?: 'inbound' | 'transfer' | 'adjustment' | 'return';
  source_ids?: string[];
  material_ids?: string[];
  auto_execute?: boolean;
}

export interface ExecutePutawayPlanRequest {
  assign_to?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface ConfirmPutawayItemRequest {
  actual_location_id?: string;
  actual_quantity?: number;
  remark?: string;
}

export interface CreatePutawayRuleRequest {
  rule_type: PutawayRule['rule_type'];
  warehouse_id: string;
  conditions?: Array<Record<string, unknown>>;
  actions?: Array<Record<string, unknown>>;
  priority?: number;
}

export interface CreatePutawayTaskRequest {
  plan_id: string;
  assign_to?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export const putawayApi = {
  listPlans: async (params?: {
    status?: PutawayPlanStatus;
    strategy?: PutawayStrategy;
    warehouse_id?: string;
    source_type?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: PutawayPlan[]; total: number }>> => {
    return apiClient.wms.get('/putaway/plans', { params });
  },

  getPlan: async (id: string): Promise<ApiResponse<PutawayPlan>> => {
    return apiClient.wms.get(`/putaway/plans/${id}`);
  },

  createPlan: async (data: CreatePutawayPlanRequest): Promise<ApiResponse<PutawayPlan>> => {
    return apiClient.wms.post('/putaway/plans', data);
  },

  executePlan: async (
    id: string,
    data?: ExecutePutawayPlanRequest
  ): Promise<ApiResponse<PutawayPlan>> => {
    return apiClient.wms.post(`/putaway/plans/${id}/execute`, data || {});
  },

  cancelPlan: async (id: string, reason?: string): Promise<ApiResponse<PutawayPlan>> => {
    return apiClient.wms.post(`/putaway/plans/${id}/cancel`, { reason });
  },

  listPlanItems: async (planId: string): Promise<ApiResponse<PutawayPlanItem[]>> => {
    return apiClient.wms.get(`/putaway/plans/${planId}/items`);
  },

  confirmPlanItem: async (
    planId: string,
    itemId: string,
    data: ConfirmPutawayItemRequest
  ): Promise<ApiResponse<PutawayPlanItem>> => {
    return apiClient.wms.post(`/putaway/plans/${planId}/items/${itemId}/confirm`, data);
  },

  rejectPlanItem: async (
    planId: string,
    itemId: string,
    reason?: string
  ): Promise<ApiResponse<PutawayPlanItem>> => {
    return apiClient.wms.post(`/putaway/plans/${planId}/items/${itemId}/reject`, { reason });
  },

  listSuggestions: async (params?: {
    warehouse_id?: string;
    material_id?: string;
    status?: 'pending' | 'accepted' | 'rejected';
  }): Promise<ApiResponse<PutawaySuggestion[]>> => {
    return apiClient.wms.get('/putaway/suggestions', { params });
  },

  acceptSuggestion: async (id: string): Promise<ApiResponse<PutawaySuggestion>> => {
    return apiClient.wms.post(`/putaway/suggestions/${id}/accept`);
  },

  rejectSuggestion: async (
    id: string,
    reason?: string
  ): Promise<ApiResponse<PutawaySuggestion>> => {
    return apiClient.wms.post(`/putaway/suggestions/${id}/reject`, { reason });
  },

  listRules: async (warehouseId?: string): Promise<ApiResponse<PutawayRule[]>> => {
    return apiClient.wms.get('/putaway/rules', { params: { warehouse_id: warehouseId } });
  },

  createRule: async (data: CreatePutawayRuleRequest): Promise<ApiResponse<PutawayRule>> => {
    return apiClient.wms.post('/putaway/rules', data);
  },

  getStatistics: async (params?: {
    period?: 'day' | 'week' | 'month';
    warehouse_id?: string;
  }): Promise<ApiResponse<PutawayStatistics>> => {
    return apiClient.wms.get('/putaway/statistics', { params });
  },

  listTasks: async (params?: {
    status?: PutawayTaskStatus;
    warehouse_id?: string;
    assigned_to?: string;
  }): Promise<ApiResponse<PutawayTask[]>> => {
    return apiClient.wms.get('/putaway/tasks', { params });
  },

  createTask: async (data: CreatePutawayTaskRequest): Promise<ApiResponse<PutawayTask>> => {
    return apiClient.wms.post('/putaway/tasks', data);
  },

  startTask: async (id: string): Promise<ApiResponse<PutawayTask>> => {
    return apiClient.wms.post(`/putaway/tasks/${id}/start`);
  },

  completeTask: async (
    id: string,
    data?: { completed_items?: number; remark?: string }
  ): Promise<ApiResponse<PutawayTask>> => {
    return apiClient.wms.post(`/putaway/tasks/${id}/complete`, data || {});
  },
};

export default putawayApi;
