import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 批2复核·写语义补绑（2026-10-29）──
export const aiWriteOps2 = {
  agentRun: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.post('/agent/run', data ?? {}),
  executeWorkflow: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.post('/workflows/execute', data ?? {}),
};