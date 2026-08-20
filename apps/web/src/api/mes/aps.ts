import apiClient from '../client';
import type { ApiResponse } from '../client';

interface ApsScheduleRequest {
  order_ids?: string[];
  schedule_start?: string;
  strategy?: 'forward' | 'backward' | 'bidirectional' | 'bottleneck_driven';
  optimization_weights?: {
    minimize_makespan: number;
    minimize_tardiness: number;
    maximize_utilization: number;
    minimize_idle_time: number;
  };
  overwrite_existing?: boolean;
}

export interface ApsScheduleItem {
  order_id: string;
  orderNo: string;
  product_name: string;
  product_code: string;
  quantity: number;
  priority: number;
  planned_start: string;
  planned_end: string;
  work_station_id: string;
  work_station_name: string;
  equipment_id?: string;
  equipment_name?: string;
  process_id?: string;
  process_name?: string;
  setup_time_hours: number;
  processing_time_hours: number;
  material_ready: boolean;
  feasibility_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface ApsScheduleResult {
  schedule_id: string;
  schedule_no: string;
  total_orders: number;
  scheduled_orders: number;
  unscheduled_orders: number;
  estimated_completion: string;
  total_makespan_hours: number;
  average_utilization: number;
  tardy_count: number;
  items: ApsScheduleItem[];
  warnings: string[];
}

interface ConstraintCheckRequest {
  order_ids: string[];
  check_materials?: boolean;
  check_equipment?: boolean;
  check_personnel?: boolean;
}

interface MaterialConstraint {
  material_code: string;
  material_name: string;
  required_quantity: number;
  available_quantity: number;
  shortfall: number;
  status: 'passed' | 'warning' | 'failed';
}

interface EquipmentConstraint {
  equipment_id: string;
  equipment_name: string;
  required_capability: string;
  available: boolean;
  next_available_time?: string;
  status: 'passed' | 'warning' | 'failed';
}

interface PersonnelConstraint {
  team_id: string;
  team_name: string;
  required_skill: string;
  available_members: number;
  required_members: number;
  status: 'passed' | 'warning' | 'failed';
}

export interface ConstraintCheckResult {
  order_id: string;
  orderNo: string;
  overall_passed: boolean;
  material_constraints: MaterialConstraint[];
  equipment_constraints: EquipmentConstraint[];
  personnel_constraints: PersonnelConstraint[];
  suggested_start_time?: string;
}

interface SimulateRequest {
  scenario_name: string;
  orders: Array<{
    order_id: string;
    priority?: number;
    desired_delivery?: string;
  }>;
  strategy?: 'forward' | 'backward' | 'bidirectional' | 'bottleneck_driven';
  start_time?: string;
}

interface SimulateResult {
  scenario_name: string;
  simulated_schedules: ApsScheduleItem[];
  total_makespan_hours: number;
  on_time_rate: number;
  resource_utilization: Record<string, number>;
  comparison_with_current?: string;
}

interface BottleneckResource {
  resource_id: string;
  resource_name: string;
  resource_type: string;
  utilization_rate: number;
  queue_length: number;
  impact_score: number;
}

interface ImprovementSuggestion {
  category: string;
  title: string;
  description: string;
  estimated_impact: string;
  priority: number;
}

export interface OptimizationReport {
  generated_at: string;
  total_orders: number;
  scheduled_orders: number;
  unscheduled_orders: number;
  average_lead_time_hours: number;
  on_time_rate: number;
  bottleneck_resources: BottleneckResource[];
  improvement_suggestions: ImprovementSuggestion[];
}

export interface BottleneckAnalysis {
  analysis_date: string;
  time_period: string;
  bottleneck_resources: BottleneckResource[];
  throughput_analysis: {
    total_orders: number;
    completed_orders: number;
    in_progress_orders: number;
    pending_orders: number;
    average_cycle_time_hours: number;
  };
  capacity_vs_demand: {
    total_capacity_hours: number;
    total_demand_hours: number;
    capacity_utilization: number;
    capacity_gap_hours: number;
  };
}

export const apsApi = {
  async schedule(data: ApsScheduleRequest): Promise<ApiResponse<ApsScheduleResult>> {
    return apiClient.mes.post('/aps/schedule', data);
  },

  async simulate(data: SimulateRequest): Promise<ApiResponse<SimulateResult>> {
    return apiClient.mes.post('/aps/schedule/simulate', data);
  },

  async checkConstraints(
    data: ConstraintCheckRequest
  ): Promise<ApiResponse<ConstraintCheckResult[]>> {
    return apiClient.mes.post('/aps/schedule/check-constraints', data);
  },

  async getOptimizationReport(): Promise<ApiResponse<OptimizationReport>> {
    return apiClient.mes.get('/aps/schedule/optimization-report');
  },

  async getBottleneckAnalysis(period?: string): Promise<ApiResponse<BottleneckAnalysis>> {
    const query = period ? `?period=${period}` : '';
    return apiClient.mes.get(`/aps/schedule/bottleneck-analysis${query}`);
  },

  async checkOrderFeasibility(orderId: string): Promise<ApiResponse<ConstraintCheckResult>> {
    return apiClient.mes.get(`/aps/orders/${orderId}/feasibility`);
  },
};
