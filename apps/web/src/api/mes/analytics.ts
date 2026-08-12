import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  OeeDashboardData,
  DeliveryAnalyticsData,
  QualityParetoData,
  MtbfData,
  EnergyCostData,
  CapacityUtilizationData,
} from './types';

export const mesAnalyticsApi = {
  oee: (params?: { from?: string; to?: string; workshop?: string }) =>
    apiClient.mes.get<ApiResponse<OeeDashboardData>>('/analytics/oee', { params }),
  delivery: (params?: { month?: string; product_family?: string }) =>
    apiClient.mes.get<ApiResponse<DeliveryAnalyticsData>>('/analytics/delivery', { params }),
  qualityPareto: (params?: { month?: string; line?: string }) =>
    apiClient.mes.get<ApiResponse<QualityParetoData>>('/analytics/quality-pareto', { params }),
  mtbf: (params?: { equipment_type?: string; severity?: string }) =>
    apiClient.mes.get<ApiResponse<MtbfData>>('/analytics/mtbf', { params }),
  energy: (params?: { energy_type?: string; from?: string; to?: string }) =>
    apiClient.mes.get<ApiResponse<EnergyCostData>>('/analytics/energy', { params }),
  capacity: (params?: { week?: string; work_center?: string }) =>
    apiClient.mes.get<ApiResponse<CapacityUtilizationData>>('/analytics/capacity', { params }),
};
