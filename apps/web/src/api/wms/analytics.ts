/**
 * WMS 分析聚合 API
 * 对接后端 /wms/analytics/* 路由
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { InventoryTurnoverData } from './types';

// ===== 类型定义 =====

export interface AnalyticsQueryParams {
  start_date?: string;
  end_date?: string;
  group_by?: 'month' | 'week' | 'day';
  warehouse_id?: string;
}

// 复用 types.ts 中的 InventoryTurnoverData
export type { InventoryTurnoverData };

export interface InventoryTurnoverSummary {
  total_turnover: number;
  avg_turnover: number;
  total_outbound: number;
  period_count: number;
}

export interface InventoryTurnoverResponse {
  data: InventoryTurnoverData[];
  summary: InventoryTurnoverSummary;
}

export interface WmsOrderFulfillmentData {
  period: string;
  total_orders: number;
  fulfilled_orders: number;
  fulfillment_rate: number;
  avg_fulfillment_days: number;
  on_time_orders: number;
  on_time_rate: number;
}

export interface WmsOrderFulfillmentSummary {
  total_orders: number;
  fulfilled_orders: number;
  fulfillment_rate: number;
  avg_fulfillment_days: number;
  on_time_rate: number;
}

export interface WmsOrderFulfillmentResponse {
  data: WmsOrderFulfillmentData[];
  summary: WmsOrderFulfillmentSummary;
}

// ===== 流量趋势 =====

export interface FlowTrendData {
  period: string;
  inbound_qty: number;
  outbound_qty: number;
  inbound_count: number;
  outbound_count: number;
}

export interface FlowTrendSummary {
  total_inbound_qty: number;
  total_outbound_qty: number;
  total_inbound_count: number;
  total_outbound_count: number;
  period_count: number;
}

export interface FlowTrendResponse {
  data: FlowTrendData[];
  summary: FlowTrendSummary;
}

// ===== ABC分析 =====

export interface AbcAnalysisData {
  category: string;
  material_count: number;
  total_value: number;
  value_percentage: number;
  count_percentage: number;
}

export interface AbcAnalysisResponse {
  data: AbcAnalysisData[];
  total_materials: number;
  total_value: number;
}

// ===== 库龄帕累托 =====

export interface AgeParetoData {
  age_bucket: string;
  material_count: number;
  total_value: number;
  cumulative_percentage: number;
}

export interface AgeParetoResponse {
  data: AgeParetoData[];
  total_materials: number;
  total_value: number;
}

// ===== 库位利用率 =====

export interface LocationUtilizationData {
  warehouse_id: string | null;
  warehouse_name: string;
  total_locations: number;
  used_locations: number;
  utilization_rate: number;
  avg_capacity_usage: number;
  dead_stock_locations: number;
}

export interface LocationUtilizationResponse {
  data: LocationUtilizationData[];
  total_locations: number;
  used_locations: number;
  overall_utilization: number;
}

// ===== API 方法 =====

/**
 * 获取库存周转率
 * GET /wms/analytics/inventory-turnover
 */
export async function getInventoryTurnover(
  params?: AnalyticsQueryParams
): Promise<ApiResponse<InventoryTurnoverResponse>> {
  return apiClient.wms.get('/analytics/inventory-turnover', { params });
}

/**
 * 获取订单履约率
 * GET /wms/analytics/order-fulfillment
 */
export async function getOrderFulfillment(
  params?: AnalyticsQueryParams
): Promise<ApiResponse<WmsOrderFulfillmentResponse>> {
  return apiClient.wms.get('/analytics/order-fulfillment', { params });
}

/**
 * 获取流量趋势
 * GET /wms/analytics/flow-trend
 */
export async function getFlowTrend(
  params?: AnalyticsQueryParams
): Promise<ApiResponse<FlowTrendResponse>> {
  return apiClient.wms.get('/analytics/flow-trend', { params });
}

/**
 * 获取ABC分析
 * GET /wms/analytics/abc-analysis
 */
export async function getAbcAnalysis(
  params?: AnalyticsQueryParams
): Promise<ApiResponse<AbcAnalysisResponse>> {
  return apiClient.wms.get('/analytics/abc-analysis', { params });
}

/**
 * 获取库龄帕累托
 * GET /wms/analytics/age-pareto
 */
export async function getAgePareto(
  params?: AnalyticsQueryParams
): Promise<ApiResponse<AgeParetoResponse>> {
  return apiClient.wms.get('/analytics/age-pareto', { params });
}

/**
 * 获取库位利用率
 * GET /wms/analytics/location-utilization
 */
export async function getLocationUtilization(
  params?: AnalyticsQueryParams
): Promise<ApiResponse<LocationUtilizationResponse>> {
  return apiClient.wms.get('/analytics/location-utilization', { params });
}

// ===== Dashboard 汇总 =====

export interface WmsDashboardSummary {
  warehouse_count: number;
  inventory_total: number;
  inventory_sku_count: number;
  inbound_today: number;
  outbound_today: number;
  alert_count: number;
  alert_critical: number;
  location_utilization: number;
}

/**
 * 获取Dashboard汇总数据
 * GET /wms/analytics/dashboard-summary
 */
export async function getDashboardSummary(): Promise<ApiResponse<WmsDashboardSummary>> {
  return apiClient.wms.get('/analytics/dashboard-summary');
}

// ===== 统一导出 =====

export const wmsAnalyticsApi = {
  getInventoryTurnover,
  getOrderFulfillment,
  getFlowTrend,
  getAbcAnalysis,
  getAgePareto,
  getLocationUtilization,
  getDashboardSummary,
};
