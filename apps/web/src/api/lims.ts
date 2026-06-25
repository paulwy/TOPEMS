import apiClient, { downloadBlob } from './client';
import type { ApiResponse } from './client';
import config from '../config/runtime';

// ========== 类型定义 ==========

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
  is_active: boolean;
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
  page_size?: number;
  search?: string;
  status?: string;
  project_id?: string;
  [key: string]: string | number | undefined;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ========== 仪器管理类型定义 ==========

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

// ========== 试剂管理类型定义 ==========

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
  hazard_level?: string;
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
  hazard_level?: string;
  received_date?: string;
  expiry_date?: string;
  status?: string;
  responsible_person?: string;
  location?: string;
  description?: string;
}

export interface UpdateReagentRequest extends Partial<CreateReagentRequest> {}

// ========== 样品条码/RFID 类型定义 ==========

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
  is_active: boolean;
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
  paper_size: string;
  label_template?: string;
  is_default: boolean;
  config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ========== 检测方法库类型定义 ==========

export interface TestMethod {
  id: string;
  name: string;
  code: string;
  category_id?: string;
  category_name?: string;
  version: string;
  description?: string;
  scope?: string;
  principle?: string;
  instruments?: string[];
  reagents?: string[];
  steps?: string[];
  calculation_formula?: string;
  uncertainty_budget?: string;
  reference_standard?: string;
  status: string;
  is_validated: boolean;
  created_by?: string;
  approved_by?: string;
  effective_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTestMethodRequest {
  name: string;
  code: string;
  category_id?: string;
  version?: string;
  description?: string;
  scope?: string;
  principle?: string;
  instruments?: string[];
  reagents?: string[];
  steps?: string[];
  calculation_formula?: string;
  uncertainty_budget?: string;
  reference_standard?: string;
  status?: string;
}

export interface UpdateTestMethodRequest extends Partial<CreateTestMethodRequest> {}

export interface MethodVersion {
  id: string;
  method_id: string;
  version: string;
  change_description?: string;
  changed_by?: string;
  effective_date?: string;
  is_current: boolean;
  created_at: string;
}

export interface CreateMethodVersionRequest {
  method_id: string;
  version: string;
  change_description?: string;
  changed_by?: string;
  effective_date?: string;
}

export interface MethodCategory {
  id: string;
  name: string;
  code: string;
  parent_id?: string;
  description?: string;
  sort_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMethodCategoryRequest {
  name: string;
  code: string;
  parent_id?: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateMethodCategoryRequest extends Partial<CreateMethodCategoryRequest> {}

export interface MethodValidation {
  id: string;
  method_id: string;
  method_version?: string;
  validation_type: string;
  validation_date: string;
  result: string;
  conclusion?: string;
  performed_by?: string;
  validated_by?: string;
  parameters?: Record<string, any>;
  attachments?: string[];
  created_at: string;
}

export interface CreateMethodValidationRequest {
  method_id: string;
  method_version?: string;
  validation_type: string;
  validation_date: string;
  result: string;
  conclusion?: string;
  performed_by?: string;
  validated_by?: string;
  parameters?: Record<string, any>;
}

// ========== 能力验证类型定义 ==========

export interface PtPlan {
  id: string;
  plan_no: string;
  name: string;
  year: number;
  provider?: string;
  plan_type?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  budget?: number;
  responsible_person?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePtPlanRequest {
  plan_no: string;
  name: string;
  year: number;
  provider?: string;
  plan_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  budget?: number;
  responsible_person?: string;
}

export interface UpdatePtPlanRequest extends Partial<CreatePtPlanRequest> {}

export interface PtSample {
  id: string;
  plan_id: string;
  sample_code: string;
  sample_name?: string;
  test_item?: string;
  received_date?: string;
  received_by?: string;
  status: string;
  storage_condition?: string;
  description?: string;
  created_at: string;
}

export interface PtResult {
  id: string;
  plan_id: string;
  sample_id: string;
  test_item: string;
  measured_value?: number;
  measured_unit?: string;
  uncertainty?: number;
  test_method?: string;
  test_date?: string;
  tested_by?: string;
  submitted: boolean;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PtEvaluation {
  id: string;
  plan_id: string;
  result_id: string;
  evaluation_method: string;
  z_score?: number;
  en_score?: number;
  result: 'satisfactory' | 'questionable' | 'unsatisfactory';
  conclusion?: string;
  evaluated_by?: string;
  evaluated_at?: string;
  created_at: string;
}

export interface PtCorrectiveAction {
  id: string;
  plan_id: string;
  evaluation_id?: string;
  issue_description: string;
  cause_analysis?: string;
  corrective_action?: string;
  preventive_action?: string;
  responsible_person?: string;
  due_date?: string;
  status: string;
  completed_at?: string;
  verified_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePtCorrectiveActionRequest {
  plan_id: string;
  evaluation_id?: string;
  issue_description: string;
  cause_analysis?: string;
  corrective_action?: string;
  preventive_action?: string;
  responsible_person?: string;
  due_date?: string;
  status?: string;
}

export interface UpdatePtCorrectiveActionRequest extends Partial<CreatePtCorrectiveActionRequest> {}

export interface ReceivePtSampleRequest {
  sample_id: string;
  received_date?: string;
  received_by?: string;
  condition?: string;
}

export interface SubmitPtResultRequest {
  result_id: string;
  measured_value?: number;
  measured_unit?: string;
  uncertainty?: number;
  test_method?: string;
  test_date?: string;
  tested_by?: string;
}

export interface EvaluatePtResultRequest {
  result_id: string;
  evaluation_method: string;
  z_score?: number;
  en_score?: number;
  result: 'satisfactory' | 'questionable' | 'unsatisfactory';
  conclusion?: string;
  evaluated_by?: string;
}

// ========== 不确定度评定类型定义 ==========

export interface UncertaintyProject {
  id: string;
  project_no: string;
  name: string;
  test_method_id?: string;
  test_method_name?: string;
  test_item: string;
  measurand?: string;
  measurement_range?: string;
  status: string;
  responsible_person?: string;
  start_date?: string;
  completed_date?: string;
  description?: string;
  combined_uncertainty?: number;
  expanded_uncertainty?: number;
  coverage_factor?: number;
  confidence_level?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateUncertaintyProjectRequest {
  project_no: string;
  name: string;
  test_method_id?: string;
  test_item: string;
  measurand?: string;
  measurement_range?: string;
  status?: string;
  responsible_person?: string;
  start_date?: string;
  description?: string;
  coverage_factor?: number;
  confidence_level?: number;
}

export interface UpdateUncertaintyProjectRequest extends Partial<CreateUncertaintyProjectRequest> {}

export interface UncertaintySource {
  id: string;
  project_id: string;
  name: string;
  source_type: 'A' | 'B';
  description?: string;
  symbol?: string;
  distribution_type?: string;
  sensitivity_coefficient?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateUncertaintySourceRequest {
  project_id: string;
  name: string;
  source_type: 'A' | 'B';
  description?: string;
  symbol?: string;
  distribution_type?: string;
  sensitivity_coefficient?: number;
}

export interface UncertaintyComponent {
  id: string;
  project_id: string;
  source_id?: string;
  name: string;
  symbol?: string;
  standard_uncertainty: number;
  sensitivity_coefficient: number;
  uncertainty_contribution: number;
  distribution_type?: string;
  degrees_of_freedom?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UncertaintyCalculationResult {
  project_id: string;
  combined_uncertainty: number;
  expanded_uncertainty: number;
  coverage_factor: number;
  confidence_level: number;
  effective_degrees_of_freedom?: number;
  components: UncertaintyComponent[];
}

export interface UncertaintyReport {
  project_id: string;
  project_name: string;
  report_date: string;
  combined_uncertainty: number;
  expanded_uncertainty: number;
  coverage_factor: number;
  confidence_level: number;
  sources: UncertaintySource[];
  components: UncertaintyComponent[];
  conclusion?: string;
}

// ========== 数据同步类型定义 ==========

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

// ========== 通用工具函数 ==========

function buildQueryString(params?: ListParams): string {
  if (!params) return '';

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

interface CrudOperations<T> {
  list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<T>>>;
  get: (id: string) => Promise<ApiResponse<T>>;
  create: (data: Partial<T>) => Promise<ApiResponse<T>>;
  update: (id: string, data: Partial<T>) => Promise<ApiResponse<T>>;
  delete: (id: string) => Promise<ApiResponse<string>>;
}

function createCrudApi<T>(endpoint: string): CrudOperations<T> {
  return {
    list: (params?: ListParams) => {
      return apiClient.lims.get(endpoint, { params });
    },

    get: (id: string) => {
      return apiClient.lims.get(`${endpoint}/${id}`);
    },

    create: (data: Partial<T>) => {
      return apiClient.lims.post(endpoint, data);
    },

    update: (id: string, data: Partial<T>) => {
      return apiClient.lims.put(`${endpoint}/${id}`, data);
    },

    delete: (id: string) => {
      return apiClient.lims.delete(`${endpoint}/${id}`);
    },
  };
}

export const instrumentApi = {
  ...createCrudApi<Instrument>('/api/lims/instruments'),

  listInstruments: (params?: ListParams) =>
    createCrudApi<Instrument>('/api/lims/instruments').list(params),

  getInstrument: (id: string) => createCrudApi<Instrument>('/api/lims/instruments').get(id),

  createInstrument: (data: CreateInstrumentRequest) =>
    createCrudApi<Instrument>('/api/lims/instruments').create(data),

  updateInstrument: (id: string, data: Partial<CreateInstrumentRequest>) =>
    createCrudApi<Instrument>('/api/lims/instruments').update(id, data),

  deleteInstrument: (id: string) => createCrudApi<Instrument>('/api/lims/instruments').delete(id),

  calibrate: async (
    id: string,
    data: CreateCalibrationRequest
  ): Promise<ApiResponse<CalibrationRecord>> => {
    return apiClient.lims.post(`/api/lims/instruments/${id}/calibrate`, data);
  },

  listCalibrationRecords: async (
    instrumentId: string
  ): Promise<ApiResponse<CalibrationRecord[]>> => {
    return apiClient.lims.get(`/api/lims/instruments/${instrumentId}/calibrations`);
  },
};

export const maintenanceApi = {
  listByInstrument: async (instrumentId: string): Promise<ApiResponse<MaintenanceRecord[]>> => {
    return apiClient.lims.get(`/api/lims/instruments/${instrumentId}/maintenance`);
  },

  create: async (data: CreateMaintenanceRecordRequest): Promise<ApiResponse<MaintenanceRecord>> => {
    return apiClient.lims.post('/api/lims/maintenance', data);
  },

  update: async (
    id: string,
    data: Partial<CreateMaintenanceRecordRequest>
  ): Promise<ApiResponse<MaintenanceRecord>> => {
    return apiClient.lims.put(`/api/lims/maintenance/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.delete(`/api/lims/maintenance/${id}`);
  },
};

// ========== 试剂管理 API ==========

export const reagentApi = {
  ...createCrudApi<Reagent>('/api/lims/reagents'),

  listReagents: (params?: ListParams) => createCrudApi<Reagent>('/api/lims/reagents').list(params),

  getReagent: (id: string) => createCrudApi<Reagent>('/api/lims/reagents').get(id),

  createReagent: (data: CreateReagentRequest) =>
    createCrudApi<Reagent>('/api/lims/reagents').create(data),

  updateReagent: (id: string, data: UpdateReagentRequest) =>
    createCrudApi<Reagent>('/api/lims/reagents').update(id, data),

  deleteReagent: (id: string) => createCrudApi<Reagent>('/api/lims/reagents').delete(id),

  listLowStock: async (): Promise<ApiResponse<Reagent[]>> => {
    return apiClient.lims.get('/api/lims/reagents/low-stock');
  },

  listExpiring: async (days?: number): Promise<ApiResponse<Reagent[]>> => {
    return apiClient.lims.get('/api/lims/reagents/expiring', { params: { days } });
  },
};

// ========== 样品条码/RFID API ==========

export const barcodeApi = {
  ...createCrudApi<Barcode>('/api/lims/barcodes'),

  listBarcodes: (params?: ListParams) => createCrudApi<Barcode>('/api/lims/barcodes').list(params),

  getBarcode: (id: string) => createCrudApi<Barcode>('/api/lims/barcodes').get(id),

  generateBarcode: async (data: CreateBarcodeRequest): Promise<ApiResponse<Barcode[]>> => {
    return apiClient.lims.post('/api/lims/barcodes/generate', data);
  },

  updateBarcode: (id: string, data: UpdateBarcodeRequest) =>
    createCrudApi<Barcode>('/api/lims/barcodes').update(id, data),

  deleteBarcode: (id: string) => createCrudApi<Barcode>('/api/lims/barcodes').delete(id),

  printBarcode: async (data: PrintBarcodeRequest): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.post('/api/lims/barcodes/print', data);
  },

  scanBarcode: async (barcode: string): Promise<ApiResponse<ScanBarcodeResult>> => {
    return apiClient.lims.get(`/api/lims/barcodes/scan/${barcode}`);
  },

  getBarcodeTypes: async (): Promise<ApiResponse<BarcodeType[]>> => {
    return apiClient.lims.get('/api/lims/barcodes/types');
  },

  traceSampleByBarcode: async (barcode: string): Promise<ApiResponse<SampleTraceability>> => {
    return apiClient.lims.get(`/api/lims/barcodes/${barcode}/trace`);
  },
};

export const rfidTagApi = {
  listRfidTags: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<RfidTag>>> => {
    return apiClient.lims.get('/api/lims/rfid-tags', { params });
  },

  createRfidTag: async (data: CreateRfidTagRequest): Promise<ApiResponse<RfidTag>> => {
    return apiClient.lims.post('/api/lims/rfid-tags', data);
  },

  deleteRfidTag: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.lims.delete(`/api/lims/rfid-tags/${id}`);
  },

  assignRfidTag: async (data: AssignRfidTagRequest): Promise<ApiResponse<RfidTag>> => {
    return apiClient.lims.post('/api/lims/rfid-tags/assign', data);
  },

  unassignRfidTag: async (tagId: string): Promise<ApiResponse<RfidTag>> => {
    return apiClient.lims.post(`/api/lims/rfid-tags/${tagId}/unassign`);
  },
};

export const printConfigApi = {
  listPrintConfigs: async (): Promise<ApiResponse<PrintConfig[]>> => {
    return apiClient.lims.get('/api/lims/print-config');
  },

  getDefaultPrintConfig: async (): Promise<ApiResponse<PrintConfig>> => {
    return apiClient.lims.get('/api/lims/print-config/default');
  },
};

// ========== 检测方法库 API ==========

export const testMethodApi = {
  ...createCrudApi<TestMethod>('/api/lims/test-methods'),

  listTestMethods: (params?: ListParams) =>
    createCrudApi<TestMethod>('/api/lims/test-methods').list(params),

  getTestMethod: (id: string) => createCrudApi<TestMethod>('/api/lims/test-methods').get(id),

  createTestMethod: (data: CreateTestMethodRequest) =>
    createCrudApi<TestMethod>('/api/lims/test-methods').create(data),

  updateTestMethod: (id: string, data: UpdateTestMethodRequest) =>
    createCrudApi<TestMethod>('/api/lims/test-methods').update(id, data),

  deleteTestMethod: (id: string) => createCrudApi<TestMethod>('/api/lims/test-methods').delete(id),

  listMethodVersions: async (methodId: string): Promise<ApiResponse<MethodVersion[]>> => {
    return apiClient.lims.get(`/api/lims/test-methods/${methodId}/versions`);
  },

  createNewVersion: async (
    methodId: string,
    data: CreateMethodVersionRequest
  ): Promise<ApiResponse<MethodVersion>> => {
    return apiClient.lims.post(`/api/lims/test-methods/${methodId}/versions`, data);
  },
};

export const methodCategoryApi = {
  listMethodCategories: async (params?: ListParams): Promise<ApiResponse<MethodCategory[]>> => {
    return apiClient.lims.get('/api/lims/method-categories', { params });
  },

  createCategory: async (data: CreateMethodCategoryRequest): Promise<ApiResponse<MethodCategory>> => {
    return apiClient.lims.post('/api/lims/method-categories', data);
  },

  updateCategory: async (
    id: string,
    data: UpdateMethodCategoryRequest
  ): Promise<ApiResponse<MethodCategory>> => {
    return apiClient.lims.put(`/api/lims/method-categories/${id}`, data);
  },

  deleteCategory: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.lims.delete(`/api/lims/method-categories/${id}`);
  },
};

export const methodValidationApi = {
  listMethodValidations: async (
    methodId: string,
    params?: ListParams
  ): Promise<ApiResponse<PaginatedResult<MethodValidation>>> => {
    return apiClient.lims.get(`/api/lims/test-methods/${methodId}/validations`, { params });
  },

  createValidation: async (
    data: CreateMethodValidationRequest
  ): Promise<ApiResponse<MethodValidation>> => {
    return apiClient.lims.post('/api/lims/method-validations', data);
  },
};

// ========== 能力验证 API ==========

export const ptPlanApi = {
  ...createCrudApi<PtPlan>('/api/lims/pt-plans'),

  listPtPlans: (params?: ListParams) => createCrudApi<PtPlan>('/api/lims/pt-plans').list(params),

  getPtPlan: (id: string) => createCrudApi<PtPlan>('/api/lims/pt-plans').get(id),

  createPtPlan: (data: CreatePtPlanRequest) =>
    createCrudApi<PtPlan>('/api/lims/pt-plans').create(data),

  updatePtPlan: (id: string, data: UpdatePtPlanRequest) =>
    createCrudApi<PtPlan>('/api/lims/pt-plans').update(id, data),

  deletePtPlan: (id: string) => createCrudApi<PtPlan>('/api/lims/pt-plans').delete(id),

  listPlanSamples: async (planId: string): Promise<ApiResponse<PtSample[]>> => {
    return apiClient.lims.get(`/api/lims/pt-plans/${planId}/samples`);
  },

  listPlanResults: async (planId: string): Promise<ApiResponse<PtResult[]>> => {
    return apiClient.lims.get(`/api/lims/pt-plans/${planId}/results`);
  },

  listPlanEvaluations: async (planId: string): Promise<ApiResponse<PtEvaluation[]>> => {
    return apiClient.lims.get(`/api/lims/pt-plans/${planId}/evaluations`);
  },

  listPlanCorrectiveActions: async (planId: string): Promise<ApiResponse<PtCorrectiveAction[]>> => {
    return apiClient.lims.get(`/api/lims/pt-plans/${planId}/corrective-actions`);
  },
};

export const ptSampleApi = {
  receivePtSample: async (
    sampleId: string,
    data: ReceivePtSampleRequest
  ): Promise<ApiResponse<PtSample>> => {
    return apiClient.lims.post(`/api/lims/pt-samples/${sampleId}/receive`, data);
  },
};

export const ptResultApi = {
  submitPtResult: async (
    resultId: string,
    data: SubmitPtResultRequest
  ): Promise<ApiResponse<PtResult>> => {
    return apiClient.lims.post(`/api/lims/pt-results/${resultId}/submit`, data);
  },
};

export const ptEvaluationApi = {
  evaluatePtResult: async (
    resultId: string,
    data: EvaluatePtResultRequest
  ): Promise<ApiResponse<PtEvaluation>> => {
    return apiClient.lims.post(`/api/lims/pt-results/${resultId}/evaluate`, data);
  },
};

export const ptCorrectiveActionApi = {
  createPtCorrectiveAction: async (
    data: CreatePtCorrectiveActionRequest
  ): Promise<ApiResponse<PtCorrectiveAction>> => {
    return apiClient.lims.post('/api/lims/pt-corrective-actions', data);
  },

  updatePtCorrectiveAction: async (
    id: string,
    data: UpdatePtCorrectiveActionRequest
  ): Promise<ApiResponse<PtCorrectiveAction>> => {
    return apiClient.lims.put(`/api/lims/pt-corrective-actions/${id}`, data);
  },
};

// ========== 不确定度评定 API ==========

export const uncertaintyProjectApi = {
  ...createCrudApi<UncertaintyProject>('/api/lims/uncertainty-projects'),

  listUncertaintyProjects: (params?: ListParams) =>
    createCrudApi<UncertaintyProject>('/api/lims/uncertainty-projects').list(params),

  getUncertaintyProject: (id: string) =>
    createCrudApi<UncertaintyProject>('/api/lims/uncertainty-projects').get(id),

  createUncertaintyProject: (data: CreateUncertaintyProjectRequest) =>
    createCrudApi<UncertaintyProject>('/api/lims/uncertainty-projects').create(data),

  updateUncertaintyProject: (id: string, data: UpdateUncertaintyProjectRequest) =>
    createCrudApi<UncertaintyProject>('/api/lims/uncertainty-projects').update(id, data),

  deleteUncertaintyProject: (id: string) =>
    createCrudApi<UncertaintyProject>('/api/lims/uncertainty-projects').delete(id),
};

export const uncertaintySourceApi = {
  listUncertaintySources: async (
    projectId: string
  ): Promise<ApiResponse<UncertaintySource[]>> => {
    return apiClient.lims.get(`/api/lims/uncertainty-projects/${projectId}/sources`);
  },

  createUncertaintySource: async (
    data: CreateUncertaintySourceRequest
  ): Promise<ApiResponse<UncertaintySource>> => {
    return apiClient.lims.post('/api/lims/uncertainty-sources', data);
  },
};

export const uncertaintyComponentApi = {
  listUncertaintyComponents: async (
    projectId: string
  ): Promise<ApiResponse<UncertaintyComponent[]>> => {
    return apiClient.lims.get(`/api/lims/uncertainty-projects/${projectId}/components`);
  },

  calculateCombinedUncertainty: async (
    projectId: string
  ): Promise<ApiResponse<UncertaintyCalculationResult>> => {
    return apiClient.lims.post(
      `/api/lims/uncertainty-projects/${projectId}/calculate-combined`
    );
  },

  generateUncertaintyReport: async (
    projectId: string
  ): Promise<ApiResponse<UncertaintyReport>> => {
    return apiClient.lims.get(`/api/lims/uncertainty-projects/${projectId}/report`);
  },
};

// ========== 数据同步 API ==========

export const syncRecordApi = {
  listSyncRecords: async (
    params?: SyncRecordQueryParams
  ): Promise<ApiResponse<PaginatedResult<SyncRecord>>> => {
    return apiClient.lims.get('/api/lims/sync-records', { params });
  },

  getSyncRecord: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.lims.get(`/api/lims/sync-records/${id}`);
  },

  deleteSyncRecord: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.lims.delete(`/api/lims/sync-records/${id}`);
  },

  retrySync: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.lims.post(`/api/lims/sync-records/${id}/retry`);
  },

  syncRecordToQms: async (recordId: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.lims.post('/api/lims/sync/record-to-qms', { record_id: recordId });
  },

  syncReagentToEhs: async (reagentId: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.lims.post('/api/lims/sync/reagent-to-ehs', { reagent_id: reagentId });
  },
};

// ========== LIMS API 模块 ==========

export const sampleApi = {
  ...createCrudApi<Sample>('/api/lims/samples'),

  listSamples: (params?: ListParams) => createCrudApi<Sample>('/api/lims/samples').list(params),

  getSample: (id: string) => createCrudApi<Sample>('/api/lims/samples').get(id),

  createSample: (data: CreateSampleRequest) =>
    createCrudApi<Sample>('/api/lims/samples').create(data),

  updateSample: (id: string, data: UpdateSampleRequest) =>
    createCrudApi<Sample>('/api/lims/samples').update(id, data),

  deleteSample: (id: string) => createCrudApi<Sample>('/api/lims/samples').delete(id),

  batchCreateSamples: async (
    data: BatchCreateSamplesRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.lims.post('/api/lims/samples/batch', data);
  },

  batchDeleteSamples: async (
    data: BatchDeleteSamplesRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.lims.delete('/api/lims/samples/batch', { data });
  },

  exportSamples: async (): Promise<Blob> => {
    const baseURL = (apiClient.lims as any).defaults?.baseURL || config.services.lims;
    return downloadBlob(baseURL, '/api/lims/samples/export');
  },

  importSamples: async (file: File): Promise<ApiResponse<BatchOperationResult>> => {
    const content = await file.text();
    return apiClient.lims.post('/api/lims/samples/import', content, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  },

  getSampleLifecycle: async (sampleId: string): Promise<ApiResponse<LifecycleEvent[]>> => {
    return apiClient.lims.get(`/api/lims/samples/${sampleId}/lifecycle`);
  },

  recordLifecycleEvent: async (
    data: CreateLifecycleEventRequest
  ): Promise<ApiResponse<LifecycleEvent>> => {
    return apiClient.lims.post('/api/lims/samples/lifecycle-event', data);
  },

  transitionSampleStage: async (
    sampleId: string,
    data: TransitionStageRequest
  ): Promise<ApiResponse<Sample>> => {
    return apiClient.lims.post(`/api/lims/samples/${sampleId}/transition-stage`, data);
  },

  getSampleTraceability: async (sampleId: string): Promise<ApiResponse<SampleTraceability>> => {
    return apiClient.lims.get(`/api/lims/samples/${sampleId}/traceability`);
  },
};

export const lifecycleStageApi = {
  listLifecycleStages: async (params?: ListParams): Promise<ApiResponse<LifecycleStage[]>> => {
    return apiClient.lims.get('/api/lims/lifecycle-stages', { params });
  },

  getLifecycleStage: async (id: string): Promise<ApiResponse<LifecycleStage>> => {
    return apiClient.lims.get(`/api/lims/lifecycle-stages/${id}`);
  },
};

export const processApi = {
  ...createCrudApi<InspectionProcess>('/api/lims/processes'),

  listProcesses: (params?: ListParams) =>
    createCrudApi<InspectionProcess>('/api/lims/processes').list(params),

  getProcess: (id: string) => createCrudApi<InspectionProcess>('/api/lims/processes').get(id),
};

export const taskApi = {
  ...createCrudApi<InspectionTask>('/api/lims/tasks'),

  listTasks: (params?: ListParams) => createCrudApi<InspectionTask>('/api/lims/tasks').list(params),

  createTask: (data: CreateInspectionTaskRequest) =>
    createCrudApi<InspectionTask>('/api/lims/tasks').create(data),

  getTask: (id: string) => createCrudApi<InspectionTask>('/api/lims/tasks').get(id),

  updateTask: (id: string, data: Partial<CreateInspectionTaskRequest>) =>
    createCrudApi<InspectionTask>('/api/lims/tasks').update(id, data),

  deleteTask: (id: string) => createCrudApi<InspectionTask>('/api/lims/tasks').delete(id),

  listTasksBySample: async (sampleId: string): Promise<ApiResponse<InspectionTask[]>> => {
    return apiClient.lims.get(`/api/lims/tasks/sample/${sampleId}`);
  },

  completeStep: async (
    id: string,
    data: Omit<CreateInspectionRecordRequest, 'task_id'>
  ): Promise<ApiResponse<InspectionTask>> => {
    return apiClient.lims.post(`/api/lims/tasks/${id}/complete_step`, {
      ...data,
      task_id: id,
    });
  },

  submitResult: async (
    id: string,
    data: { result: string; conclusion: string; inspector: string; remarks?: string }
  ): Promise<ApiResponse<InspectionTask>> => {
    return apiClient.lims.post(`/api/lims/tasks/${id}/submit-result`, data);
  },
};

export const recordApi = {
  ...createCrudApi<InspectionRecord>('/api/lims/records'),

  listRecords: (params?: ListParams) =>
    createCrudApi<InspectionRecord>('/api/lims/records').list(params),

  getRecord: (id: string) => createCrudApi<InspectionRecord>('/api/lims/records').get(id),

  createRecord: (data: CreateInspectionRecordRequest) =>
    createCrudApi<InspectionRecord>('/api/lims/records').create(data),

  deleteRecord: (id: string) => createCrudApi<InspectionRecord>('/api/lims/records').delete(id),

  listRecordsByTask: async (taskId: string): Promise<ApiResponse<InspectionRecord[]>> => {
    return apiClient.lims.get(`/api/lims/records/task/${taskId}`);
  },
};

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

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_ids?: string[] | null;
  user_id?: string;
  user_name?: string;
  request_details?: any;
  response_details?: any;
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
  page_size?: number;
}

export const auditLimsApi = {
  listAuditLogs: async (
    params?: AuditLogQueryParams
  ): Promise<ApiResponse<{ audit_logs: AuditLog[]; total: number }>> => {
    let url = '/api/lims/audit-logs';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return apiClient.lims.get(url);
  },

  getAuditLog: async (id: string): Promise<ApiResponse<AuditLog>> => {
    return apiClient.lims.get(`/api/lims/audit-logs/${id}`);
  },

  exportAuditLogs: async (
    params?: Omit<AuditLogQueryParams, 'page' | 'page_size'>
  ): Promise<Blob> => {
    let url = '/api/lims/audit-logs/export';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    const baseURL = (apiClient.lims as any).defaults?.baseURL || config.services.lims;
    return downloadBlob(baseURL, url);
  },
};

// ========== 统一导出 ==========

export const limsApi = {
  samples: sampleApi,
  processes: processApi,
  tasks: taskApi,
  records: recordApi,
  instruments: instrumentApi,
  maintenance: maintenanceApi,
  audit: auditLimsApi,
  lifecycleStages: lifecycleStageApi,
  reagents: reagentApi,
  barcodes: barcodeApi,
  rfidTags: rfidTagApi,
  printConfigs: printConfigApi,
  testMethods: testMethodApi,
  methodCategories: methodCategoryApi,
  methodValidations: methodValidationApi,
  ptPlans: ptPlanApi,
  ptSamples: ptSampleApi,
  ptResults: ptResultApi,
  ptEvaluations: ptEvaluationApi,
  ptCorrectiveActions: ptCorrectiveActionApi,
  uncertaintyProjects: uncertaintyProjectApi,
  uncertaintySources: uncertaintySourceApi,
  uncertaintyComponents: uncertaintyComponentApi,
  syncRecords: syncRecordApi,

  listSamples: sampleApi.listSamples,
  getSample: sampleApi.getSample,
  createSample: sampleApi.createSample,
  updateSample: sampleApi.updateSample,
  deleteSample: sampleApi.deleteSample,
  batchCreateSamples: sampleApi.batchCreateSamples,
  batchDeleteSamples: sampleApi.batchDeleteSamples,
  exportSamples: sampleApi.exportSamples,
  importSamples: sampleApi.importSamples,
  getSampleLifecycle: sampleApi.getSampleLifecycle,
  recordLifecycleEvent: sampleApi.recordLifecycleEvent,
  transitionSampleStage: sampleApi.transitionSampleStage,
  getSampleTraceability: sampleApi.getSampleTraceability,

  listLifecycleStages: lifecycleStageApi.listLifecycleStages,
  getLifecycleStage: lifecycleStageApi.getLifecycleStage,

  listProcesses: processApi.listProcesses,
  getProcess: processApi.getProcess,

  listTasks: taskApi.listTasks,
  createTask: taskApi.createTask,
  getTask: taskApi.getTask,
  updateTask: taskApi.updateTask,
  deleteTask: taskApi.deleteTask,
  completeStep: taskApi.completeStep,
  submitResult: taskApi.submitResult,
  listTasksBySample: taskApi.listTasksBySample,

  listRecords: recordApi.listRecords,
  getRecord: recordApi.getRecord,
  createRecord: recordApi.createRecord,
  deleteRecord: recordApi.deleteRecord,
  listRecordsByTask: recordApi.listRecordsByTask,

  listInstruments: instrumentApi.listInstruments,
  getInstrument: instrumentApi.getInstrument,
  createInstrument: instrumentApi.createInstrument,
  updateInstrument: instrumentApi.updateInstrument,
  deleteInstrument: instrumentApi.deleteInstrument,
  calibrateInstrument: instrumentApi.calibrate,
  listCalibrationRecords: instrumentApi.listCalibrationRecords,

  listMaintenanceByInstrument: maintenanceApi.listByInstrument,
  createMaintenance: maintenanceApi.create,
  updateMaintenance: maintenanceApi.update,
  deleteMaintenance: maintenanceApi.delete,

  listReagents: reagentApi.listReagents,
  getReagent: reagentApi.getReagent,
  createReagent: reagentApi.createReagent,
  updateReagent: reagentApi.updateReagent,
  deleteReagent: reagentApi.deleteReagent,
  listLowStockReagents: reagentApi.listLowStock,
  listExpiringReagents: reagentApi.listExpiring,

  listBarcodes: barcodeApi.listBarcodes,
  getBarcode: barcodeApi.getBarcode,
  generateBarcode: barcodeApi.generateBarcode,
  updateBarcode: barcodeApi.updateBarcode,
  deleteBarcode: barcodeApi.deleteBarcode,
  printBarcode: barcodeApi.printBarcode,
  scanBarcode: barcodeApi.scanBarcode,
  getBarcodeTypes: barcodeApi.getBarcodeTypes,
  traceSampleByBarcode: barcodeApi.traceSampleByBarcode,

  listRfidTags: rfidTagApi.listRfidTags,
  createRfidTag: rfidTagApi.createRfidTag,
  deleteRfidTag: rfidTagApi.deleteRfidTag,
  assignRfidTag: rfidTagApi.assignRfidTag,
  unassignRfidTag: rfidTagApi.unassignRfidTag,

  listTestMethods: testMethodApi.listTestMethods,
  getTestMethod: testMethodApi.getTestMethod,
  createTestMethod: testMethodApi.createTestMethod,
  updateTestMethod: testMethodApi.updateTestMethod,
  deleteTestMethod: testMethodApi.deleteTestMethod,
  listMethodVersions: testMethodApi.listMethodVersions,
  createNewMethodVersion: testMethodApi.createNewVersion,

  listMethodCategories: methodCategoryApi.listMethodCategories,
  createMethodCategory: methodCategoryApi.createCategory,
  updateMethodCategory: methodCategoryApi.updateCategory,
  deleteMethodCategory: methodCategoryApi.deleteCategory,

  listMethodValidations: methodValidationApi.listMethodValidations,
  createMethodValidation: methodValidationApi.createValidation,

  listPtPlans: ptPlanApi.listPtPlans,
  getPtPlan: ptPlanApi.getPtPlan,
  createPtPlan: ptPlanApi.createPtPlan,
  updatePtPlan: ptPlanApi.updatePtPlan,
  deletePtPlan: ptPlanApi.deletePtPlan,
  listPlanSamples: ptPlanApi.listPlanSamples,
  listPlanResults: ptPlanApi.listPlanResults,
  listPlanEvaluations: ptPlanApi.listPlanEvaluations,
  listPlanCorrectiveActions: ptPlanApi.listPlanCorrectiveActions,
  receivePtSample: ptSampleApi.receivePtSample,
  submitPtResult: ptResultApi.submitPtResult,
  evaluatePtResult: ptEvaluationApi.evaluatePtResult,
  createPtCorrectiveAction: ptCorrectiveActionApi.createPtCorrectiveAction,
  updatePtCorrectiveAction: ptCorrectiveActionApi.updatePtCorrectiveAction,

  listUncertaintyProjects: uncertaintyProjectApi.listUncertaintyProjects,
  getUncertaintyProject: uncertaintyProjectApi.getUncertaintyProject,
  createUncertaintyProject: uncertaintyProjectApi.createUncertaintyProject,
  updateUncertaintyProject: uncertaintyProjectApi.updateUncertaintyProject,
  deleteUncertaintyProject: uncertaintyProjectApi.deleteUncertaintyProject,
  listUncertaintySources: uncertaintySourceApi.listUncertaintySources,
  createUncertaintySource: uncertaintySourceApi.createUncertaintySource,
  listUncertaintyComponents: uncertaintyComponentApi.listUncertaintyComponents,
  calculateCombinedUncertainty: uncertaintyComponentApi.calculateCombinedUncertainty,
  generateUncertaintyReport: uncertaintyComponentApi.generateUncertaintyReport,

  listSyncRecords: syncRecordApi.listSyncRecords,
  getSyncRecord: syncRecordApi.getSyncRecord,
  deleteSyncRecord: syncRecordApi.deleteSyncRecord,
  retrySync: syncRecordApi.retrySync,
  syncRecordToQms: syncRecordApi.syncRecordToQms,
  syncReagentToEhs: syncRecordApi.syncReagentToEhs,

  getStatistics: async (): Promise<ApiResponse<LimsStatistics>> => {
    return apiClient.lims.get('/api/lims/statistics');
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.lims.get('/health');
  },
};

export default limsApi;
