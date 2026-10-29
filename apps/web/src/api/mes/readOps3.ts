import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 mes 1 条（2026-10-29）──
export const mesReadOps3 = {
  getEquipmentEfficiencyAnalysis: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/equipment-oee/{equipment_id}/efficiency'),
};