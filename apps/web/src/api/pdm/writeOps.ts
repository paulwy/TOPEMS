import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（pdm 写端点补绑，2026-10-29）──
export const pdmWriteApi = {
  listBatches: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.get('/production-batches'),
  importData: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.pdm.post('/import', data ?? {}),
};