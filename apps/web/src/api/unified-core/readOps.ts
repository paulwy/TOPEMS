import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 unifiedCore（2026-10-29）──
export const unifiedCoreReadApi = {
  verifyPermission: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/iam/permissions/verify'),
  verifyMultiplePermissions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/iam/permissions/verify-multiple'),
  getMyPermissions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/iam/permissions/my-permissions'),
  listTasks: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/flow/tasks'),
  listApprovalTasks: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/flow/approval-tasks'),
  listPlans: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/subscriptions/plans'),
  batchUpdateRules: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/rules/batch-update', data ?? {}),
  getDesignerResources: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/automation/designer/schema'),
  checkEmailAvailability: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/users/check-email'),
  checkUsernameAvailability: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/users/check-username'),
  getUserPermissions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/user-permissions/{user_id}'),
  verifyPermission2: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/permissions/verify', data ?? {}),
  verifyMultiplePermissions2: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/permissions/verify-multiple', data ?? {}),
  getUserPositions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/users/{user_id}/positions'),
  getPositionUsers: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/positions/{position_id}/users'),
  disableUser: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/users/{id}/disable', data ?? {}),
  enableUser: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/users/{id}/enable', data ?? {}),
  changePassword: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.put('/users/{id}/password', data ?? {}),
  checkResourcePermission: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/permissions/check-resource', data ?? {}),
  batchAssignPositions: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/users/batch-positions', data ?? {}),
  unassignPosition: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.delete('/users/{user_id}/positions/{position_id}', data ?? {}),
  getMyPermissions2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/permissions/my-permissions'),
  websocket: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/ws/core/notifications'),
  getPermissionMetadata: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/iam/permissions/metadata'),
  downloadFile: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/download/{id}'),
  searchFiles: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/files/search'),
};
