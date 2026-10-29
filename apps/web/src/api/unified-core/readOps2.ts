import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 unified-core 13 条（2026-10-29）──
export const unifiedcoreReadOps2 = {
  listTemplates: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/api/core/doc/templates'),
  listTemplateCategories: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/api/core/doc/templates/categories'),
  listFolders: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/api/core/doc/folders'),
  listSettings: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/api/core/flow/settings'),
  listInstances: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/api/core/flow/instances'),
  listWorkflows: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/api/core/flow/workflows'),
  listTemplates2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/api/core/flow/templates'),
  listApprovals: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/api/core/flow/approvals'),
  listRecords: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/api/core/flow/records'),
  listTenants: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/tenant/tenants'),
  listTenantModules: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/tenant/tenants/{id}/modules'),
  listRefs: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/mdm/refs'),
  listChanges: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/mdm/refs/{master_data_id}/changes'),
};