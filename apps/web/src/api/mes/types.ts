import type { ApiResponse } from '../client';
import type { MesTypes } from '@topems/shared-types';

// ============================================================================
// OpenAPI 生成类型迁移映射（推广阶段）
// ============================================================================
// 当前策略：保留手写类型作为主类型，生成类型待 openapi.d.ts 聚合后启用。
// 后端 svc/mes 已通过 utoipa 注册以下 Schema（work_order、work_report、production_order），
// 待运行 ./scripts/openapi/generate.sh --with-types 后可在此添加 Generated* 别名。
//
// 迁移映射（手写类型 → 生成类型 MesTypes.*）：
// - WorkOrder               → MesTypes.WorkOrderResponse
// - CreateWorkOrderRequest  → MesTypes.CreateWorkOrderRequest
// - UpdateWorkOrderRequest  → MesTypes.UpdateWorkOrderRequest
// - WorkReport              → MesTypes.WorkReportResponse
// - CreateWorkReportRequest → MesTypes.CreateWorkReportRequest
// - UpdateWorkReportRequest → MesTypes.UpdateWorkReportRequest
// - ProductionOrder         → MesTypes.ProductionOrderResponse
// - CreateProductionOrderRequest → MesTypes.CreateProductionOrderRequest
// - UpdateProductionOrderRequest → MesTypes.UpdateProductionOrderRequest
// - CreateFromErpRequest    → MesTypes.CreateFromErpRequest
//
// 已知差异（替换时需注意）：
// 1. 生成类型字段全可选（openapi-typescript 默认行为）
// 2. 手写 WorkOrder 用 order_id/order_number，后端 WorkOrderResponse 用 order_id/order_no
// 3. 手写 WorkOrder 用 quantity/completed_quantity，后端用 planned_quantity/completed_quantity
// 4. 手写 WorkReport 用 quantity_good/quantity_bad/quantity_total，后端字段命名可能不同
// 5. 手写 ProductionOrder 用 order_number/scheduled_start_date，后端用 order_no/planned_start_date
//
// 参考：apps/web/src/api/iam/types.ts 的 Generated* 别名试点模式

// ============================================================================
// OpenAPI 生成类型别名（推广阶段）
// ============================================================================
export type GeneratedWorkOrderResponse = MesTypes.WorkOrderResponse;
export type GeneratedWorkReportResponse = MesTypes.WorkReportResponse;
export type GeneratedProductionOrderResponse = MesTypes.ProductionOrderResponse;
export type GeneratedCreateWorkOrderRequest = MesTypes.CreateWorkOrderRequest;
export type GeneratedUpdateWorkOrderRequest = MesTypes.UpdateWorkOrderRequest;
export type GeneratedCreateWorkReportRequest = MesTypes.CreateWorkReportRequest;
export type GeneratedUpdateWorkReportRequest = MesTypes.UpdateWorkReportRequest;
export type GeneratedCreateProductionOrderRequest = MesTypes.CreateProductionOrderRequest;
export type GeneratedUpdateProductionOrderRequest = MesTypes.UpdateProductionOrderRequest;
export type GeneratedCreateFromErpRequest = MesTypes.CreateFromErpRequest;

// ============================================================================
// 适配类型：将生成类型字段重映射到手写命名（任务 2）
// ============================================================================
// 手写 WorkOrder 与生成 WorkOrderResponse 字段差异：
// - order_number（手写） ↔ order_no（生成）
// - quantity（手写） ↔ planned_quantity（生成）
// - planned_start_time/planned_end_time（手写） ↔ plan_start_date/plan_end_date（生成）
// - actual_start_time/actual_end_time（手写） ↔ actual_start_date/actual_end_date（生成）

/** 生成类型 WorkOrderResponse 的字段重映射到手写 WorkOrder 命名 */
export type AdaptedWorkOrder = Omit<
  MesTypes.WorkOrderResponse,
  'order_no' | 'planned_quantity' | 'plan_start_date' | 'plan_end_date' | 'actual_start_date' | 'actual_end_date'
