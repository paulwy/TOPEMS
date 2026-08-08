import type { PaginationParams } from '../client';

/**
 * 供应商
 */
export interface Supplier {
  id: string;
  name: string;
  short_name?: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  bank_account?: string;
  tax_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  short_name?: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  bank_account?: string;
  tax_number?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  short_name?: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  bank_account?: string;
  tax_number?: string;
  status?: string;
}

/**
 * 采购订单
 */
export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id?: string;
  order_date: string;
  delivery_date?: string;
  total_amount?: number;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderRequest {
  order_number: string;
  supplier_id?: string;
  order_date: string;
  delivery_date?: string;
  total_amount?: number;
  remarks?: string;
}

export interface UpdatePurchaseOrderRequest {
  supplier_id?: string;
  delivery_date?: string;
  total_amount?: number;
  status?: string;
  remarks?: string;
}

/**
 * 采购明细
 */
export interface PurchaseItem {
  id: string;
  order_id: string;
  product_code?: string;
  product_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unit_price?: number;
  amount?: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseItemRequest {
  order_id: string;
  product_code?: string;
  product_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unit_price?: number;
  amount?: number;
}

export interface UpdatePurchaseItemRequest {
  product_code?: string;
  product_name?: string;
  specification?: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
}

export interface PurchaseItemQueryParams extends PaginationParams {
  order_id?: string;
}

/**
 * 供应商评估
 */
export interface SupplierEvaluation {
  id: string;
  supplier_id: string;
  evaluation_date: string;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  overall_score?: number;
  comments?: string;
  evaluator?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierEvaluationRequest {
  supplier_id: string;
  evaluation_date: string;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  overall_score?: number;
  comments?: string;
  evaluator?: string;
}

export interface UpdateSupplierEvaluationRequest {
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  overall_score?: number;
  comments?: string;
  evaluator?: string;
}

export interface SupplierEvaluationQueryParams extends PaginationParams {
  supplier_id?: string;
}

/**
 * MRP 物料需求计划
 */
export interface MrpPlan {
  id: string;
  plan_name: string;
  plan_code?: string;
  start_date: string;
  end_date: string;
  status: string;
  description?: string;
  calculated_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMrpPlanRequest {
  plan_name: string;
  plan_code?: string;
  start_date: string;
  end_date: string;
  description?: string;
}

export interface UpdateMrpPlanRequest {
  plan_name?: string;
  plan_code?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  description?: string;
}

export interface MrpPlanQueryParams extends PaginationParams {
  status?: string;
}

export interface MrpSuggestion {
  id: string;
  plan_id: string;
  product_code: string;
  product_name: string;
  specification?: string;
  unit?: string;
  required_quantity: number;
  available_quantity: number;
  suggested_quantity: number;
  suggestion_type: string;
  due_date?: string;
  supplier_id?: string;
  supplier_name?: string;
  status: string;
  created_at: string;
}

export interface MrpSuggestionQueryParams extends PaginationParams {
  plan_id?: string;
  suggestion_type?: string;
  status?: string;
}

export interface MrpCalculationResult {
  plan_id: string;
  totalitems: number;
  total_suggestions: number;
  purchase_suggestions: number;
  production_suggestions: number;
  calculated_at: string;
  message?: string;
}

export interface MrpMaterialSummary {
  product_code: string;
  product_name: string;
  specification?: string;
  unit?: string;
  total_demand: number;
  total_supply: number;
  net_demand: number;
  safety_stock?: number;
  category?: string;
}

export interface MrpMaterialSummaryQueryParams {
  plan_id?: string;
  category?: string;
}

/**
 * 到货检验
 */
export interface IncomingInspection {
  id: string;
  inspection_no: string;
  notice_no?: string;
  supplier_id?: string;
  supplier_name?: string;
  order_id?: string;
  orderNo?: string;
  warehouse?: string;
  inspection_date?: string;
  inspector?: string;
  status: string;
  total_quantity?: number;
  qualified_quantity?: number;
  unqualified_quantity?: number;
  inspection_result?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIncomingInspectionRequest {
  inspection_no: string;
  notice_no?: string;
  supplier_id?: string;
  order_id?: string;
  warehouse?: string;
  remarks?: string;
}

export interface UpdateIncomingInspectionRequest {
  supplier_id?: string;
  order_id?: string;
  warehouse?: string;
  inspection_date?: string;
  inspector?: string;
  status?: string;
  total_quantity?: number;
  qualified_quantity?: number;
  unqualified_quantity?: number;
  inspection_result?: string;
  remarks?: string;
}

export interface IncomingInspectionQueryParams extends PaginationParams {
  status?: string;
  supplier_id?: string;
}

export interface InspectionRecord {
  id: string;
  inspection_id: string;
  item_code?: string;
  item_name: string;
  specification?: string;
  unit?: string;
  batch_no?: string;
  quantity: number;
  samplesize?: number;
  inspectionitems?: string;
  inspection_method?: string;
  inspection_standard?: string;
  result: string;
  defect_details?: string;
  created_at: string;
}

export interface CreateInspectionRecordRequest {
  inspection_id: string;
  item_code?: string;
  item_name: string;
  specification?: string;
  unit?: string;
  batch_no?: string;
  quantity: number;
  samplesize?: number;
  inspectionitems?: string;
  inspection_method?: string;
  inspection_standard?: string;
  result: string;
  defect_details?: string;
}

export interface UpdateInspectionRecordRequest {
  item_code?: string;
  item_name?: string;
  specification?: string;
  unit?: string;
  batch_no?: string;
  quantity?: number;
  samplesize?: number;
  inspectionitems?: string;
  inspection_method?: string;
  inspection_standard?: string;
  result?: string;
  defect_details?: string;
}

export interface InspectionDisposalRequest {
  inspection_id: string;
  disposal_type: string;
  disposal_quantity: number;
  remarks?: string;
}

/**
 * 库存周转分析
 */
export interface InventoryTurnoverStat {
  id: string;
  product_code: string;
  product_name: string;
  specification?: string;
  unit?: string;
  category?: string;
  period: string;
  turnover_rate: number;
  turnover_days: number;
  beginning_inventory?: number;
  ending_inventory?: number;
  average_inventory?: number;
  cost_of_goods_sold?: number;
  sales_quantity?: number;
  abc_category?: string;
  calculated_at: string;
}

export interface InventoryTurnoverQueryParams extends PaginationParams {
  period?: string;
  category?: string;
  abc_category?: string;
}

export interface AbcClassification {
  product_code: string;
  product_name: string;
  specification?: string;
  category: string;
  cumulative_value: number;
  cumulative_percentage: number;
  abclevel: string;
  annual_usage_value: number;
  percentage_of_total: number;
}

export interface AbcClassificationQueryParams {
  period?: string;
  category?: string;
}

export interface TurnoverTrendData {
  date: string;
  turnover_rate: number;
  turnover_days: number;
  average_inventory: number;
  sales_amount: number;
}

export interface TurnoverTrendQueryParams {
  product_code?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  granularity?: string;
}

/**
 * 供应链看板
 */
export interface SupplyChainOverview {
  total_suppliers: number;
  active_suppliers: number;
  total_purchase_orders: number;
  pending_orders: number;
  total_inventory_value: number;
  inventory_turnover_rate: number;
  on_time_delivery_rate: number;
  quality_pass_rate: number;
  pending_inspection_count: number;
  total_amount_month: number;
  order_completion_rate: number;
}

export interface SupplyChainFullLinkStat {
  procurement_cycle_avg: number;
  inspection_cycle_avg: number;
  inventory_cycle_avg: number;
  total_cycle_avg: number;
  bottleneck_stage?: string;
  improvement_suggestions?: string[];
}

export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  order_count: number;
  on_time_delivery_rate: number;
  quality_pass_rate: number;
  price_stability_score: number;
  service_score: number;
  overall_score: number;
  grade?: string;
  rank?: number;
}

export interface SupplierPerformanceQueryParams extends PaginationParams {
  period?: string;
  grade?: string;
}

/**
 * 价格比价
 */
export interface PriceComparison {
  id: string;
  comparison_no: string;
  title: string;
  product_code?: string;
  product_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  deadline?: string;
  status: string;
  result_supplier_id?: string;
  result_supplier_name?: string;
  result_price?: number;
  result_amount?: number;
  creator?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePriceComparisonRequest {
  comparison_no: string;
  title: string;
  product_code?: string;
  product_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  deadline?: string;
  supplier_ids?: string[];
}

export interface UpdatePriceComparisonRequest {
  title?: string;
  product_code?: string;
  product_name?: string;
  specification?: string;
  unit?: string;
  quantity?: number;
  deadline?: string;
  status?: string;
  result_supplier_id?: string;
  result_price?: number;
  result_amount?: number;
}

export interface PriceComparisonQueryParams extends PaginationParams {
  status?: string;
  product_code?: string;
}

export interface SupplierQuote {
  id: string;
  comparison_id: string;
  supplier_id: string;
  supplier_name: string;
  unit_price: number;
  total_amount: number;
  delivery_date?: string;
  payment_terms?: string;
  warranty_period?: string;
  quote_remarks?: string;
  quote_time?: string;
  status: string;
}

export interface CreateSupplierQuoteRequest {
  comparison_id: string;
  supplier_id: string;
  unit_price: number;
  total_amount: number;
  delivery_date?: string;
  payment_terms?: string;
  warranty_period?: string;
  quote_remarks?: string;
}

export interface PriceComparisonResult {
  comparison_id: string;
  total_quotes: number;
  lowest_price: number;
  highest_price: number;
  average_price: number;
  recommended_supplier_id?: string;
  recommended_supplier_name?: string;
  price_difference_percentage: number;
  quotes: SupplierQuote[];
}

/**
 * 数据同步
 */
export interface SyncRecord {
  id: string;
  sync_no: string;
  source_system: string;
  target_system: string;
  sync_type: string;
  sync_direction: string;
  status: string;
  total_count?: number;
  success_count?: number;
  failed_count?: number;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
  operator?: string;
  created_at: string;
}

export interface CreateSyncRecordRequest {
  source_system: string;
  target_system: string;
  sync_type: string;
  sync_direction: string;
}

export interface SyncRecordQueryParams extends PaginationParams {
  source_system?: string;
  target_system?: string;
  sync_type?: string;
  status?: string;
}

export interface SyncResult {
  sync_id: string;
  status: string;
  total_count: number;
  success_count: number;
  failed_count: number;
  message?: string;
  started_at: string;
  completed_at?: string;
}

export interface SyncDetailRecord {
  id: string;
  sync_id: string;
  record_id?: string;
  record_name?: string;
  status: string;
  error_message?: string;
  created_at: string;
}

/**
 * 供应商送货预约
 */
export type DeliveryAppointmentStatus =
  'pending' | 'approved' | 'rejected' | 'arrived' | 'completed' | 'cancelled';

export interface SupplierDeliveryAppointment {
  id: string;
  appointment_no: string;
  purchase_order_id?: string;
  purchase_order_no?: string;
  supplier_id: string;
  supplier_name?: string;
  delivery_date: string;
  delivery_time?: string;
  delivery_method: string;
  vehicle_no?: string;
  driver_name?: string;
  driver_phone?: string;
  cargo_description?: string;
  total_quantity?: number;
  total_weight?: number;
  destination_warehouse?: string;
  expected_arrival_time?: string;
  actual_arrival_time?: string;
  status: DeliveryAppointmentStatus;
  applicant?: string;
  approver?: string;
  approved_at?: string;
  rejection_reason?: string;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierDeliveryAppointmentRequest {
  purchase_order_id?: string;
  purchase_order_no?: string;
  supplier_id: string;
  supplier_name?: string;
  delivery_date: string;
  delivery_time?: string;
  delivery_method: string;
  vehicle_no?: string;
  driver_name?: string;
  driver_phone?: string;
  cargo_description?: string;
  total_quantity?: number;
  total_weight?: number;
  destination_warehouse?: string;
  expected_arrival_time?: string;
  applicant?: string;
  remarks?: string;
}

export interface UpdateSupplierDeliveryAppointmentRequest {
  purchase_order_id?: string;
  purchase_order_no?: string;
  delivery_date?: string;
  delivery_time?: string;
  delivery_method?: string;
  vehicle_no?: string;
  driver_name?: string;
  driver_phone?: string;
  cargo_description?: string;
  total_quantity?: number;
  total_weight?: number;
  destination_warehouse?: string;
  expected_arrival_time?: string;
  status?: DeliveryAppointmentStatus;
  remarks?: string;
}

export interface DeliveryAppointmentQueryParams extends PaginationParams {
  status?: DeliveryAppointmentStatus;
  supplier_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface DeliveryAppointmentApprovalRequest {
  approver_name?: string;
  remarks?: string;
}

export interface DeliveryAppointmentArrivalRequest {
  actual_arrival_time?: string;
  remarks?: string;
}

export interface DeliveryAppointmentCompleteRequest {
  remarks?: string;
}

export interface DeliveryAppointmentCancelRequest {
  reason?: string;
}

export interface DeliveryAppointmentStats {
  total: number;
  upcoming: number;
  overdue: number;
  by_status: Record<string, number>;
}

/**
 * 审计日志
 */
export interface AuditLog {
  id: string;
  module: string;
  action: string;
  target_id?: string;
  target_name?: string;
  operator_id?: string;
  operator_name: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_url?: string;
  request_params?: string;
  old_value?: string;
  new_value?: string;
  status: string;
  error_message?: string;
  created_at: string;
}

export interface AuditLogQueryParams extends PaginationParams {
  module?: string;
  action?: string;
  operator_id?: string;
  target_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface AuditLogDetail {
  id: string;
  module: string;
  action: string;
  target_id?: string;
  target_name?: string;
  operator_id?: string;
  operator_name: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_url?: string;
  request_params?: Record<string, unknown>;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  status: string;
  error_message?: string;
  created_at: string;
  change_fields?: Array<{
    field: string;
    old_value: unknown;
    new_value: unknown;
  }>;
}

export interface PurchaseRequisition {
  id: string;
  requisition_no: string;
  title: string;
  applicant_id?: string;
  applicant_name?: string;
  department_id?: string;
  department_name?: string;
  request_date: string;
  required_date?: string;
  total_amount?: number;
  currency?: string;
  status: string;
  priority?: string;
  supplier_id?: string;
  supplier_name?: string;
  approval_status?: string;
  approver?: string;
  approved_at?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequisitionItem {
  id: string;
  requisition_id: string;
  line_number: number;
  product_code?: string;
  product_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unit_price?: number;
  amount?: number;
  remarks?: string;
  created_at: string;
}

export interface CreatePurchaseRequisitionRequest {
  requisition_no: string;
  title: string;
  applicant_id?: string;
  department_id?: string;
  request_date: string;
  required_date?: string;
  priority?: string;
  supplier_id?: string;
  remarks?: string;
  items?: CreatePurchaseRequisitionItemRequest[];
}

export interface CreatePurchaseRequisitionItemRequest {
  product_code?: string;
  product_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unit_price?: number;
  remarks?: string;
}

export interface UpdatePurchaseRequisitionRequest {
  title?: string;
  required_date?: string;
  priority?: string;
  supplier_id?: string;
  status?: string;
  remarks?: string;
  items?: CreatePurchaseRequisitionItemRequest[];
}

export interface PurchaseRequisitionQueryParams extends PaginationParams {
  status?: string;
  applicant_id?: string;
  department_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface PurchaseContract {
  id: string;
  contractNo: string;
  title: string;
  contract_type: string;
  supplier_id: string;
  supplier_name?: string;
  sign_date?: string;
  effective_date?: string;
  expiry_date?: string;
  total_amount?: number;
  currency?: string;
  payment_terms?: string;
  delivery_terms?: string;
  status: string;
  approval_status?: string;
  approver?: string;
  approved_at?: string;
  signed_by?: string;
  contract_file?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseContractItem {
  id: string;
  contract_id: string;
  line_number: number;
  product_code?: string;
  product_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unit_price?: number;
  amount?: number;
  delivery_date?: string;
  remarks?: string;
  created_at: string;
}

export interface CreatePurchaseContractRequest {
  contractNo: string;
  title: string;
  contract_type: string;
  supplier_id: string;
  sign_date?: string;
  effective_date?: string;
  expiry_date?: string;
  total_amount?: number;
  currency?: string;
  payment_terms?: string;
  delivery_terms?: string;
  signed_by?: string;
  remarks?: string;
  items?: CreatePurchaseContractItemRequest[];
}

export interface CreatePurchaseContractItemRequest {
  product_code?: string;
  product_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unit_price?: number;
  delivery_date?: string;
  remarks?: string;
}

export interface UpdatePurchaseContractRequest {
  title?: string;
  contract_type?: string;
  supplier_id?: string;
  sign_date?: string;
  effective_date?: string;
  expiry_date?: string;
  total_amount?: number;
  currency?: string;
  payment_terms?: string;
  delivery_terms?: string;
  status?: string;
  remarks?: string;
  items?: CreatePurchaseContractItemRequest[];
}

export interface PurchaseContractQueryParams extends PaginationParams {
  status?: string;
  supplier_id?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
}

export interface SupplierAdmission {
  id: string;
  admission_no: string;
  supplier_name: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  business_license?: string;
  tax_registration?: string;
  organization_code?: string;
  legal_representative?: string;
  registered_capital?: string;
  established_date?: string;
  business_scope?: string;
  supplier_category?: string;
  risk_level?: string;
  status: string;
  approval_status?: string;
  approver?: string;
  approved_at?: string;
  applicant?: string;
  application_date?: string;
  audit_items?: SupplierAdmissionAuditItem[];
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierAdmissionAuditItem {
  id: string;
  admission_id: string;
  audit_item: string;
  audit_result?: string;
  auditor?: string;
  audit_date?: string;
  remarks?: string;
  created_at: string;
}

export interface CreateSupplierAdmissionRequest {
  admission_no: string;
  supplier_name: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  business_license?: string;
  tax_registration?: string;
  organization_code?: string;
  legal_representative?: string;
  registered_capital?: string;
  established_date?: string;
  business_scope?: string;
  supplier_category?: string;
  applicant?: string;
  remarks?: string;
}

export interface UpdateSupplierAdmissionRequest {
  supplier_name?: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  business_license?: string;
  tax_registration?: string;
  organization_code?: string;
  legal_representative?: string;
  registered_capital?: string;
  established_date?: string;
  business_scope?: string;
  supplier_category?: string;
  risk_level?: string;
  status?: string;
  remarks?: string;
}

export interface SupplierAdmissionQueryParams extends PaginationParams {
  status?: string;
  approval_status?: string;
  supplier_category?: string;
  start_date?: string;
  end_date?: string;
}
