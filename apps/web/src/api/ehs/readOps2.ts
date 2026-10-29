import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 ehs 1 条（2026-10-30：单数 occupational-disease 4 条随 B2 清理，主封装已复数覆盖）──
export const ehsReadOps2 = {
  listAccidents: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.get('/accidents'),
};
