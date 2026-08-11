/**
 * WMS · 库位优化 (Slotting) API 绑定
 *
 * 后端: svc/wms/src/modules/slotting.rs
 * 路由:
 *   POST   /slotting/optimize
 *   GET    /slotting/suggestions
 *   GET    /slotting/suggestions/{id}
 *   POST   /slotting/suggestions/{id}/apply
 *   POST   /slotting/suggestions/{id}/reject
 *   GET    /slotting/zones
 *   POST   /slotting/zones
 *   GET    /slotting/rules
 *   POST   /slotting/rules
 *   GET    /slotting/impact-analysis
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type SlottingStrategy = 'frequency' | 'velocity' | 'category' | 'manual';

export interface SlottingSuggestion {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  material_id: string;
  material_code: string;
  material_name: string;
  current_location_id?: string;
  suggested_location_id: string;
  suggested_location_name: string;
  reason: string;
  score: number;
  expected_improvement: number;
  status: 'pending' | 'applied' | 'rejected';
  created_at: string;
  applied_at?: string;
}

export interface SlottingZone {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  name: string;
  zone_type: 'fast_mover' | 'slow_mover' | 'bulk' | 'small_parts' | 'hazardous';
  location_ids: string[];
  is_active: boolean;
  created_at: string;
}

export interface SlottingRule {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  rule_type: 'velocity_class' | 'category_based' | 'capacity' | 'compatibility';
  priority: number;
  conditions: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  is_active: boolean;
  created_at: string;
}

export interface SlottingImpactAnalysis {
  current_pick_distance: number;
  optimized_pick_distance: number;
  distance_reduction_percent: number;
  current_slotting_score: number;
  optimized_slotting_score: number;
  affected_orders: number;
  affected_materials: number;
  implementation_cost_estimate: number;
}

export const slottingApi = {
  runOptimization: async (params?: {
    warehouse_id?: string;
    strategy?: SlottingStrategy;
    scope?: 'all' | 'zone' | 'category';
  }): Promise<
    ApiResponse<{
      task_id: string;
      suggestions_count: number;
    }>
  > => {
    return apiClient.wms.post('/slotting/optimize', undefined, { params });
  },

  listSuggestions: async (params?: {
    warehouse_id?: string;
    status?: 'pending' | 'applied' | 'rejected';
    page?: number;
    page_size?: number;
  }): Promise<
    ApiResponse<{
      items: SlottingSuggestion[];
      total: number;
    }>
  > => {
    return apiClient.wms.get('/slotting/suggestions', { params });
  },

  getSuggestion: async (id: string): Promise<ApiResponse<SlottingSuggestion>> => {
    return apiClient.wms.get(`/slotting/suggestions/${id}`);
  },

  applySuggestion: async (id: string): Promise<ApiResponse<SlottingSuggestion>> => {
    return apiClient.wms.post(`/slotting/suggestions/${id}/apply`);
  },

  rejectSuggestion: async (
    id: string,
    reason?: string
  ): Promise<ApiResponse<SlottingSuggestion>> => {
    return apiClient.wms.post(`/slotting/suggestions/${id}/reject`, { reason });
  },

  listZones: async (warehouseId?: string): Promise<ApiResponse<SlottingZone[]>> => {
    return apiClient.wms.get('/slotting/zones', { params: { warehouse_id: warehouseId } });
  },

  createZone: async (
    data: Omit<SlottingZone, 'id' | 'created_at'>
  ): Promise<ApiResponse<SlottingZone>> => {
    return apiClient.wms.post('/slotting/zones', data);
  },

  listRules: async (warehouseId?: string): Promise<ApiResponse<SlottingRule[]>> => {
    return apiClient.wms.get('/slotting/rules', { params: { warehouse_id: warehouseId } });
  },

  createRule: async (
    data: Omit<SlottingRule, 'id' | 'created_at'>
  ): Promise<ApiResponse<SlottingRule>> => {
    return apiClient.wms.post('/slotting/rules', data);
  },

  getImpactAnalysis: async (params?: {
    warehouse_id?: string;
  }): Promise<ApiResponse<SlottingImpactAnalysis>> => {
    return apiClient.wms.get('/slotting/impact-analysis', { params });
  },
};

export default slottingApi;
