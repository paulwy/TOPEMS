import type { ApiResponse } from '../client';

export interface Sample {
  id: string;
  sample_no?: string;
  name: string;
  description: string;
  status: string;
  stage?: string;
  project_id?: string;
  location?: string;
  responsible_person?: string;
  received_date: string;
  sample_type?: string;
  source?: string;
  quantity?: number;
  unit?: string;
  storage_condition?: string;
  expiry_date?: string;
  barcode?: string;
  rfid_tag?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSampleRequest {
  name: string;
  description: string;
  status: string;
  project_id?: string;
  received_date?: string;
  sample_type?: string;
  source?: string;
  quantity?: number;
  unit?: string;
  storage_condition?: string;
  expiry_date?: string;
  location?: string;
  responsible_person?: string;
}

export interface UpdateSampleRequest extends Partial<CreateSampleRequest> {}

export interface LifecycleStage {
  id: string;
  name: string;
  code: string;
  description?: string;
  order: number;
  isactive: boolean;
  created_at: string;
  updated_at: string;
}

export interface LifecycleEvent {
  id: string;
  sample_id: string;
  stage: string;
  stage_name: string;
  event_type: string;
  description?: string;
  operator?: string;
  occurred_at: string;
  location?: string;
  remarks?: string;
  created_at: string;
}

export interface CreateLifecycleEventRequest {
  sample_id: string;
  stage: string;
  event_type: string;
  description?: string;
  operator?: string;
  occurred_at?: string;
  location?: string;
  remarks?: string;
}

export interface TransitionStageRequest {
  sample_id: string;
  target_stage: string;
  operator?: string;
  remarks?: string;
}

export interface TraceabilityRecord {
  id: string;
  sample_id: string;
  operation_type: string;
  operation_description: string;
  operator?: string;
  operation_time: string;
  source_location?: string;
  target_location?: string;
  related_task_id?: string;
  related_record_id?: string;
  created_at: string;
}

export interface SampleTraceability {
  sample: Sample;
  lifecycle_events: LifecycleEvent[];
  traceability_records: TraceabilityRecord[];
  related_tasks: InspectionTask[];
  related_records: InspectionRecord[];
}

export interface InspectionStep {
  id: string;
  name: string;
  description: string;
  order: number;
  required: boolean;
}

export interface InspectionProcess {
  id: string;
  name: string;
  description: string;
  steps: InspectionStep[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionTask {
  id: string;
  task_no?: string;
  sample_id: string;
  sample_name?: string;
  process_id: string;
  current_step: number;
  status: string;
  inspector: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInspectionTaskRequest {
  sample_id: string;
  process_id: string;
  inspector: string;
}

export interface InspectionRecord {
  id: string;
  task_id: string;
  step_id: string;
  step_name: string;
  result: string;
  conclusion: string;
  inspector: string;
  recorded_at: string;
  created_at: string;
}

export interface CreateInspectionRecordRequest {
  task_id: string;
  step_id: string;
  step_name: string;
  result: string;
  conclusion: string;
  inspector: string;
}

export interface BatchCreateSamplesRequest {
  samples: CreateSampleRequest[];
}

export interface BatchDeleteSamplesRequest {
  ids: string[];
}

export interface BatchOperationResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export interface ListParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
  project_id?: string;
  [key: string]: string | number | undefined;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
}

export interface Instrument {
  id: string;
  name: string;
  code: string;
  type: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  location?: string;
  status: string;
  purchase_date?: string;
  calibration_date?: string;
  next_calibration_date?: string;
  responsible_person?: string;
  description?: string;
  maintenance_records?: MaintenanceRecord[];
  created_at: string;
  updated_at: string;
}

export interface CreateInstrumentRequest {
  name: string;
  code: string;
  type: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  location?: string;
  status?: string;
  purchase_date?: string;
  calibration_date?: string;
  next_calibration_date?: string;
  responsible_person?: string;
  description?: string;
}

export interface MaintenanceRecord {
  id: string;
  instrument_id: string;
  maintenance_type: string;
  description: string;
  performed_by: string;
  performed_at: string;
  next_maintenance_date?: string;
  cost?: number;
  notes?: string;
  created_at: string;
}

export interface CreateMaintenanceRecordRequest {
  instrument_id: string;
  maintenance_type: string;
  description: string;
  performed_by: string;
  performed_at: string;
  next_maintenance_date?: string;
  cost?: number;
  notes?: string;
}

export interface CalibrationRecord {
  id: string;
  instrument_id: string;
  calibration_date: string;
  next_calibration_date?: string;
  calibration_type: string;
  result: string;
  certificate_no?: string;
  performed_by: string;
  cost?: number;
  notes?: string;
  created_at: string;
}

export interface CreateCalibrationRequest {
  instrument_id: string;
  calibration_date: string;
  next_calibration_date?: string;
  calibration_type: string;
  result: string;
  certificate_no?: string;
  performed_by: string;
  cost?: number;
  notes?: string;
}

export interface Reagent {
  id: string;
  name: string;
  code: string;
  category?: string;
  specification?: string;
  batch_no?: string;
  manufacturer?: string;
  supplier?: string;
  cas_no?: string;
  molecular_formula?: string;
  purity?: string;
  quantity: number;
  unit: string;
  min_stock?: number;
  storage_condition?: string;
  hazardlevel?: string;
  received_date?: string;
  expiry_date?: string;
  status: string;
  responsible_person?: string;
  location?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReagentRequest {
  name: string;
  code: string;
  category?: string;
  specification?: string;
  batch_no?: string;
  manufacturer?: string;
  supplier?: string;
  cas_no?: string;
  molecular_formula?: string;
  purity?: string;
  quantity: number;
  unit: string;
  min_stock?: number;
  storage_condition?: string;
  hazardlevel?: string;
  received_date?: string;
  expiry_date?: string;
  status?: string;
  responsible_person?: string;
  location?: string;
  description?: string;
}

export interface UpdateReagentRequest extends Partial<CreateReagentRequest> {}

export interface Barcode {
  id: string;
  barcode: string;
  barcode_type: string;
  sample_id?: string;
  sample_name?: string;
  format: string;
  content?: string;
  status: string;
  generated_at: string;
  printed_at?: string;
  scanned_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBarcodeRequest {
  barcode_type: string;
  sample_id?: string;
  format: string;
  content?: string;
  quantity?: number;
  prefix?: string;
}

export interface UpdateBarcodeRequest {
  sample_id?: string;
  status?: string;
}

export interface BarcodeType {
  id: string;
  name: string;
  code: string;
  format: string;
  description?: string;
  isactive: boolean;
  created_at: string;
}

export interface PrintBarcodeRequest {
  barcode_ids: string[];
  printer?: string;
  copies?: number;
  template?: string;
}

export interface ScanBarcodeResult {
  barcode: string;
  sample?: Sample;
  lifecycle_events?: LifecycleEvent[];
  traceability?: SampleTraceability;
}

export interface RfidTag {
  id: string;
  tag_id: string;
  epc?: string;
  sample_id?: string;
  sample_name?: string;
  status: string;
  assigned_at?: string;
  last_read_at?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRfidTagRequest {
  tag_id: string;
  epc?: string;
  sample_id?: string;
}

export interface AssignRfidTagRequest {
  tag_id: string;
  sample_id: string;
}

export interface PrintConfig {
  id: string;
  name: string;
  printer_type: string;
  papersize: string;
  label_template?: string;
  is_default: boolean;
  config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TestMethod {
  id: string;
  method_code: string;
  method_name: string;
  category_id?: string;
  category_name?: string;
  standard?: string;
  version: string;
  description?: string;
  principle?: string;
  instruments?: Record<string, any>;
  reagents?: Record<string, any>;
  parameters?: Record<string, any>;
  steps?: Record<string, any>;
  calculation_formula?: string;
  uncertainty_ref?: string;
  status: string;
  validated: boolean;
  validated_at?: string;
  validated_by?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTestMethodRequest {
  method_code: string;
  method_name: string;
  category_id?: string;
  standard?: string;
  description?: string;
  principle?: string;
  instruments?: Record<string, any>;
  reagents?: Record<string, any>;
  parameters?: Record<string, any>;
  steps?: Record<string, any>;
  calculation_formula?: string;
  uncertainty_ref?: string;
}

export interface UpdateTestMethodRequest {
  method_name?: string;
  category_id?: string;
  standard?: string;
  description?: string;
  principle?: string;
  instruments?: Record<string, any>;
  reagents?: Record<string, any>;
  parameters?: Record<string, any>;
  steps?: Record<string, any>;
  calculation_formula?: string;
  uncertainty_ref?: string;
  status?: string;
}

export interface MethodVersion {
  id: string;
  method_id: string;
  version: string;
  version_description?: string;
  change_log?: string;
  is_current: boolean;
  created_by?: string;
  created_at: string;
}

export interface CreateMethodVersionRequest {
  version_description?: string;
  change_log?: string;
}

export interface MethodCategory {
  id: string;
  category_code: string;
  category_name: string;
  parent_id?: string;
  sort_order: number;
  description?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMethodCategoryRequest {
  category_code: string;
  category_name: string;
  parent_id?: string;
  sort_order?: number;
  description?: string;
}

export interface UpdateMethodCategoryRequest {
  category_name?: string;
  parent_id?: string;
  sort_order?: number;
  description?: string;
  status?: string;
}

export interface MethodValidation {
  id: string;
  method_id: string;
  method_code: string;
  method_name: string;
  version: string;
  validation_type: string;
  validation_date: string;
  validated_by: string;
  conclusion: string;
  parameters?: Record<string, any>;
  report_url?: string;
  notes?: string;
  status: string;
  created_at: string;
}

export interface CreateMethodValidationRequest {
  method_id: string;
  validation_type: string;
  validation_date?: string;
  validated_by: string;
  conclusion: string;
  parameters?: Record<string, any>;
  report_url?: string;
  notes?: string;
}

export interface PtPlan {
  id: string;
  plan_no: string;
  plan_name: string;
  provider?: string;
  testitem?: string;
  test_method?: string;
  plan_year?: string;
  sample_type?: string;
  expected_result?: Record<string, any>;
  registration_date?: string;
  test_deadline?: string;
  report_deadline?: string;
  status: string;
  contact_person?: string;
  contact_phone?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePtPlanRequest {
  plan_name: string;
  provider?: string;
  testitem?: string;
  test_method?: string;
  plan_year?: string;
  sample_type?: string;
  expected_result?: Record<string, any>;
  registration_date?: string;
  test_deadline?: string;
  report_deadline?: string;
  contact_person?: string;
  contact_phone?: string;
  notes?: string;
}

export interface UpdatePtPlanRequest {
  plan_name?: string;
  provider?: string;
  testitem?: string;
  test_method?: string;
  plan_year?: string;
  sample_type?: string;
  expected_result?: Record<string, any>;
  registration_date?: string;
  test_deadline?: string;
  report_deadline?: string;
  status?: string;
  contact_person?: string;
  contact_phone?: string;
  notes?: string;
}

export interface PtSample {
  id: string;
  plan_id: string;
  plan_no: string;
  plan_name: string;
  sample_code: string;
  sample_name?: string;
  received_date?: string;
  received_by?: string;
  storage_condition?: string;
  sample_status: string;
  notes?: string;
  created_at?: string;
}

export interface PtSampleReceiveRequest {
  plan_id: string;
  sample_code: string;
  sample_name?: string;
  received_by?: string;
  storage_condition?: string;
  notes?: string;
}

export interface PtResult {
  id: string;
  plan_id: string;
  plan_no: string;
  sample_id: string;
  sample_code: string;
  testitem: string;
  test_result?: number;
  result_unit?: string;
  test_date?: string;
  tested_by?: string;
  instrument?: string;
  test_method?: string;
  replicate_results?: Record<string, any>;
  mean_value?: number;
  standard_deviation?: number;
  coefficient_variation?: number;
  notes?: string;
  submitted_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePtResultRequest {
  plan_id: string;
  sample_id: string;
  testitem: string;
  test_result?: number;
  result_unit?: string;
  test_date?: string;
  tested_by?: string;
  instrument?: string;
  test_method?: string;
  replicate_results?: Record<string, any>;
  notes?: string;
}

export interface PtEvaluation {
  id: string;
  plan_id: string;
  plan_no: string;
  sample_id: string;
  sample_code: string;
  testitem: string;
  test_result?: number;
  assigned_value?: number;
  standard_deviation?: number;
  z_score?: number;
  en_score?: number;
  measurement_uncertainty?: number;
  reference_uncertainty?: number;
  evaluation_method?: string;
  evaluation_result?: string;
  evaluated_by?: string;
  evaluated_at?: string;
  notes?: string;
  created_at?: string;
}

export interface PtEvaluateRequest {
  plan_id: string;
  result_id: string;
  assigned_value: number;
  standard_deviation?: number;
  measurement_uncertainty?: number;
  reference_uncertainty?: number;
  evaluation_method?: string;
  evaluated_by?: string;
  notes?: string;
}

export interface PtCorrectiveAction {
  id: string;
  plan_id: string;
  plan_no: string;
  evaluation_id: string;
  unsatisfactoryitem: string;
  root_cause?: string;
  corrective_measures?: string;
  responsible_person?: string;
  deadline?: string;
  status: string;
  verification_result?: string;
  verified_by?: string;
  verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePtCorrectiveActionRequest {
  plan_id: string;
  evaluation_id: string;
  unsatisfactoryitem: string;
  root_cause?: string;
  corrective_measures?: string;
  responsible_person?: string;
  deadline?: string;
}

export interface UpdatePtCorrectiveActionRequest {
  root_cause?: string;
  corrective_measures?: string;
  responsible_person?: string;
  deadline?: string;
  status?: string;
  verification_result?: string;
  verified_by?: string;
}

export interface UncertaintyProject {
  id: string;
  project_no: string;
  project_name: string;
  method_id?: string;
  method_name?: string;
  testitem?: string;
  measurand?: string;
  measurement_range?: string;
  unit?: string;
  status: string;
  evaluator?: string;
  evaluation_date?: string;
  combined_uncertainty?: number;
  expanded_uncertainty?: number;
  coverage_factor?: number;
  confidencelevel?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUncertaintyProjectRequest {
  project_name: string;
  method_id?: string;
  method_name?: string;
  testitem?: string;
  measurand?: string;
  measurement_range?: string;
  unit?: string;
  evaluator?: string;
  notes?: string;
}

export interface UpdateUncertaintyProjectRequest {
  project_name?: string;
  method_id?: string;
  method_name?: string;
  testitem?: string;
  measurand?: string;
  measurement_range?: string;
  unit?: string;
  status?: string;
  evaluator?: string;
  evaluation_date?: string;
  coverage_factor?: number;
  confidencelevel?: number;
  notes?: string;
}

export interface UncertaintySource {
  id: string;
  project_id: string;
  source_name: string;
  source_type: string;
  description?: string;
  distribution_type?: string;
  sensitivity_coefficient?: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUncertaintySourceRequest {
  project_id: string;
  source_name: string;
  source_type: string;
  description?: string;
  distribution_type?: string;
  sensitivity_coefficient?: number;
  sort_order?: number;
}

export interface UpdateUncertaintySourceRequest {
  source_name?: string;
  source_type?: string;
  description?: string;
  distribution_type?: string;
  sensitivity_coefficient?: number;
  sort_order?: number;
}

export interface UncertaintyComponent {
  id: string;
  project_id: string;
  source_id: string;
  source_name: string;
  component_type: string;
  component_name: string;
  standard_uncertainty?: number;
  relative_uncertainty?: number;
  sensitivity_coefficient?: number;
  degrees_freedom?: number;
  calculation_method?: string;
  parameters?: Record<string, any>;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUncertaintyComponentRequest {
  project_id: string;
  source_id: string;
  component_type: string;
  component_name: string;
  standard_uncertainty?: number;
  relative_uncertainty?: number;
  sensitivity_coefficient?: number;
  degrees_freedom?: number;
  calculation_method?: string;
  parameters?: Record<string, any>;
  description?: string;
}

export interface UpdateUncertaintyComponentRequest {
  component_name?: string;
  standard_uncertainty?: number;
  relative_uncertainty?: number;
  sensitivity_coefficient?: number;
  degrees_freedom?: number;
  calculation_method?: string;
  parameters?: Record<string, any>;
  description?: string;
}

export interface TypeACalculationRequest {
  project_id: string;
  source_id: string;
  component_name: string;
  measurements: number[];
  sensitivity_coefficient?: number;
}

export interface TypeBCalculationRequest {
  project_id: string;
  source_id: string;
  component_name: string;
  uncertainty_value: number;
  distribution_type: string;
  sensitivity_coefficient?: number;
  degrees_freedom?: number;
  description?: string;
}

export interface UncertaintyCalculationResult {
  combined_uncertainty: number;
  expanded_uncertainty: number;
  coverage_factor: number;
  effective_degrees_of_freedom?: number;
  component_count: number;
}

export interface UncertaintyReport {
  report_title: string;
  report_no: string;
  generated_at: string;
  project: Record<string, any>;
  sources: Record<string, any>[];
  components: Record<string, any>[];
  summary: {
    source_count: number;
    component_count: number;
  };
  sections: Array<{
    title: string;
    content: string;
  }>;
}

export interface SyncRecord {
  id: string;
  sync_type: string;
  source_system: string;
  target_system: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  retry_count: number;
  max_retries?: number;
  payload?: Record<string, any>;
  result?: Record<string, any>;
  error_message?: string;
  synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncRecordQueryParams extends ListParams {
  sync_type?: string;
  source_system?: string;
  target_system?: string;
  entity_type?: string;
  status?: string;
}

export interface LimsStatistics {
  total_samples: number;
  pending_samples: number;
  testing_samples: number;
  completed_samples: number;
  cancelled_samples: number;

  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;

  total_processes: number;

  total_instruments: number;
  normal_instruments: number;
  calibration_instruments: number;
  maintenance_instruments: number;
  disabled_instruments: number;
}

export interface InstrumentData {
  id: string;
  data_no: string;
  instrument_id?: string;
  instrument_no?: string;
  instrument_name?: string;
  batch_no: string;
  protocol: string;
  raw_data?: Record<string, any>;
  parsed_data?: Record<string, any>;
  status: string;
  quality_score?: number;
  error_msg?: string;
  collected_at?: string;
  parsed_at?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateInstrumentDataRequest {
  instrument_id?: string;
  protocol: string;
  raw_data: Record<string, any>;
  batch_no?: string;
}

export interface UpdateInstrumentDataRequest {
  status?: string;
  parsed_data?: Record<string, any>;
  error_msg?: string;
}

export interface TestItemResult {
  testitem: string;
  testitem_name?: string;
  result?: string;
  numeric_result?: number;
  unit?: string;
  reference_range?: string;
  status?: string;
  abnormal_flag?: string;
}

export interface ParseResult {
  success: boolean;
  parsed_data?: Record<string, any>;
  quality_score?: number;
  error_msg?: string;
  testitems?: TestItemResult[];
}

export interface ParseDataRequest {
  protocol: string;
  raw_data: Record<string, any>;
  parse_rule_id?: string;
}

export interface CollectionTask {
  id: string;
  task_no: string;
  task_name: string;
  instrument_id?: string;
  instrument_no?: string;
  instrument_name?: string;
  protocol: string;
  collection_mode: string;
  cron_expression?: string;
  interval_minutes?: number;
  parse_rule_id?: string;
  status: string;
  last_run_at?: string;
  next_run_at?: string;
  total_collections: number;
  success_count: number;
  failed_count: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCollectionTaskRequest {
  task_name: string;
  instrument_id?: string;
  protocol: string;
  collection_mode: string;
  cron_expression?: string;
  interval_minutes?: number;
  parse_rule_id?: string;
}

export interface UpdateCollectionTaskRequest {
  task_name?: string;
  status?: string;
  cron_expression?: string;
  interval_minutes?: number;
  parse_rule_id?: string;
}

export interface ParseRule {
  id: string;
  rule_no: string;
  rule_name: string;
  protocol: string;
  instrument_type?: string;
  parse_config?: Record<string, any>;
  quality_rules?: Record<string, any>;
  status: string;
  version: string;
  description?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateParseRuleRequest {
  rule_name: string;
  protocol: string;
  instrument_type?: string;
  parse_config?: Record<string, any>;
  quality_rules?: Record<string, any>;
  description?: string;
}

export interface UpdateParseRuleRequest {
  rule_name?: string;
  status?: string;
  parse_config?: Record<string, any>;
  quality_rules?: Record<string, any>;
  description?: string;
}

export interface InstrumentDataStatistics {
  total_data_count: number;
  today_count: number;
  success_count: number;
  failed_count: number;
  pending_count: number;
  total_tasks: number;
  running_tasks: number;
  total_rules: number;
  protocol_distribution?: Array<{ protocol: string; count: number }>;
  instrument_distribution?: Array<{
    instrument_id: string;
    instrument_name: string;
    count: number;
  }>;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_ids?: string[] | null;
  user_id?: string;
  user_name?: string;
  request_details?: Record<string, unknown>;
  response_details?: Record<string, unknown>;
  status: 'success' | 'partial' | 'error';
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditLogQueryParams {
  action?: string;
  entity_type?: string;
  user_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  pagesize?: number;
}
