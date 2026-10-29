import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 pdm 8 条（2026-10-29）──
export const pdmReadApi = {
  listFormulas: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/production-formulas'),
  listMaterials: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/materials'),
  listProjects: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/projects'),
  listProcesses: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/production-processes'),
  listDocuments: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/documents'),
  listBomComparisons: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/bom-compare'),
  listSteps: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/production-steps'),
  listProducts: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/api/pdm/products'),
};