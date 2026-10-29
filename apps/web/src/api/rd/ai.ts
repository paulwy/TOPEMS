import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 to_bind 补绑（2026-10-29）──
export const rdAiApi = {
  createAnalysis: async (
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.rd.post('/ai/analyses', data);
  },
};
