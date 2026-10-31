import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 批2复核·写语义补绑（2026-10-29）──
export const master_dataWriteOps2 = {
  reindexAll: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.post('/search/reindex', data ?? {}),
  ok: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.post('/lineage/refresh', data ?? {}),
  ok2: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.post('/lineage/refresh/{id}', data ?? {}),
};
