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

// ===== 统一导出 =====

export const wmsAnalyticsApi = {
  getInventoryTurnover,
  getOrderFulfillment,
};
