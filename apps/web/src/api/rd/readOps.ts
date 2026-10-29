import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 rd 8 条（2026-10-29）──
export const rdReadApi = {
  getEntityDocuments: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.rd.get('/entities/{entity_type}/{entity_id}/documents'),
  getProjectMembers: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.rd.get('/members/project/{project_id}'),
  listMaterialTests: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.rd.get('/material-tests'),
  listByProject: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.rd.get('/material-tests/project/{project_id}'),
  getMaterialTest: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.rd.get('/material-tests/{id}'),
  listChangeOrders: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.rd.get('/change-orders'),
  getProjectMilestones: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.rd.get('/milestones/project/{project_id}'),
  listCostsByProject: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.rd.get('/research-costs/project/{project_id}'),
};