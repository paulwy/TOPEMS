import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（erp 写端点补绑，2026-10-29）──
// method 语义推导：create/add/publish→POST、update/activate→PUT、delete/remove→DELETE、get/list/stats→GET
// 路径归一：/api/erp、/erp 前缀剥离；无前缀即相对路径 → apiClient.erp

export const erpWriteApi = {
  createDashboard: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data-refs/dashboard', data ?? {}),
  createRepairWorkflow: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/quality/repair-workflows', data ?? {}),
  createDataDomain: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/domains', data ?? {}),
  createArchivePolicy: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/mdm-v49/create-archive-policy', data ?? {}),
  updateArchivePolicy: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.put('/mdm-v49/update-archive-policy', data ?? {}),
  deleteArchivePolicy: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.delete('/mdm-v49/delete-archive-policy'),
  restoreArchiveRecord: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/mdm-v49/restore-archive-record', data ?? {}),
  createCatalogEntry: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data-refs/catalog', data ?? {}),
  createRelation: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data-refs/metadata/relations', data ?? {}),
  rollbackRetirementPlan: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/mdm-v49/rollback-retirement-plan', data ?? {}),
  registerToCore: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/erp-plugin/register-to-core', data ?? {}),
  autoRegisterToCore: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/erp-plugin/auto-register-to-core', data ?? {}),
  mdmServiceDeregister: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.delete('/master-data/services/{serviceId}/deregister'),
  deleteDeadLetter: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.delete('/master-data/sync/dead-letters/{id}'),
  createComplianceRule: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data-refs/audit/rules', data ?? {}),
  generateAuditReport: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/audit/report'),
  getSyncJobV2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/sync/v2/jobs/{id}'),
  batchRetryDeadLetters: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/sync/v2/dead-letters/batch-retry', data ?? {}),
  createReportTemplate: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data-refs/reports/templates', data ?? {}),
  listGeneratedReports: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/list-generated-reports-handler'),
  getGeneratedReport: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/reports/generated/{report_id}'),
  exportEliminationWorksheet: async (
    scopeId: string,
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post(
      `/consolidation/scopes/${scopeId}/elimination-worksheet/export`,
      data ?? {}
    ),
  exportReport: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/consolidation/reports/export-report'),
  getSyncJobV22: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/sync/v2/jobs/{id}'),
  syncEngineStatsV2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/sync/v2/stats'),
  listGeneratedReports2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/reports/generated'),
  getGeneratedReport2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/reports/generated/{report_id}'),
  generateAuditReport2: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data-refs/audit/report', data ?? {}),
  exportEliminationWorksheet2: async (
    scopeId: string,
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post(
      `/consolidation/scopes/${scopeId}/elimination-worksheet/export`,
      data ?? {}
    ),
};
