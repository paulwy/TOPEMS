import { apiClient } from '@/lib/apiClient';

// ==================== 类型定义 ====================

export interface CapacityUtilizationItem {
  equipment: string;
  date: string;
  shift: string;
  utilization: number;
}

export interface CapacityUtilizationResponse {
  heatmap: CapacityUtilizationItem[];
  avg_utilization: number;
  total_equipment: number;
}

export interface EnergyMixItem {
  energy_type: string;
  percentage: number;
  cost: number;
}

export interface EnergyTrendItem {
  date: string;
  kwh_per_unit: number;
}

export interface WorkshopCostItem {
  workshop: string;
  cost: number;
}

export interface EnergyCostResponse {
  per_unit_trend: EnergyTrendItem[];
  energy_mix: EnergyMixItem[];
  workshop_top_n: WorkshopCostItem[];
  total_cost: number;
}

export interface EquipmentMtbfItem {
  equipment_type: string;
  mtbf_hours: number;
  mttr_hours: number;
}

export interface FaultReasonItem {
  reason: string;
  frequency: number;
}

export interface MtbfScatterItem {
  mtbf: number;
  oee: number;
  label: string;
}

export interface EquipmentMtbfResponse {
  by_equipment_type: EquipmentMtbfItem[];
  fault_reasons: FaultReasonItem[];
  scatter: MtbfScatterItem[];
  avg_mtbf: number;
}

export interface DeliveryTrendItem {
  date: string;
  planned: number;
  delivered: number;
  on_time_rate: number;
}

export interface DeliveryAnalyticsResponse {
  trend: DeliveryTrendItem[];
  on_time_rate: number;
  total_orders: number;
  delayed_orders: number;
}

export interface OeeDashboardItem {
  equipment_name: string;
  oee: number;
  availability: number;
  performance: number;
  quality_rate: number;
}

export interface OeeTrendItem {
  date: string;
  oee: number;
  availability: number;
  performance: number;
  quality_rate: number;
}

export interface OeeDashboardResponse {
  avg_oee: number;
  avg_availability: number;
  avg_performance: number;
  avg_quality_rate: number;
  by_equipment: OeeDashboardItem[];
  trend: OeeTrendItem[];
}

export interface QualityParetoItem {
  defect_type: string;
  count: number;
  percentage: number;
  cumulative_percentage: number;
}

export interface QualityParetoResponse {
  pareto: QualityParetoItem[];
  total_defects: number;
  pass_rate: number;
}

export interface AnalyticsQueryParams {
  days?: number;
  workshop?: string;
}

// ==================== API 封装 ====================

const buildQuery = (params?: AnalyticsQueryParams): string => {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.days !== undefined) search.set('days', String(params.days));
  if (params.workshop) search.set('workshop', params.workshop);
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

export const mesAnalyticsApi = {
  /** 产能利用率热力图 */
  getCapacityUtilization: async (
    params?: AnalyticsQueryParams
  ): Promise<CapacityUtilizationResponse> => {
    const res = await apiClient.mes.get<CapacityUtilizationResponse>(
      `/analytics/capacity-utilization${buildQuery(params)}`
    );
    return res.data;
  },

  /** 能源成本分析 */
  getEnergyCost: async (
    params?: AnalyticsQueryParams
  ): Promise<EnergyCostResponse> => {
    const res = await apiClient.mes.get<EnergyCostResponse>(
      `/analytics/energy-cost${buildQuery(params)}`
    );
    return res.data;
  },

  /** 设备 MTBF 分析 */
  getEquipmentMtbf: async (
    params?: AnalyticsQueryParams
  ): Promise<EquipmentMtbfResponse> => {
    const res = await apiClient.mes.get<EquipmentMtbfResponse>(
      `/analytics/equipment-mtbf${buildQuery(params)}`
    );
    return res.data;
  },

  /** 交付分析 */
  getDeliveryAnalytics: async (
    params?: AnalyticsQueryParams
  ): Promise<DeliveryAnalyticsResponse> => {
    const res = await apiClient.mes.get<DeliveryAnalyticsResponse>(
      `/analytics/delivery-analytics${buildQuery(params)}`
    );
    return res.data;
  },

  /** OEE 仪表盘 */
  getOeeDashboard: async (
    params?: AnalyticsQueryParams
  ): Promise<OeeDashboardResponse> => {
    const res = await apiClient.mes.get<OeeDashboardResponse>(
      `/analytics/oee-dashboard${buildQuery(params)}`
    );
    return res.data;
  },

  /** 质量帕累托 */
  getQualityPareto: async (
    params?: AnalyticsQueryParams
  ): Promise<QualityParetoResponse> => {
    const res = await apiClient.mes.get<QualityParetoResponse>(
      `/analytics/quality-pareto${buildQuery(params)}`
    );
    return res.data;
  },
};
