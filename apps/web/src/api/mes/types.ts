import type { ApiResponse } from '../client';

export interface PaginationParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
}

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
