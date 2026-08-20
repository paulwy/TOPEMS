import apiClient from '../client';
import type { ApiResponse } from '../client';

// ==================== Types ====================

export interface AnomalyAlert {
  id: string;
  anomaly_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  source_id: string;
  source_name: string;
  metric_name: string;
  metric_value: number;
  threshold_value: number;
  trend: string;
  detected_at: string;
  status: string;
  recommendation: string;
}

interface EquipmentAnomalyCount {
  equipment_id: string;
  equipment_name: string;
  alert_count: number;
  highest_severity: string;
}

interface DailyAnomalyCount {
  date: string;
  count: number;
  critical: number;
}

interface AnomalySummary {
  total_alerts: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  byType: Record<string, number>;
  by_equipment: EquipmentAnomalyCount[];
  recent_trend: DailyAnomalyCount[];
}

export interface AnomalyRule {
  id: string;
  rule_type: string;
  metric_name: string;
  warning_threshold: number;
  critical_threshold: number;
  window_size: number;
  enabled: boolean;
  description: string;
}

interface AnomalyQueryParams {
  severity?: string;
  anomaly_type?: string;
  equipment_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface UpdateRuleRequest {
  warning_threshold?: number;
  critical_threshold?: number;
  enabled?: boolean;
}

interface AnomalyScanResult {
  scan_completed: boolean;
  scanned_at: string;
  total_alerts_found: number;
  equipment_alerts: number;
  quality_alerts: number;
  production_alerts: number;
}

// ==================== API ====================

export const anomalyDetectionApi = {
  /** 获取异常预警列表 */
  getAlerts: async (params?: AnomalyQueryParams): Promise<ApiResponse<AnomalyAlert[]>> => {
    return apiClient.mes.get('/anomaly/alerts', { params });
  },

  /** 获取异常预警汇总 */
  getSummary: async (): Promise<ApiResponse<AnomalySummary>> => {
    return apiClient.mes.get('/anomaly/summary');
  },

  /** 获取指定设备的异常预警 */
  getEquipmentAnomalies: async (equipmentId: string): Promise<ApiResponse<AnomalyAlert[]>> => {
    return apiClient.mes.get(`/anomaly/equipment/${equipmentId}`);
  },

  /** 获取预警规则列表 */
  getRules: async (): Promise<ApiResponse<AnomalyRule[]>> => {
    return apiClient.mes.get('/anomaly/rules');
  },

  /** 获取单个预警规则 */
  getRule: async (ruleId: string): Promise<ApiResponse<AnomalyRule>> => {
    return apiClient.mes.get(`/anomaly/rules/${ruleId}`);
  },

  /** 更新预警规则 */
  updateRule: async (req: UpdateRuleRequest): Promise<ApiResponse<unknown>> => {
    return apiClient.mes.put('/anomaly/rules', req);
  },

  /** 手动触发异常扫描 */
  triggerScan: async (): Promise<ApiResponse<AnomalyScanResult>> => {
    return apiClient.mes.post('/anomaly/scan');
  },

  /** 获取异常趋势 */
  getTrend: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<DailyAnomalyCount[]>> => {
    return apiClient.mes.get('/anomaly/trend', { params });
  },
};
