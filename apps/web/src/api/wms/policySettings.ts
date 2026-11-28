/**
 * WMS · 策略设置 API（设置页真实数据源）
 *
 * 后端: svc/wms/src/modules/policy_settings.rs
 * 路由:
 *   GET/PUT /wms/settings/inventory-threshold   → wms.inventory_alert_rules
 *   GET/PUT /wms/settings/cycle-count           → wms.cycle_count_configs
 *   GET/PUT /wms/settings/slotting              → wms.slotting_rules
 *   GET/PUT /wms/settings/picking-sequence      → wms.picking_policy（出库发货真消费）
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type WmsPolicyKey =
  | 'inventory-threshold'
  | 'cycle-count'
  | 'slotting'
  | 'picking-sequence';

export interface InventoryThresholdPolicy {
  rule_name: string;
  alert_type: string;
  threshold_value: number;
  severity: string;
  enabled: boolean;
  configured: boolean;
}

export interface CycleCountPolicy {
  count_frequency: string;
  priority_level: string;
  material_category: string | null;
  is_active: boolean;
  configured: boolean;
}

export interface SlottingPolicy {
  rule_type: string;
  priority: number;
  is_active: boolean;
  /** 租户是否已有仓库；false 时规则无法落库（warehouse_id 为必填） */
  warehouse_available: boolean;
  configured: boolean;
}

export interface PickingSequencePolicy {
  pick_strategy: 'expiry_first' | 'fifo' | 'lifo';
  configured: boolean;
}

export const wmsPolicyApi = {
  getInventoryThreshold: async (): Promise<ApiResponse<InventoryThresholdPolicy>> =>
    apiClient.wms.get('/settings/inventory-threshold'),

  updateInventoryThreshold: async (
    data: Partial<Omit<InventoryThresholdPolicy, 'configured'>>
  ): Promise<ApiResponse<InventoryThresholdPolicy>> =>
    apiClient.wms.put('/settings/inventory-threshold', data),

  getCycleCount: async (): Promise<ApiResponse<CycleCountPolicy>> =>
    apiClient.wms.get('/settings/cycle-count'),

  updateCycleCount: async (
    data: Partial<Omit<CycleCountPolicy, 'configured'>>
  ): Promise<ApiResponse<CycleCountPolicy>> =>
    apiClient.wms.put('/settings/cycle-count', data),

  getSlotting: async (): Promise<ApiResponse<SlottingPolicy>> =>
    apiClient.wms.get('/settings/slotting'),

  updateSlotting: async (
    data: Partial<Omit<SlottingPolicy, 'configured'>>
  ): Promise<ApiResponse<SlottingPolicy>> => apiClient.wms.put('/settings/slotting', data),

  getPickingSequence: async (): Promise<ApiResponse<PickingSequencePolicy>> =>
    apiClient.wms.get('/settings/picking-sequence'),

  updatePickingSequence: async (
    data: Partial<Omit<PickingSequencePolicy, 'configured'>>
  ): Promise<ApiResponse<PickingSequencePolicy>> =>
    apiClient.wms.put('/settings/picking-sequence', data),
};
