import apiClient from '../client';
import type { ApiResponse } from '../client';
// 2026-11-26：此文件是 v74「端点绑定」占位（页面未接入）。动作型接口按后端实际方法对齐为 POST，
// 之前用 GET 只会拿到 405。详见 docs/dev/api-contract-audit-20261126.md

// ── v74 BIZ 接入候选 unifiedCore（2026-10-29）──
export const unifiedCoreReadApi = {
  verifyPermission: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/iam/permissions/verify', data ?? {}),
  verifyMultiplePermissions: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/iam/permissions/verify-multiple', data ?? {}),
  getMyPermissions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/iam/permissions/my-permissions'),
  listTasks: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/flow/tasks'),
  listApprovalTasks: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/flow/approval-tasks'),
  listPlans: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/subscriptions/plans'),
  batchUpdateRules: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/flow/rules/batch-update', data ?? {}),
  getDesignerResources: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/automation/designer/schema'),
  checkEmailAvailability: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/iam/users/check-email'),
  checkUsernameAvailability: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/iam/users/check-username'),
  getUserPermissions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/iam/user-permissions/{user_id}'),
  verifyPermission2: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/iam/permissions/verify', data ?? {}),
  verifyMultiplePermissions2: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/iam/permissions/verify-multiple', data ?? {}),
  getUserPositions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/iam/users/{user_id}/positions'),
  getPositionUsers: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/iam/positions/{position_id}/users'),
  disableUser: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/iam/users/{id}/disable', data ?? {}),
  enableUser: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/iam/users/{id}/enable', data ?? {}),
  changePassword: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.put('/iam/users/{id}/password', data ?? {}),
  checkResourcePermission: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/iam/permissions/check-resource', data ?? {}),
  batchAssignPositions: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.post('/iam/users/batch-positions', data ?? {}),
  unassignPosition: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.delete('/iam/users/{user_id}/positions/{position_id}', data ?? {}),
  getMyPermissions2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/iam/permissions/my-permissions'),
  getPermissionMetadata: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/iam/permissions/metadata'),
  downloadFile: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/file/download/{id}'),
  searchFiles: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.core.get('/file/files/search'),
};
