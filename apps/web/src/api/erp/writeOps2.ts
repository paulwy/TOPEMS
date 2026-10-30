import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 批2复核·写语义补绑（2026-10-29）──
export const erpWriteOps2 = {
  executeRepairWorkflow: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/quality/repair-workflows/{id}/execute', data ?? {}),
  runSlaCheck: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/mdm-v49/run-sla-check', data ?? {}),
  runComplianceCheck: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data-refs/audit/check', data ?? {}),
  s: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/addressbook/import/execute', data ?? {}),
  triggerCompensation: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/sync/jobs/{id}/compensate', data ?? {}),
  executeRepairWorkflow2: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/quality/repair-workflows/{id}/execute', data ?? {}),
  executeRepairStep: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post(
      '/master-data/quality/repair-workflows/{id}/steps/{step_index}/execute',
      data ?? {}
    ),
  runComplianceCheck2: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data-refs/audit/check', data ?? {}),
};
