import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 mes 7 条（2026-10-29）──
export const mesReadOps2 = {
  listForecasts: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/demand-forecasts'),
  getEnergyCost: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/analytics/energy-cost'),
  listMaintenances: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/maintenances/{_id}'),
  getEquipmentMtbf: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/analytics/equipment-mtbf'),
  getCapacityUtilization: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/analytics/capacity-utilization/{_id}'),
  getEnergyCost2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/analytics/energy-cost/{_id}'),
  getEquipmentMtbf2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mes.get('/analytics/equipment-mtbf/{_id}'),
};
