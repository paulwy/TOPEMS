import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（analytics 写端点补绑，2026-10-29）──
export const analyticsWriteApi = {
  generateLineChart: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.post('/visualization/line', data ?? {}),
  generateBarChart: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.post('/visualization/bar', data ?? {}),
  generatePieChart: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.post('/visualization/pie', data ?? {}),
  exportReport: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/report/{id}/export'),
  exportDashboard: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/dashboard/{id}/export'),
  exportDashboardPdf: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.post('/dashboard/{id}/export/pdf', data ?? {}),
  exportDashboardExcel: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.post('/dashboard/{id}/export/excel', data ?? {}),
  listExportJobs: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/reports/{id}/exports'),
  getExportJob: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.bi.get('/reports/exports/{job_id}'),
};