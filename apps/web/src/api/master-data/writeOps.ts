import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（master-data 写端点补绑，2026-10-29）──
export const master_dataWriteApi = {
  exportKg: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.post('/kg-v53/export', data ?? {}),
  exportLineage: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.post('/mdm-v60/lineage/export', data ?? {}),
  exportLineage2: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => apiClient.master.post('/export', data ?? {}),
  exportLineage3: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.post('/lineage-v52/export', data ?? {}),
};