> & {
  order_number?: MesTypes.WorkOrderResponse['order_no'];
  quantity?: MesTypes.WorkOrderResponse['planned_quantity'];
  planned_start_time?: MesTypes.WorkOrderResponse['plan_start_date'];
  planned_end_time?: MesTypes.WorkOrderResponse['plan_end_date'];
  actual_start_time?: MesTypes.WorkOrderResponse['actual_start_date'];
  actual_end_time?: MesTypes.WorkOrderResponse['actual_end_date'];
};

/** 生成类型 ProductionOrderResponse 的字段重映射到手写 ProductionOrder 命名 */
export type AdaptedProductionOrder = Omit<
  MesTypes.ProductionOrderResponse,
  'order_no' | 'planned_start_date' | 'planned_end_date'
> & {
  order_number?: MesTypes.ProductionOrderResponse['order_no'];
  scheduled_start_date?: MesTypes.ProductionOrderResponse['planned_start_date'];
  scheduled_end_date?: MesTypes.ProductionOrderResponse['planned_end_date'];
};

// ============================================================================
// 字段适配函数：生成类型实例 → 手写命名实例
// ============================================================================

/**
 * 将生成类型 WorkOrderResponse 转换为手写命名的 AdaptedWorkOrder。
 * 字段映射：order_no → order_number, planned_quantity → quantity,
 *           plan_start_date → planned_start_time, plan_end_date → planned_end_time,
 *           actual_start_date → actual_start_time, actual_end_date → actual_end_time
 */
export const adaptWorkOrderFromGenerated = (
  generated: MesTypes.WorkOrderResponse
): AdaptedWorkOrder => {
  const {
    order_no,
    planned_quantity,
    plan_start_date,
    plan_end_date,
    actual_start_date,
    actual_end_date,
    ...rest
  } = generated;
  return {
    ...rest,
    order_number: order_no,
    quantity: planned_quantity,
    planned_start_time: plan_start_date,
    planned_end_time: plan_end_date,
    actual_start_time: actual_start_date,
    actual_end_time: actual_end_date,
  };
};

/**
 * 将生成类型 ProductionOrderResponse 转换为手写命名的 AdaptedProductionOrder。
 * 字段映射：order_no → order_number, planned_start_date → scheduled_start_date,
 *           planned_end_date → scheduled_end_date
 */
export const adaptProductionOrderFromGenerated = (
  generated: MesTypes.ProductionOrderResponse
): AdaptedProductionOrder => {
  const { order_no, planned_start_date, planned_end_date, ...rest } = generated;
  return {
    ...rest,
    order_number: order_no,
    scheduled_start_date: planned_start_date,
    scheduled_end_date: planned_end_date,
  };
};

// ============================================================================
// 手写类型（当前主类型）
// ============================================================================

export interface ListParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
  order_id?: string;
  order_number?: string;
  equipment_id?: string;
  work_station_id?: string;
  process_id?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: unknown;
}

export type PaginationParams = ListParams;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
}

