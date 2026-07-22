import { apiClient } from '../client';

export interface RealTimeConsumption {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  current_value: number;
  unit: string;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical';
}

export interface EnergyConsumptionRecord {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  meter_id: string;
  timestamp: string;
  value: number;
  unit: string;
  quality: string;
  source: string;
}

export interface EnergyStatistic {
  period: string;
  total_consumption: number;
  avg_consumption: number;
  peak_consumption: number;
  peak_time: string;
  min_consumption: number;
  min_time: string;
}

export interface EnergyByEquipment {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  total_consumption: number;
  percentage: number;
  avg_consumption: number;
}

export interface EnergyByWorkshop {
  workshop_id: string;
  workshop_name: string;
  total_consumption: number;
  percentage: number;
}

export interface EnergyTrendData {
  period: string;
  consumption: number;
  trend_direction: 'up' | 'down' | 'stable';
  change_rate: number;
}

export interface EnergyReportResponse {
  report_id: string;
  start_date: string;
  end_date: string;
  total_consumption: number;
  total_cost: number;
  avg_cost_per_unit: number;
  statistics: EnergyStatistic;
  by_equipment: EnergyByEquipment[];
  by_workshop: EnergyByWorkshop[];
  trend_data: EnergyTrendData[];
}

export interface EnergyForecastResponse {
  forecast_period: string;
  forecast_consumption: number;
  forecast_cost: number;
  confidence_interval: [number, number];
  trend_factor: number;
  seasonality_factor: number;
}

export interface EnergyAlert {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  threshold_value: number;
  actual_value: number;
  timestamp: string;
  status: 'active' | 'resolved';
}

export interface EnergyAlertsResponse {
  alerts: EnergyAlert[];
  total_count: number;
  critical_count: number;
  warning_count: number;
}

export const energyManagementApi = {
  getRealTimeConsumption: () =>
    apiClient.get<RealTimeConsumption[]>('/mes/v1/energy/realtime'),

  getConsumptionHistory: (params?: {
    start_date?: string;
    end_date?: string;
    equipment_id?: string;
    workshop_id?: string;
  }) => apiClient.get<EnergyConsumptionRecord[]>('/mes/v1/energy/history', { params }),

  getEnergyReport: (params?: {
    period_type?: string;
    start_date?: string;
    end_date?: string;
  }) => apiClient.get<EnergyReportResponse>('/mes/v1/energy/report', { params }),

  getEnergyForecast: (params?: {
    months?: number;
    equipment_id?: string;
  }) => apiClient.get<EnergyForecastResponse>('/mes/v1/energy/forecast', { params }),

  getEnergyAlerts: (params?: {
    start_date?: string;
    end_date?: string;
  }) => apiClient.get<EnergyAlertsResponse>('/mes/v1/energy/alerts', { params }),

  getEquipmentConsumption: (equipmentId: string, params?: {
    start_date?: string;
    end_date?: string;
  }) => apiClient.get<EnergyConsumptionRecord[]>(`/mes/v1/energy/equipment/${equipmentId}`, { params }),

  exportEnergyReport: (params?: {
    period_type?: string;
    start_date?: string;
    end_date?: string;
  }) => apiClient.get('/mes/v1/energy/export', { params }),
};
