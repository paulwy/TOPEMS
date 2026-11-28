import { apiClient } from '../client';

interface CostBreakdownItem {
  category: string;
  sub_category: string;
  description: string;
  amount: number;
  unit: string;
  unit_price: number;
  quantity: number;
  percentage: number;
}

export interface WorkOrderCostResult {
  work_order_id: string;
  work_order_no: string;
  production_order_no: string | null;
  total_cost: number;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  cost_breakdown: CostBreakdownItem[];
  unit_cost: number;
  quantity: number;
  currency: string;
  calculated_at: string;
  /** 空数组才代表料/工/费全部按真实口径计价；非空即这条成本不完整（后端 B373 起返回） */
  data_gaps?: string[];
}

interface WorkOrderCostDetail {
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

interface MaterialCostItem {
  material_id: string;
  material_code: string;
  material_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  batch_no?: string;
}

interface LaborCostItem {
  employee_id: string;
  employee_name: string;
  work_center_id: string;
  work_center_name: string;
  hours: number;
  hourly_rate: number;
  amount: number;
}

interface OverheadCostItem {
  cost_type: string;
  description: string;
  amount: number;
  allocation_basis: string;
}

interface ProductionOrderCostResult {
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

interface WorkOrderCostSummary {
  work_order_id: string;
  work_order_no: string;
  cost: number;
  percentage: number;
}

interface PeriodCostReport {
  period_start: string;
  period_end: string;
  total_cost: number;
  cost_by_product: ProductCostItem[];
  cost_by_workshop: WorkshopCostItem[];
  cost_by_month: MonthlyCostItem[];
}

interface ProductCostItem {
  product_code: string;
  product_name: string;
  total_cost: number;
  unit_cost: number;
  quantity: number;
  percentage: number;
}

interface WorkshopCostItem {
  workshop_id: string;
  workshop_name: string;
  total_cost: number;
  percentage: number;
}

interface MonthlyCostItem {
  month: string;
  total_cost: number;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
}

/** 与后端 svc/mes CostTrendData 一一对应：按周期分桶后的并列数组，不是 [{period, cost}] */
export interface CostTrendData {
  period: string;
  labels: string[];
  total_cost: number[];
  material_cost: number[];
  labor_cost: number[];
  overhead_cost: number[];
  avg_unit_cost: number[];
}

export const productionCostApi = {
  calculateWorkOrderCost: (workOrderId: string) =>
    apiClient.mes.get<WorkOrderCostResult>(`/cost/work-order/${workOrderId}`),

  getWorkOrderCostDetail: (workOrderId: string) =>
    apiClient.mes.get<WorkOrderCostDetail>(`/cost/work-order/${workOrderId}/detail`),

  calculateProductionOrderCost: (orderId: string) =>
    apiClient.mes.get<ProductionOrderCostResult>(`/cost/production-order/${orderId}`),

  getPeriodCostReport: (params?: {
    period_type?: 'month' | 'quarter' | 'year';
    start_date?: string;
    end_date?: string;
    product_id?: string;
    workshop_id?: string;
  }) => apiClient.mes.get<PeriodCostReport>('/cost/period', { params }),

  getCostTrend: (params?: {
    start_date?: string;
    end_date?: string;
    period_type?: 'week' | 'month';
    product_id?: string;
  }) => apiClient.mes.get<CostTrendData>('/cost/trend', { params }),

  // 后端 get_cost_comparison / get_cost_forecast 自 B372 起显式返回 503（没有真实口径，
  // 不再编造数值）。这里保留调用点语义（会 reject），页面按「未接入」空态处理，不再声明假响应类型。
  getCostComparison: (data: {
    compare_type: 'period' | 'product' | 'workshop';
    items: { id: string; name: string; type: string }[];
  }) => apiClient.mes.post<never>('/cost/comparison', data),

  getCostForecast: (params?: { months?: number; product_id?: string }) =>
    apiClient.mes.get<never>('/cost/forecast', { params }),
};
