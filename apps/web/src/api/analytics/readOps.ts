import apiClient from '../client';
import type { ApiResponse } from '../client';
// 2026-11-26：此文件是 v74「端点绑定」占位（页面未接入）。动作型接口按后端实际方法对齐为 POST，
// 之前用 GET 只会拿到 405。详见 docs/dev/api-contract-audit-20261126.md

// ── v74 BIZ 接入候选 analytics 14 条（2026-10-29）──
export const analyticsReadApi = {
  validatePermission: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.post('/permission/validate', data ?? {}),
  filterData: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.post('/permission/filter', data ?? {}),
  getQualityAnalytics: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/analytics/quality'),
  getProductionAnalytics: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/analytics/production'),
  getLimsSampleTimeline: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/lims/sample-timeline'),
  getQmsQualityTrend: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/qms/quality-trend'),
  getSrmSupplierRanking: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/srm/supplier-ranking'),
  getSrmOrderTimeline: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/srm/order-timeline'),
  queryDashboardRealtimeData: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/dashboard/{id}/realtime'),
  exponentialSmoothingForecast: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.post('/prediction/exponential-smoothing', data ?? {}),
  predictionComparison: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.post('/prediction/compare', data ?? {}),
  listPermissionRules: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/permission/rule'),
  getPermissionRule: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/permission/rule/{id}'),
  getUserPermissions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/permission/user/{user_id}'),
};
