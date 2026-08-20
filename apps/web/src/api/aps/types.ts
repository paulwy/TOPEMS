export type { PaginationParams } from '../client';

// APS 高级计划与排程 - 类型定义

// ---- FSM 状态联合类型（与 svc/aps/src/shared/fsm.rs 1:1 对齐） ----

type ProductionPlanStatus =
  'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

export type ScheduleStatus = 'pending' | 'released' | 'running' | 'completed' | 'cancelled';

type CapacityStatus = 'available' | 'allocated' | 'consumed' | 'maintenance' | 'released';

type MaterialPlanStatus =
  'pending' | 'requisitioned' | 'sourced' | 'satisfied' | 'shortage' | 'cancelled';

type DemandForecastStatus =
  'draft' | 'calculated' | 'validated' | 'adopted' | 'superseded' | 'cancelled';

// ---- 实体接口 ----

export interface ProductionPlan {
  id: string;
  plan_no: string;
  plan_name: string;
  plan_type?: 'monthly' | 'weekly' | 'daily';
  start_date?: string;
  end_date?: string;
  status?: ProductionPlanStatus;
  product_id?: string;
  product_name?: string;
  target_quantity?: number;
  notes?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateProductionPlanRequest = Omit<
  ProductionPlan,
  'id' | 'tenant_id' | 'created_at' | 'updated_at'
>;
export type UpdateProductionPlanRequest = Partial<CreateProductionPlanRequest>;

export interface Schedule {
  id: string;
  schedule_no: string;
  plan_id?: string;
  work_order_id?: string;
  product_id?: string;
  product_name?: string;
  work_center_id?: string;
  work_center_name?: string;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  quantity?: number;
  priority?: number;
  status?: ScheduleStatus;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateScheduleRequest = Omit<
  Schedule,
  'id' | 'tenant_id' | 'created_at' | 'updated_at'
>;
export type UpdateScheduleRequest = Partial<CreateScheduleRequest>;

export interface Capacity {
  id: string;
  work_center_id: string;
  work_center_name?: string;
  capacity_date?: string;
  available_hours?: number;
  used_hours?: number;
  utilization_rate?: number;
  status?: CapacityStatus;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateCapacityRequest = Omit<
  Capacity,
  'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'utilization_rate'
>;
export type UpdateCapacityRequest = Partial<CreateCapacityRequest>;

export interface MaterialPlan {
  id: string;
  plan_no: string;
  plan_id?: string;
  material_id?: string;
  material_code?: string;
  material_name?: string;
  required_quantity?: number;
  available_quantity?: number;
  shortfall_quantity?: number;
  required_date?: string;
  supply_type?: 'purchase' | 'transfer' | 'produce';
  status?: MaterialPlanStatus;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateMaterialPlanRequest = Omit<
  MaterialPlan,
  'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'shortfall_quantity'
>;
export type UpdateMaterialPlanRequest = Partial<CreateMaterialPlanRequest>;

export interface DemandForecast {
  id: string;
  forecast_no: string;
  product_id?: string;
  product_name?: string;
  forecast_period?: string;
  forecast_date?: string;
  forecast_quantity?: number;
  actual_quantity?: number;
  accuracy_rate?: number;
  method?: 'moving_average' | 'exponential_smoothing' | 'linear_regression' | 'arima';
  confidence_level?: number;
  status?: DemandForecastStatus;
  notes?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateDemandForecastRequest = Omit<
  DemandForecast,
  'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'accuracy_rate'
>;
export type UpdateDemandForecastRequest = Partial<CreateDemandForecastRequest>;

// ---- 审批相关类型 ----

export interface ApprovalRequest {
  /** 操作人 */
  operator: string;
  /** 审批意见/备注 */
  comment?: string;
}

export interface ApprovalResponse {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message: string;
  /** 更新后的实体 ID */
  id?: string;
  /** 更新后的状态 */
  status?: string;
  /** 操作时间 */
  operated_at?: string;
}
