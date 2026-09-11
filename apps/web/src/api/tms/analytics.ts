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

export interface CarrierPerformanceItem {
  carrier_id: string;
  carrier_name: string;
  total_shipments: number;
  completed_shipments: number;
  total_freight: number;
  avg_freight: number;
}

export interface RouteEfficiencyItem {
  route_id: string;
  route_name: string;
  distance_km: number;
  estimated_hours: number;
  total_trips: number;
  total_freight: number;
  cost_per_km: number;
}

export interface DriverPerformanceItem {
  driver_id: string;
  driver_name: string;
  total_deliveries: number;
  completed_deliveries: number;
  total_freight: number;
  avg_freight: number;
}

export interface ShipmentTrendEnhancedItem {
  month: string;
  total: number;
  delivered: number;
  cancelled: number;
  in_transit: number;
  pending: number;
}

export interface VehicleUtilizationItem {
  vehicle_id: string;
  vehicle_no: string;
  shipment_count: number;
  utilization_rate: number;
}

export interface FreightCostTrendItem {
  month: string;
  total_freight: number;
  shipment_count: number;
  avg_freight: number;
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

/**
 * 获取承运商绩效
 * GET /tms/analytics/carrier-performance
 */
export async function getCarrierPerformance(): Promise<ApiResponse<CarrierPerformanceItem[]>> {
  return apiClient.tms.get('/analytics/carrier-performance');
}

/**
 * 获取路线效率
 * GET /tms/analytics/route-efficiency
 */
export async function getRouteEfficiency(): Promise<ApiResponse<RouteEfficiencyItem[]>> {
  return apiClient.tms.get('/analytics/route-efficiency');
}

/**
 * 获取司机绩效
 * GET /tms/analytics/driver-performance
 */
export async function getDriverPerformance(): Promise<ApiResponse<DriverPerformanceItem[]>> {
  return apiClient.tms.get('/analytics/driver-performance');
}

/**
 * 获取运单趋势增强版（最近12个月，按状态分组）
 * GET /tms/analytics/shipment-trend-enhanced
 */
export async function getShipmentTrendEnhanced(): Promise<
  ApiResponse<ShipmentTrendEnhancedItem[]>
> {
  return apiClient.tms.get('/analytics/shipment-trend-enhanced');
}

/**
 * 获取车辆利用率
 * GET /tms/analytics/vehicle-utilization
 */
export async function getVehicleUtilization(): Promise<ApiResponse<VehicleUtilizationItem[]>> {
  return apiClient.tms.get('/analytics/vehicle-utilization');
}

/**
 * 获取运费成本趋势
 * GET /tms/analytics/freight-cost-trend
 */
export async function getFreightCostTrend(): Promise<ApiResponse<FreightCostTrendItem[]>> {
  return apiClient.tms.get('/analytics/freight-cost-trend');
}

// ===== 统一导出 =====

export const tmsAnalyticsApi = {
  getShipmentTrend,
  getVehicleRanking,
  getStatusDistribution,
  getCarrierPerformance,
  getRouteEfficiency,
  getDriverPerformance,
  getShipmentTrendEnhanced,
  getVehicleUtilization,
  getFreightCostTrend,
};
