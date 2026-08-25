// MES 模块全量 DTO — 单一事实源（与 svc/mes/src/models/*.rs 1:1 对齐）

// ==================== E-1 ProductionOrder ====================
export interface ProductionOrder {
  id: string;
  order_no: string;
  product_id: string | null;
  product_name: string;
  product_code: string;
  quantity: number;
  completed_quantity: number;
  status: ProductionOrderStatus;
  source: ProductionOrderSource;
  source_order_id: string | null;
  source_order_number: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  workshop_id: string | null;
  notes: string | null;
  approval_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductionOrderStatus =
  'draft' | 'released' | 'in_progress' | 'completed' | 'cancelled';
type ProductionOrderSource = 'manual' | 'erp_sales_order' | 'mrp';

export interface CreateProductionOrderRequest {
  product_id?: string | null;
  product_name: string;
  product_code: string;
  quantity: number;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  workshop_id?: string | null;
  notes?: string | null;
}

export interface UpdateProductionOrderRequest {
  product_name?: string;
  product_code?: string;
  quantity?: number;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  workshop_id?: string | null;
  notes?: string | null;
}

// ==================== E-2 WorkOrder ====================
export interface WorkOrder {
  id: string;
  order_id: string;
  order_number: string;
  product_name: string;
  product_code: string;
  quantity: number;
  completed_quantity: number;
  status: WorkOrderStatus;
  equipment_id: string | null;
  station_id: string | null;
  planned_start_time: string | null;
  planned_end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkOrderStatus =
  | 'created'
  | 'dispatched'
  | 'material_picked'
  | 'working'
  | 'reporting'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface CreateWorkOrderRequest {
  order_id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  equipment_id?: string | null;
  station_id?: string | null;
  planned_start_time?: string | null;
  planned_end_time?: string | null;
}

export interface UpdateWorkOrderRequest {
  quantity?: number;
  equipment_id?: string | null;
  station_id?: string | null;
  planned_start_time?: string | null;
  planned_end_time?: string | null;
}

// ==================== E-3 WorkReport ====================
export interface WorkReport {
  id: string;
  work_order_id: string;
  worker_id: string;
  worker_name: string;
  quantity_good: number;
  quantity_bad: number;
  quantity_total: number;
  status: WorkReportStatus;
  submitted_at: string | null;
  archived_at: string | null;
  rework_approval_id: string | null;
  defect_cause: string | null;
  rework_plan: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkReportStatus = 'draft' | 'submitted' | 'archived' | 'rejected' | 'reworking';

export interface CreateWorkReportRequest {
  work_order_id: string;
  worker_id: string;
  worker_name: string;
  quantity_good: number;
  quantity_bad: number;
}

export interface UpdateWorkReportRequest {
  quantity_good?: number;
  quantity_bad?: number;
}

// ==================== E-4 QualityInspection ====================
export interface QualityInspection {
  id: string;
  work_report_id: string;
  inspector_id: string;
  inspector_name: string;
  result: QualityInspectionResult;
  defect_type: string | null;
  defect_description: string | null;
  concession_approval_id: string | null;
  risk_assessment: string | null;
  customer_notified: boolean;
  created_at: string;
  updated_at: string;
}

export type QualityInspectionResult =
  | 'pending'
  | 'inspecting'
  | 'passed'
  | 'failed'
  | 'concession_received'
  | 'rework_assigned'
  | 'scrapped';

export interface CreateQualityInspectionRequest {
  work_report_id: string;
  inspector_id: string;
  inspector_name: string;
}

// ==================== E-5 TraceabilityRecord ====================
export interface TraceabilityRecord {
  id: string;
  batch_id: string;
  lot_code: string;
  source_id: string | null;
  status: TraceabilityStatus;
  freeze_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type TraceabilityStatus = 'active' | 'frozen' | 'locked' | 'investigating' | 'resolved';

// ==================== E-6 Equipment ====================
export interface Equipment {
  id: string;
  name: string;
  code: string;
  workshop_id: string | null;
  status: EquipmentStatus;
  oee_rate: number;
  created_at: string;
  updated_at: string;
}

export type EquipmentStatus =
  'running' | 'idle' | 'calibrating' | 'down' | 'maintenance' | 'scrapped';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyStatus =
  'monitoring' | 'triggered' | 'acknowledged' | 'handling' | 'closed' | 'false_alarm_verified';
