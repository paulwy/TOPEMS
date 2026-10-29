import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 pdm 8 条（2026-10-29）──
export const pdmReadApi = {
  listFormulas: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/production-formulas'),
  listMaterials: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/materials'),
  listProjects: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/projects'),
  listProcesses: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/production-processes'),
  listDocuments: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/documents'),
  listBomComparisons: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/bom-compare'),
  listSteps: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/production-steps'),
  listProducts: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/products'),
};
