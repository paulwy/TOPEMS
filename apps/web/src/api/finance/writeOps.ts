import apiClient from '../client';
import type { ApiResponse } from '../client';
// 2026-11-26：此文件是 v74「端点绑定」占位（页面未接入）。动作型接口按后端实际方法对齐为 POST，
// 之前用 GET 只会拿到 405。详见 docs/dev/api-contract-audit-20261126.md

// ── v74 下线候选分流·批2（finance 写端点补绑，2026-10-29）──
// method 语义推导：create/add/publish→POST、update/activate→PUT、delete/remove→DELETE、get/list/stats→GET
// 路径归一：/api/finance、/finance 前缀剥离；无前缀即相对路径 → apiClient.finance

export const financeWriteApi = {
  generateConsolidatedReport: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/reports/consolidated/generate', data ?? {}),
  createConsolidationEntity: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/reports/consolidated/entities', data ?? {}),
  exportConsolidatedReport: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.get('/reports/consolidated/{consolidation_id}/export'),
  createReportSubscription: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/reports/subscriptions', data ?? {}),
  exportReport: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.get('/reports/export'),
  createAuditRule: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/audit-v52/rules', data ?? {}),
  createAlertConfig: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/audit-v52/alerts/config', data ?? {}),
  createSession: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/reconciliation/sessions', data ?? {}),
  importItems: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/reconciliation/sessions/{session_id}/items/import', data ?? {}),
  updateDiff: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.put('/reconciliation/items/{item_id}/diff', data ?? {}),
  batchUpdateDiff: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.put('/reconciliation/items/diff/batch', data ?? {}),
  createAlertRule: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/forecasting/alerts/rules', data ?? {}),
  listPublishedEvents: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.get('/events/published'),
  handleCreateVoucher: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/cqrs/commands/create-voucher', data ?? {}),
  approveApproval: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/approvals/approve', data ?? {}),
  exportTemplate: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/voucher-templates/{template_id}/export', data ?? {}),
  importVouchers: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/u8-import/import', data ?? {}),
  batchWriteOffPayments: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/payment-records/batch-write-off', data ?? {}),
  createControlPoint: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/compliance-v51/control-points', data ?? {}),
  generateControlMatrix: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.finance.post('/compliance-v51/control-matrices/generate', data ?? {}),
};
