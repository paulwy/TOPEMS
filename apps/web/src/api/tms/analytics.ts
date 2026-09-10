/**
 * TMS 分析聚合 API
 * 对接后端 /tms/analytics/* 路由
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

// ===== 类型定义 =====

export interface ShipmentTrendItem {
  date: string;
  count: number;
}

export interface VehicleRankingItem {
  vehicle_id: string;
  vehicle_no: string;
  shipment_count: number;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
  percentage: number;
}

// ===== API 函数 =====

/**
 * 获取运输趋势（最近7天）
 * GET /tms/analytics/shipment-trend
 */
export async function getShipmentTrend(): Promise<ApiResponse<ShipmentTrendItem[]>> {
  return apiClient.tms.get('/analytics/shipment-trend');
}

/**
 * 获取车辆运单排名
 * GET /tms/analytics/vehicle-ranking
 */
export async function getVehicleRanking(): Promise<ApiResponse<VehicleRankingItem[]>> {
  return apiClient.tms.get('/analytics/vehicle-ranking');
}

/**
 * 获取运单状态分布
 * GET /tms/analytics/status-distribution
 */
export async function getStatusDistribution(): Promise<ApiResponse<StatusDistributionItem[]>> {
  return apiClient.tms.get('/analytics/status-distribution');
}

// ===== 统一导出 =====

export const tmsAnalyticsApi = {
  getShipmentTrend,
  getVehicleRanking,
  getStatusDistribution,
};
