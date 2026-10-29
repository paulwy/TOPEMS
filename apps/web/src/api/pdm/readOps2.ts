import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 pdm 7 条（2026-10-29）──
export const pdmReadOps2 = {
  listVersions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/versions'),
  listConfigurations: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/configurations'),
  listWorkflowInstances: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/workflow-instances'),
  listBomVersions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/bom-versions'),
  listBomItems: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/bom-items'),
  listChangeNotices: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/change-notices'),
  listDrawings: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/drawings'),
};
