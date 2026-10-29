import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 mes 9 条（2026-10-29）──
export const mesReadApi = {
  getQualityTrend: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/kanban/quality-trend'),
  getDeliveryAnalytics: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/analytics/delivery-analytics'),
  getDeliveryAnalytics2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/analytics/delivery-analytics/{_id}'),
  getOeeDashboard: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/analytics/oee-dashboard/{_id}'),
  getQualityPareto: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/analytics/quality-pareto/{_id}'),
  getProductionLine: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/production-lines/{id}'),
  getOrderProgress: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/kanban/order-progress'),
  getOrderProgress2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/kanban/order-progress/{_id}'),
  getQualityTrend2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/kanban/quality-trend/{_id}'),
};
