import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（mes 写端点补绑，2026-10-29）──
export const mesWriteApi = {
  listWipTransfers: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/wips/{wip_id}/transfers'),
};
