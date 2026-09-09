import { apiClient } from '../client';

interface RealTimeConsumption {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  current_value: number;
  unit: string;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical';
}

interface EnergyConsumptionRecord {
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

interface EnergyStatistic {
  period: string;
  total_consumption: number;
  avg_consumption: number;
  peak_consumption: number;
  peak_time: string;
  min_consumption: number;
  min_time: string;
}

interface EnergyByEquipment {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  total_consumption: number;
  percentage: number;
  avg_consumption: number;
}

interface EnergyByWorkshop {
  workshop_id: string;
  workshop_name: string;
  total_consumption: number;
  percentage: number;
}

interface EnergyTrendData {
  period: string;
  consumption: number;
  trend_direction: 'up' | 'down' | 'stable';
  change_rate: number;
}

interface EnergyReportResponse {
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

interface EnergyForecastResponse {
  forecast_period: string;
  forecast_consumption: number;
  forecast_cost: number;
  confidence_interval: [number, number];
  trend_factor: number;
  seasonality_factor: number;
}

interface EnergyAlert {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  threshold_value: number;
  actualValue: number;
  timestamp: string;
  status: 'active' | 'resolved';
}

interface EnergyAlertsResponse {
  alerts: EnergyAlert[];
  total_count: number;
  critical_count: number;
  warning_count: number;
}

export const energyManagementApi = {
  getRealTimeConsumption: () => apiClient.mes.get<RealTimeConsumption[]>('/energy/realtime'),

  getConsumptionHistory: (params?: {
    start_date?: string;
    end_date?: string;
    equipment_id?: string;
    workshop_id?: string;
  }) => apiClient.mes.get<EnergyConsumptionRecord[]>('/energy/history', { params }),

  getEnergyReport: (params?: { period_type?: string; start_date?: string; end_date?: string }) =>
    apiClient.mes.get<EnergyReportResponse>('/energy/report', { params }),

  getEnergyForecast: (params?: { months?: number; equipment_id?: string }) =>
    apiClient.mes.get<EnergyForecastResponse>('/energy/forecast', { params }),

  getEnergyAlerts: (params?: { start_date?: string; end_date?: string }) =>
    apiClient.mes.get<EnergyAlertsResponse>('/energy/alerts', { params }),

  getEquipmentConsumption: (
    equipmentId: string,
    params?: {
      start_date?: string;
      end_date?: string;
    }
  ) => apiClient.mes.get<EnergyConsumptionRecord[]>(`/energy/equipment/${equipmentId}`, { params }),

  exportEnergyReport: (params?: { period_type?: string; start_date?: string; end_date?: string }) =>
    apiClient.mes.get('/energy/export', { params }),
};
