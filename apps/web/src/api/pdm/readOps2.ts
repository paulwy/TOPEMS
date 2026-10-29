import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 pdm 7 条（2026-10-29）──
export const pdmReadOps2 = {
  listVersions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/versions'),
  listConfigurations: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/configurations'),
  listWorkflowInstances: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/workflow-instances'),
  listBomVersions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/bom-versions'),
  listBomItems: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/bom-items'),
  listChangeNotices: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/change-notices'),
  listDrawings: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/drawings'),
};