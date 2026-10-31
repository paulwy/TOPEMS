import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 qms 1 条（2026-10-29）──
export const qmsReadOps2 = {
  listDefectRecords: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.qms.get('/defect-records'),
};
