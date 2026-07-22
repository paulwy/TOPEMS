import { apiClient } from '../client';

export interface CostBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface WorkOrderCostResult {
  work_order_id: string;
  work_order_no: string;
  production_order_no: string;
  total_cost: number;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  cost_breakdown: CostBreakdownItem[];
  unit_cost: number;
  produced_qty: number;
}

export interface WorkOrderCostDetail {
  work_order_id: string;
  work_order_no: string;
  production_order_no: string;
  materials: MaterialCostItem[];
  labor: LaborCostItem[];
  overhead: OverheadCostItem[];
  total_material_cost: number;
  total_labor_cost: number;
  total_overhead_cost: number;
  grand_total: number;
}

export interface MaterialCostItem {
  material_id: string;
  material_code: string;
  material_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  batch_no?: string;
}

export interface LaborCostItem {
  employee_id: string;
  employee_name: string;
  work_center_id: string;
  work_center_name: string;
  hours: number;
  hourly_rate: number;
  amount: number;
}

export interface OverheadCostItem {
  cost_type: string;
  description: string;
  amount: number;
  allocation_basis: string;
}

export interface ProductionOrderCostResult {
  production_order_id: string;
  production_order_no: string;
  product_id: string;
  product_name: string;
  total_cost: number;
  unit_cost: number;
  planned_qty: number;
  actual_qty: number;
  cost_by_work_order: WorkOrderCostSummary[];
}

export interface WorkOrderCostSummary {
  work_order_id: string;
  work_order_no: string;
  cost: number;
  percentage: number;
}

export interface PeriodCostReport {
  period_start: string;
  period_end: string;
  total_cost: number;
  cost_by_product: ProductCostItem[];
  cost_by_workshop: WorkshopCostItem[];
  cost_by_month: MonthlyCostItem[];
}

export interface ProductCostItem {
  product_id: string;
  product_code: string;
  product_name: string;
  total_cost: number;
  unit_cost: number;
  percentage: number;
}

export interface WorkshopCostItem {
  workshop_id: string;
  workshop_name: string;
  total_cost: number;
  percentage: number;
}

export interface MonthlyCostItem {
  month: string;
  total_cost: number;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
}

export interface CostTrendData {
  period: string;
  total_cost: number;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  trend_direction: 'up' | 'down' | 'stable';
  change_rate: number;
}

export interface CostTrendResponse {
  start_date: string;
  end_date: string;
  trend_data: CostTrendData[];
  overall_trend: 'up' | 'down' | 'stable';
  avg_change_rate: number;
}

export interface CostComparisonResponse {
  comparison_type: string;
  baseline_total: number;
  comparison_total: number;
  difference: number;
  difference_percent: number;
  breakdown_comparison: ComparisonBreakdown[];
}

export interface ComparisonBreakdown {
  category: string;
  baseline_amount: number;
  comparison_amount: number;
  difference: number;
  difference_percent: number;
}

export interface CostForecastResponse {
  forecast_period: string;
  forecast_total: number;
  forecast_material: number;
  forecast_labor: number;
  forecast_overhead: number;
  confidence_interval: [number, number];
  trend_factor: number;
  seasonality_factor: number;
}

export const productionCostApi = {
  calculateWorkOrderCost: (workOrderId: string) =>
    apiClient.get<WorkOrderCostResult>(`/mes/v1/cost/work-order/${workOrderId}`),

  getWorkOrderCostDetail: (workOrderId: string) =>
    apiClient.get<WorkOrderCostDetail>(`/mes/v1/cost/work-order/${workOrderId}/detail`),

  calculateProductionOrderCost: (orderId: string) =>
    apiClient.get<ProductionOrderCostResult>(`/mes/v1/cost/production-order/${orderId}`),

  getPeriodCostReport: (params?: {
    period_type?: 'month' | 'quarter' | 'year';
    start_date?: string;
    end_date?: string;
    product_id?: string;
    workshop_id?: string;
  }) => apiClient.get<PeriodCostReport>('/mes/v1/cost/period', { params }),

  getCostTrend: (params?: {
    start_date?: string;
    end_date?: string;
    period_type?: 'week' | 'month';
    product_id?: string;
  }) => apiClient.get<CostTrendResponse>('/mes/v1/cost/trend', { params }),

  getCostComparison: (data: {
    compare_type: 'period' | 'product' | 'workshop';
    items: { id: string; name: string; type: string }[];
  }) => apiClient.post<CostComparisonResponse>('/mes/v1/cost/comparison', data),

  getCostForecast: (params?: {
    months?: number;
    product_id?: string;
  }) => apiClient.get<CostForecastResponse>('/mes/v1/cost/forecast', { params }),
};
