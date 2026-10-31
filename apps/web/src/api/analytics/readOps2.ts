import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 analytics 10 条（2026-10-29）──
export const analyticsReadOps2 = {
  getModuleAnalytics: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/analytics/{module_id}'),
  getSummaryAnalytics: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/analytics/summary'),
  getDevelopmentAnalytics: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/analytics/development'),
  getLaboratoryAnalytics: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/analytics/laboratory'),
  getSrmAnalytics: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/srm/summary'),
  getEhsAnalytics: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/ehs/summary'),
  getLimsSummary: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/lims/summary'),
  getQmsSummary: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/qms/summary'),
  getEhsIncidentTrend: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/ehs/incident-trend'),
  trendAnalysis: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.post('/prediction/trend', data ?? {}),
};
