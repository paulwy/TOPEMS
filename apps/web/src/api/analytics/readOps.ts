import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 analytics 14 条（2026-10-29）──
export const analyticsReadApi = {
  validatePermission: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/permission/validate'),
  filterData: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/permission/filter'),
  getQualityAnalytics: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/analytics/quality'),
  getProductionAnalytics: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/analytics/production'),
  getLimsSampleTimeline: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/api/bi/lims/sample-timeline'),
  getQmsQualityTrend: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/api/bi/qms/quality-trend'),
  getSrmSupplierRanking: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/api/bi/srm/supplier-ranking'),
  getSrmOrderTimeline: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/api/bi/srm/order-timeline'),
  queryDashboardRealtimeData: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/dashboard/{id}/realtime'),
  exponentialSmoothingForecast: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.post('/prediction/exponential-smoothing', data ?? {}),
  predictionComparison: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.post('/prediction/compare', data ?? {}),
  listPermissionRules: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/permission/rule'),
  getPermissionRule: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/permission/rule/{id}'),
  getUserPermissions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/permission/user/{user_id}'),
};