export interface ProductionOrder {
  id: string;
  order_number: string;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  status: string;
  priority?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionOrderRequest {
  order_number: string;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  priority?: string;
}

export interface UpdateProductionOrderRequest {
  product_name?: string;
  product_code?: string;
  quantity?: number;
  unit?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  status?: string;
  priority?: string;
}

export interface CreateFromErpRequest {
  erp_order_ids?: string[];
  sync_all?: boolean;
}

export interface ProductionProcess {
  id: string;
  name: string;
  code?: string;
  description?: string;
  sequence: number;
  standard_time?: number;
  work_station_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionProcessRequest {
  name: string;
  code?: string;
  description?: string;
  sequence: number;
  standard_time?: number;
  work_station_id?: string;
}

export interface UpdateProductionProcessRequest {
  name?: string;
  code?: string;
  description?: string;
  sequence?: number;
  standard_time?: number;
  work_station_id?: string;
  status?: string;
}

export interface WorkStation {
  id: string;
  name: string;
  code?: string;
  location?: string;
  capacity?: number;
  status: string;
  supervisor?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkStationRequest {
  name: string;
  code: string;
  location?: string;
  capacity?: number;
  supervisor?: string;
}

export interface UpdateWorkStationRequest {
  name?: string;
  code?: string;
  location?: string;
  capacity?: number;
  status?: string;
  supervisor?: string;
}

export interface ProductionRecord {
  id: string;
  order_id: string;
  process_id?: string;
  work_station_id?: string;
  operator: string;
  quantity_completed: number;
  quantity_rejected?: number;
  start_time: string;
  end_time?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionRecordRequest {
  order_id: string;
  process_id?: string;
  work_station_id?: string;
  operator: string;
  quantity_completed: number;
  quantity_rejected?: number;
  start_time: string;
}

export interface UpdateProductionRecordRequest {
  quantity_completed?: number;
  quantity_rejected?: number;
  end_time?: string;
  status?: string;
  notes?: string;
}

export interface CompleteRecordRequest {
  end_time: string;
  quantity_completed: number;
  quantity_rejected?: number;
  notes?: string;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  type?: string;
  model?: string;
  manufacturer?: string;
  purchase_date?: string;
  location?: string;
  status: string;
  value?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEquipmentRequest {
  code: string;
  name: string;
  type?: string;
  model?: string;
  manufacturer?: string;
  purchase_date?: string;
  location?: string;
  status?: string;
  value?: number;
  description?: string;
}

export interface UpdateEquipmentRequest {
  name?: string;
  type?: string;
  model?: string;
  manufacturer?: string;
  purchase_date?: string;
  location?: string;
  status?: string;
  value?: number;
  description?: string;
}

export interface MaintenanceEquipmentRequest {
  maintenance_type: string;
  description: string;
  maintainer: string;
  start_time: string;
  end_time?: string;
  cost?: number;
  parts_replaced?: Array<{
    part_id: string;
    part_name: string;
    quantity: number;
    unit_price?: number;
  }>;
  result?: string;
  remarks?: string;
}

export interface InspectionRecord {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  inspector: string;
  inspection_date: string;
  location?: string;
  temperature?: number;
  vibration?: number;
  noiselevel?: number;
  status: string;
  items?: Array<{
    name: string;
    value: string | number;
    status?: string;
    remark?: string;
  }>;
  abnormalities?: string;
  remarks?: string;
  created_at: string;
}

export interface CreateInspectionRecord {
  equipment_id: string;
  inspector: string;
  inspection_date: string;
  location?: string;
  temperature?: number;
  vibration?: number;
  noiselevel?: number;
  status: string;
  items?: Array<{
    name: string;
    value: string | number;
    status?: string;
    remark?: string;
  }>;
  abnormalities?: string;
  remarks?: string;
}

export interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  maintenance_type: string;
  description: string;
  maintainer: string;
  start_time: string;
  end_time?: string;
  cost?: number;
  parts_replaced?: Array<{
    part_id: string;
    part_name: string;
    quantity: number;
    unit_price?: number;
  }>;
  result?: string;
  status: string;
  remarks?: string;
  created_at: string;
}

export interface CreateMaintenanceRecord {
  equipment_id: string;
  maintenance_type: string;
  description: string;
  maintainer: string;
  start_time: string;
  end_time?: string;
  cost?: number;
  parts_replaced?: Array<{
    part_id: string;
    part_name: string;
    quantity: number;
    unit_price?: number;
  }>;
  result?: string;
  status?: string;
  remarks?: string;
}

export interface UpdateMaintenanceStatus {
  status: string;
  result?: string;
}

export interface EquipmentStatistics {
  total: number;
  in_use: number;
  idle: number;
  maintenance: number;
  scrapped: number;
  total_value: number;
  monthly_inspections: number;
  monthly_maintenances: number;
  pending_repairs: number;
}

export interface ProductionSchedule {
  id: string;
  order_id: string;
  order_number?: string;
  process_id?: string;
  process_name?: string;
  work_station_id?: string;
  work_station_name?: string;
  planned_start_time: string;
  planned_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  quantity: number;
  priority?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionScheduleRequest {
  order_id: string;
  process_id?: string;
  work_station_id?: string;
  planned_start_time: string;
  planned_end_time: string;
  quantity: number;
  priority?: string;
  notes?: string;
}

export interface UpdateProductionScheduleRequest {
  process_id?: string;
  work_station_id?: string;
  planned_start_time?: string;
  planned_end_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  quantity?: number;
  priority?: string;
  status?: string;
  notes?: string;
}

export interface AdjustScheduleRequest {
  planned_start_time?: string;
  planned_end_time?: string;
  work_station_id?: string;
  reason?: string;
}

export interface GanttTask {
  id: string;
  name: string;
  order_id: string;
  order_number: string;
  work_station_id?: string;
  work_station_name?: string;
  start_time: string;
  end_time: string;
  progress?: number;
  status: string;
}

export interface GanttData {
  tasks: GanttTask[];
  work_stations: Array<{ id: string; name: string }>;
  date_range: { start: string; end: string };
}

export interface MaterialBom {
  id: string;
  product_code: string;
  product_name: string;
  version?: string;
  status: string;
  description?: string;
  items?: MaterialBomItem[];
  created_at: string;
  updated_at: string;
}

export interface MaterialBomItem {
  id: string;
  bom_id: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit?: string;
  sequence?: number;
  remark?: string;
}

export interface CreateMaterialBomRequest {
  product_code: string;
  product_name: string;
  version?: string;
  status?: string;
  description?: string;
  items?: Array<{
    material_code: string;
    material_name: string;
    quantity: number;
    unit?: string;
    sequence?: number;
    remark?: string;
  }>;
}

export interface UpdateMaterialBomRequest {
  product_name?: string;
  version?: string;
  status?: string;
  description?: string;
  items?: Array<{
    id?: string;
    material_code: string;
    material_name: string;
    quantity: number;
    unit?: string;
    sequence?: number;
    remark?: string;
  }>;
}

export interface MaterialIssue {
  id: string;
  issue_no: string;
  order_id: string;
  order_number?: string;
  work_station_id?: string;
  operator: string;
  issue_time: string;
  status: string;
  remark?: string;
  items?: MaterialIssueItem[];
  created_at: string;
}

export interface MaterialIssueItem {
  id: string;
  issue_id: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit?: string;
  batch_no?: string;
}

export interface CreateMaterialIssueRequest {
  order_id: string;
  work_station_id?: string;
  operator: string;
  items: Array<{
    material_code: string;
    material_name: string;
    quantity: number;
    unit?: string;
    batch_no?: string;
  }>;
  remark?: string;
}

export interface MaterialReturn {
  id: string;
  return_no: string;
  order_id: string;
  order_number?: string;
  work_station_id?: string;
  operator: string;
  return_time: string;
  status: string;
  reason?: string;
  items?: MaterialReturnItem[];
  created_at: string;
}

export interface MaterialReturnItem {
  id: string;
  return_id: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit?: string;
  batch_no?: string;
}

export interface CreateMaterialReturnRequest {
  order_id: string;
  work_station_id?: string;
  operator: string;
  reason?: string;
  items: Array<{
    material_code: string;
    material_name: string;
    quantity: number;
    unit?: string;
    batch_no?: string;
  }>;
}

export interface TraceNode {
  id: string;
  type: string;
  name: string;
  code: string;
  batch_no?: string;
  quantity?: number;
  timestamp?: string;
}

export interface TraceLink {
  from_id: string;
  to_id: string;
  relation_type: string;
}

export interface TraceChain {
  nodes: TraceNode[];
  links: TraceLink[];
  root_id: string;
  direction: 'forward' | 'backward';
}

export interface QualityRecord {
  id: string;
  batch_no: string;
  product_code: string;
  product_name: string;
  inspection_type: string;
  quantity: number;
  qualified_quantity: number;
  unqualified_quantity: number;
  qualification_rate: number;
  status: string;
  inspector?: string;
  inspection_time?: string;
  result?: string;
  memo?: string;
  created_at: string;
}

export interface OeeRecord {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  record_date: string;
  shift?: string;
  planned_production_time: number;
  run_time: number;
  downtime: number;
  ideal_cycle_time: number;
  total_count: number;
  good_count: number;
  reject_count: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOeeRecordRequest {
  equipment_id: string;
  record_date: string;
  shift?: string;
  planned_production_time: number;
  run_time: number;
  downtime: number;
  ideal_cycle_time: number;
  total_count: number;
  good_count: number;
  reject_count: number;
}

export interface UpdateOeeRecordRequest {
  shift?: string;
  planned_production_time?: number;
  run_time?: number;
  downtime?: number;
  ideal_cycle_time?: number;
  total_count?: number;
  good_count?: number;
  reject_count?: number;
}

export interface OeeStatistics {
  total_records: number;
  avg_availability: number;
  avg_performance: number;
  avg_quality: number;
  avg_oee: number;
  trend: Array<{
    date: string;
    availability: number;
    performance: number;
    quality: number;
    oee: number;
  }>;
  by_equipment: Array<{
    equipment_id: string;
    equipment_code: string;
    equipment_name: string;
    availability: number;
    performance: number;
    quality: number;
    oee: number;
  }>;
}

export interface EquipmentEfficiencyAnalysis {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  period: string;
  total_run_time: number;
  total_downtime: number;
  total_output: number;
  avg_oee: number;
  availability: number;
  performance: number;
  quality: number;
  downtime_reasons: Array<{
    reason: string;
    duration: number;
    percentage: number;
  }>;
  production_trend: Array<{
    date: string;
    output: number;
    oee: number;
  }>;
}

export interface Wip {
  id: string;
  order_id: string;
  order_number?: string;
  process_id?: string;
  process_name?: string;
  work_station_id?: string;
  work_station_name?: string;
  quantity: number;
  unit?: string;
  batch_no?: string;
  status: string;
  inbound_time?: string;
  outbound_time?: string;
  operator?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWipRequest {
  order_id: string;
  process_id?: string;
  work_station_id?: string;
  quantity: number;
  unit?: string;
  batch_no?: string;
  operator?: string;
  remarks?: string;
}

export interface UpdateWipRequest {
  quantity?: number;
  status?: string;
  inbound_time?: string;
  outbound_time?: string;
  operator?: string;
  remarks?: string;
}

export interface WipTransfer {
  id: string;
  transfer_no: string;
  wip_id: string;
  from_work_station_id?: string;
  from_work_station_name?: string;
  to_work_station_id?: string;
  to_work_station_name?: string;
  from_process_id?: string;
  from_process_name?: string;
  to_process_id?: string;
  to_process_name?: string;
  quantity: number;
  unit?: string;
  operator: string;
  transfer_time: string;
  status: string;
  remarks?: string;
  created_at: string;
}

export interface TransferWipRequest {
  wip_id: string;
  to_work_station_id?: string;
  to_process_id?: string;
  quantity: number;
  operator: string;
  remarks?: string;
}

export interface WipStatistics {
  total_wip: number;
  total_quantity: number;
  by_process: Array<{
    process_id: string;
    process_name: string;
    wip_count: number;
    quantity: number;
  }>;
  by_work_station: Array<{
    work_station_id: string;
    work_station_name: string;
    wip_count: number;
    quantity: number;
  }>;
  by_status: Array<{
    status: string;
    wip_count: number;
    quantity: number;
  }>;
}

export interface WorkReport {
  id: string;
  report_no: string;
  order_id: string;
  order_number?: string;
  process_id?: string;
  process_name?: string;
  work_station_id?: string;
  work_station_name?: string;
  team_id?: string;
  team_name?: string;
  worker_id?: string;
  worker_name: string;
  quantity_good: number;
  quantity_bad: number;
  quantity_total: number;
  start_time: string;
  end_time: string;
  actual_duration?: number;
  standard_duration?: number;
  status: string;
  report_type?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkReportRequest {
  order_id: string;
  process_id?: string;
  work_station_id?: string;
  team_id?: string;
  worker_id?: string;
  worker_name: string;
  quantity_good: number;
  quantity_bad?: number;
  start_time: string;
  end_time: string;
  report_type?: string;
  remark?: string;
}

export interface UpdateWorkReportRequest {
  quantity_good?: number;
  quantity_bad?: number;
  start_time?: string;
  end_time?: string;
  status?: string;
  remark?: string;
}

export interface WorkOrder {
  id: string;
  work_order_no: string;
  order_id: string;
  order_number?: string;
  process_id?: string;
  process_name?: string;
  work_station_id?: string;
  work_station_name?: string;
  team_id?: string;
  team_name?: string;
  quantity: number;
  completed_quantity?: number;
  good_quantity?: number;
  bad_quantity?: number;
  planned_start_time?: string;
  planned_end_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  priority?: string;
  status: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkOrderRequest {
  order_id: string;
  process_id?: string;
  work_station_id?: string;
  team_id?: string;
  quantity: number;
  planned_start_time?: string;
  planned_end_time?: string;
  priority?: string;
  remark?: string;
}

export interface UpdateWorkOrderRequest {
  work_station_id?: string;
  team_id?: string;
  quantity?: number;
  planned_start_time?: string;
  planned_end_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  priority?: string;
  status?: string;
  remark?: string;
}

export interface Team {
  id: string;
  team_code: string;
  team_name: string;
  team_type?: string;
  work_station_id?: string;
  work_station_name?: string;
  leader_id?: string;
  leader_name?: string;
  member_count?: number;
  status: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  employee_id: string;
  employee_name: string;
  employee_code?: string;
  position?: string;
  join_date?: string;
  status: string;
}

export interface CreateTeamRequest {
  team_code: string;
  team_name: string;
  team_type?: string;
  work_station_id?: string;
  leader_id?: string;
  description?: string;
  members?: Array<{
    employee_id: string;
    employee_name: string;
    position?: string;
  }>;
}

export interface UpdateTeamRequest {
  team_name?: string;
  team_type?: string;
  work_station_id?: string;
  leader_id?: string;
  status?: string;
  description?: string;
}

export interface MaterialRequirement {
  id: string;
  mrp_no: string;
  order_id?: string;
  order_number?: string;
  product_code: string;
  product_name: string;
  material_code: string;
  material_name: string;
  specification?: string;
  unit?: string;
  required_quantity: number;
  available_quantity?: number;
  shortfall_quantity?: number;
  required_date: string;
  priority?: string;
  status: string;
  source_type?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialRequirementRequest {
  order_id?: string;
  product_code: string;
  product_name: string;
  material_code: string;
  material_name: string;
  specification?: string;
  unit?: string;
  required_quantity: number;
  required_date: string;
  priority?: string;
  source_type?: string;
  remark?: string;
}

export interface UpdateMaterialRequirementRequest {
  required_quantity?: number;
  available_quantity?: number;
  required_date?: string;
  priority?: string;
  status?: string;
  remark?: string;
}

export interface ProductionKanbanData {
  summary: {
    total_orders: number;
    in_progress_orders: number;
    completed_orders: number;
    today_output: number;
    pass_rate: number;
    oee: number;
  };
  order_progress: Array<{
    order_id: string;
    order_number: string;
    product_name: string;
    planned_quantity: number;
    completed_quantity: number;
    progress: number;
    status: string;
  }>;
  workstation_status: Array<{
    work_station_id: string;
    work_station_name: string;
    status: string;
    current_order?: string;
    current_product?: string;
    output_today?: number;
    operator?: string;
  }>;
  quality_trend: Array<{
    date: string;
    pass_rate: number;
    total_quantity: number;
    good_quantity: number;
  }>;
  equipment_status: Array<{
    equipment_id: string;
    equipment_name: string;
    equipment_code: string;
    status: string;
    oee?: number;
  }>;
}
