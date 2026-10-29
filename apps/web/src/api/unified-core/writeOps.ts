import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（unified-core 写端点补绑，2026-10-29）──
export const unified_coreWriteApi = {
  createTemplate: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/api/core/doc/templates', data ?? {}),
  createFolder: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/api/core/doc/folders', data ?? {}),
  createTemplate2: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/api/core/flow/templates', data ?? {}),
  exportPermissionChanges: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/audit/permission-changes/export', data ?? {}),
  exportAccessLogs: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/audit/access-logs/export', data ?? {}),
  getSyncStatus: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/mdm/refs/sync-status'),
};