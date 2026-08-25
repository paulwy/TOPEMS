import type { PaginatedResponse } from '@topems/shared-types';

export { PaginatedResponse };

// ============================================================================
// OpenAPI 生成类型迁移映射（推广阶段）
// ============================================================================
// 当前策略：保留手写类型作为主类型，生成类型待 openapi.d.ts 聚合后启用。
// 后端 svc/qms 已通过 utoipa 注册以下 Schema（quality_standard、quality_inspection、quality_issue），
// 待运行 ./scripts/openapi/generate.sh --with-types 后可在此添加 Generated* 别名。
//
// 迁移映射（手写类型 → 生成类型 QmsTypes.*）：
// - QualityStandardBackend         → QmsTypes.QualityStandard
// - CreateQualityStandardRequestBackend → QmsTypes.CreateStandardRequest
// - UpdateQualityStandardRequestBackend → QmsTypes.UpdateStandardRequest
// - StandardRevision               → QmsTypes.StandardRevision
// - QualityInspectionBackend       → QmsTypes.Inspection
// - CreateQualityInspectionRequestBackend → QmsTypes.CreateInspectionRequest
// - UpdateQualityInspectionRequestBackend → QmsTypes.UpdateInspectionRequest
// - AssignInspectionRequestBackend → QmsTypes.AssignInspectionRequest
// - SubmitInspectionResultRequestBackend → QmsTypes.SubmitInspectionResultRequest
// - AuditInspectionRequestBackend  → QmsTypes.AuditInspectionRequest
// - InspectionResultItem           → QmsTypes.InspectionResultItem
// - InspectionAudit                → QmsTypes.InspectionAudit
// - QualityIssueBackend            → QmsTypes.QualityIssue
// - CreateQualityIssueRequestBackend → QmsTypes.CreateIssueRequest
// - UpdateQualityIssueRequestBackend → QmsTypes.UpdateIssueRequest
//
// 已知差异（替换时需注意）：
// 1. 生成类型字段全可选（openapi-typescript 默认行为）
// 2. 手写类型区分 Backend（snake_case）/Frontend（camelCase）两套，生成类型统一 snake_case
// 3. 手写 QualityInspectionBackend 有 assignee/inspected_at 字段，需核对后端 Inspection 定义
// 4. 手写 QualityIssueBackend 字段（severity/source/related_inspection_id）需与后端 QualityIssue 对齐
// 5. 待补充模块：quality_cost、apqp、fmea、eight_d、corrective_action、spc、dashboard
//
// 参考：apps/web/src/api/iam/types.ts 的 Generated* 别名试点模式

// ============================================================================
// OpenAPI 生成类型别名（推广阶段）
// ============================================================================
// 生成类型与手写 Backend 类型字段高度匹配，可作为 Backend 类型的类型源真相。
// 手写 Backend 类型保留必填字段约束，生成类型字段全可选作为参考。

// ============================================================================
// 适配类型：将生成类型字段重映射到手写命名（任务 2）
// ============================================================================
// QMS 手写 Backend 类型与生成类型字段命名基本一致（均 snake_case），
// 主要差异在于：
// 1. 生成类型字段全可选，手写 Backend 类型部分字段必填
// 2. 手写 QualityIssueBackend 有 assigned_to/priority/due_date，生成类型无
// 3. 生成 QualityIssue 有 issue_no/resolved_at/created_by/tenant_id，手写 Backend 无
// 因此 QualityIssue 需要适配类型补充字段。

// ============================================================================
// 字段适配函数：生成类型实例 → 手写 Backend 命名实例
// ============================================================================

// ============================================================================
// 手写类型（当前主类型）
// ============================================================================

// Backend returns data structures
export interface QualityStandardBackend {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  version?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityStandardRequestBackend {
  code: string;
  name: string;
  description?: string;
  category?: string;
  version?: string;
}

export interface UpdateQualityStandardRequestBackend {
  name?: string;
  description?: string;
  category?: string;
  version?: string;
  status?: string;
}

export interface QualityInspectionBackend {
  id: string;
  inspection_no: string;
  inspection_type: string;
  product_id?: string;
  product_name?: string;
  standard_id?: string;
  quantity: number;
  qualified_quantity?: number;
  unqualified_quantity?: number;
  qualification_rate?: number;
  status: string;
  inspector?: string;
  assignee?: string;
  inspected_at?: string;
  result?: string;
  memo?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateQualityInspectionRequestBackend {
  inspection_type: string;
  product_id?: string;
  product_name?: string;
  standard_id?: string;
  quantity: number;
  created_by?: string;
}

export interface UpdateQualityInspectionRequestBackend {
  inspection_type?: string;
  product_id?: string;
  product_name?: string;
  standard_id?: string;
  quantity?: number;
}

export interface AssignInspectionRequestBackend {
  assignee: string;
  operator: string;
}

export interface SubmitInspectionResultRequestBackend {
  qualified_quantity: number;
  unqualified_quantity: number;
  qualification_rate?: number;
  result?: string;
  memo?: string;
  inspector: string;
  results?: InspectionResultItem[];
}

export interface InspectionResultItem {
  item_name: string;
  standard_value?: string;
  measured_value?: string;
  is_qualified: boolean;
  remark?: string;
}

export interface AuditInspectionRequestBackend {
  action: string;
  operator: string;
  comment?: string;
}

export interface InspectionAudit {
  id: string;
  inspection_id: string;
  status_from: string;
  status_to: string;
  action: string;
  operator: string;
  comment?: string;
  created_at?: string;
}

export interface InspectionResult {
  id: string;
  inspection_id: string;
  item_name: string;
  standard_value?: string;
  measured_value?: string;
  is_qualified: boolean;
  remark?: string;
  created_at?: string;
}

export interface QualityIssueBackend {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  source?: string;
  related_inspection_id?: string;
  assigned_to?: string;
  priority?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityIssueRequestBackend {
  title: string;
  description: string;
  severity: string;
  source?: string;
  related_inspection_id?: string;
  assigned_to?: string;
  priority?: string;
  due_date?: string;
}

export interface UpdateQualityIssueRequestBackend {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  assigned_to?: string;
  priority?: string;
  due_date?: string;
}

export interface CorrectiveActionBackend {
  id: string;
  issue_id: string;
  title: string;
  description?: string;
  assigned_to: string;
  status: string;
  implementation_date?: string;
  verification_result?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCorrectiveActionRequestBackend {
  issue_id: string;
  title: string;
  description?: string;
  assigned_to: string;
}

export interface UpdateCorrectiveActionRequestBackend {
  title?: string;
  description?: string;
  assigned_to?: string;
  status?: string;
  implementation_date?: string;
  verification_result?: string;
  verified_by?: string;
  verified_at?: string;
}

// Frontend types
export interface QualityStandard {
  id: string;
  name: string;
  title?: string;
  code: string;
  category: string;
  version: string;
  description: string;
  content: string;
  status: string;
  effective_date: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityStandardRequest {
  name: string;
  code: string;
  category: string;
  version: string;
  description: string;
  content: string;
  status: string;
  effective_date?: string;
}

export interface QualityCheck {
  id: string;
  inspection_no: string;
  inspection_type: string;
  product_name?: string;
  standard_id?: string;
  quantity: number;
  qualified_quantity?: number;
  unqualified_quantity?: number;
  qualification_rate?: number;
  status: string;
  inspector?: string;
  assignee?: string;
  inspected_at?: string;
  result?: string;
  memo?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateQualityCheckRequest {
  inspection_type: string;
  product_name?: string;
  standard_id?: string;
  quantity: number;
  created_by?: string;
}

export interface QualityIssue {
  id: string;
  issue_no: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  assignee: string;
  due_date?: string;
  resolution?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityIssueRequest {
  issue_no: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  assignee: string;
}

export interface QualityImprovement {
  id: string;
  improvement_no: string;
  title: string;
  description: string;
  category: string;
  status: string;
  proposer: string;
  assignee: string;
  improvement_effect?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityImprovementRequest {
  improvement_no: string;
  title: string;
  description: string;
  category: string;
  status: string;
  proposer: string;
  assignee: string;
  improvement_effect?: string;
}

// Audit types
export interface AuditPlan {
  id: string;
  plan_no: string;
  title: string;
  description?: string;
  audit_type: string;
  status: string;
  auditor: string;
  auditors: string[];
  start_date: string;
  end_date: string;
  departments: string[];
  planned_date: string;
  scope?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditTask {
  id: string;
  plan_id: string;
  task_no: string;
  title: string;
  description?: string;
  status: string;
  assigned_to: string;
  assignee: string;
  priority: string;
  due_date?: string;
  completed_at?: string;
  findings_count: number;
  created_at: string;
  updated_at: string;
}

export interface AuditFinding {
  id: string;
  task_id: string;
  finding_no: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  recommendation?: string;
  assigned_to?: string;
  due_date?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

// Standard Revision
export interface StandardRevision {
  id: string;
  standard_id: string;
  version: string;
  description?: string;
  changes?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

// APQP Types
export interface ApqpProject {
  id: string;
  project_no: string;
  project_name: string;
  product_id?: string;
  product_name?: string;
  customer?: string;
  description?: string;
  status?: string;
  current_phase?: string;
  leader?: string;
  team?: string;
  start_date?: string;
  target_date?: string;
  actualEndDate?: string;
  progress?: number;
  risklevel?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateApqpProjectRequest {
  project_name: string;
  product_id?: string;
  product_name?: string;
  customer?: string;
  description?: string;
  leader?: string;
  team?: string;
  start_date?: string;
  target_date?: string;
  created_by?: string;
}

export interface UpdateApqpProjectRequest {
  project_name?: string;
  product_id?: string;
  product_name?: string;
  customer?: string;
  description?: string;
  status?: string;
  current_phase?: string;
  leader?: string;
  team?: string;
  start_date?: string;
  target_date?: string;
  actualEndDate?: string;
  progress?: number;
  risklevel?: string;
}

export interface ApqpPhase {
  id: string;
  project_id: string;
  phase_code: string;
  phase_name: string;
  description?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  progress?: number;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApqpTask {
  id: string;
  project_id: string;
  phase_id: string;
  task_name: string;
  description?: string;
  task_type?: string;
  deliverable?: string;
  status?: string;
  assignee?: string;
  due_date?: string;
  completed_at?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApqpRisk {
  id: string;
  project_id: string;
  risk_name: string;
  description?: string;
  risk_category?: string;
  severity?: number;
  occurrence?: number;
  detection?: number;
  rpn?: number;
  status?: string;
  mitigation_plan?: string;
  responsible?: string;
  target_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApqpProgressStatistics {
  total_phases: number;
  completed_phases: number;
  total_tasks: number;
  completed_tasks: number;
  overall_progress: number;
  phase_progress: PhaseProgress[];
}

interface PhaseProgress {
  phase_id: string;
  phase_name: string;
  phase_code: string;
  total_tasks: number;
  completed_tasks: number;
  progress: number;
  status: string;
}

export interface ApqpApproval {
  id: string;
  project_id: string;
  approval_type: string;
  status?: string;
  applicant?: string;
  approver?: string;
  comment?: string;
  submitted_at?: string;
  approved_at?: string;
  created_at?: string;
}

// Pagination wrapper - QMS specific
export interface QmsPaginatedResponse<T> {
  standards?: T[];
  inspections?: T[];
  issues?: T[];
  actions?: T[];
  total: number;
  page: number;
  pagesize: number;
}

// QMS Statistics Types
export interface QmsStatistics {
  // Quality Standards
  total_standards: number;
  active_standards: number;
  inactive_standards: number;

  // Quality Inspections/Checks
  total_inspections: number;
  pending_inspections: number;
  in_progress_inspections: number;
  completed_inspections: number;

  // Quality Issues
  total_issues: number;
  open_issues: number;
  resolved_issues: number;
  critical_issues: number;

  // Quality Improvements/Corrective Actions
  total_actions: number;
  pending_actions: number;
  in_progress_actions: number;
  completed_actions: number;
}

// ============================================
// SPC (Statistical Process Control) Types
// ============================================
export interface SpcChartBackend {
  id: string;
  chart_no: string;
  chart_name: string;
  chart_type: string;
  product_id?: string;
  product_name?: string;
  process_id?: string;
  process_name?: string;
  characteristic: string;
  unit?: string;
  usl?: number;
  lsl?: number;
  target?: number;
  ucl?: number;
  lcl?: number;
  cl?: number;
  samplesize: number;
  sampling_frequency?: string;
  status: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSpcChartRequestBackend {
  chart_no: string;
  chart_name: string;
  chart_type: string;
  product_id?: string;
  product_name?: string;
  process_id?: string;
  process_name?: string;
  characteristic: string;
  unit?: string;
  usl?: number;
  lsl?: number;
  target?: number;
  samplesize: number;
  sampling_frequency?: string;
  status?: string;
  description?: string;
}

export interface UpdateSpcChartRequestBackend {
  chart_name?: string;
  chart_type?: string;
  product_id?: string;
  product_name?: string;
  process_id?: string;
  process_name?: string;
  characteristic?: string;
  unit?: string;
  usl?: number;
  lsl?: number;
  target?: number;
  ucl?: number;
  lcl?: number;
  cl?: number;
  samplesize?: number;
  sampling_frequency?: string;
  status?: string;
  description?: string;
}

export interface SpcDataPointBackend {
  id: string;
  chart_id: string;
  sample_no: string;
  sample_time: string;
  values: number[];
  mean?: number;
  range?: number;
  std_dev?: number;
  is_out_of_control: boolean;
  violation_rules?: string[];
  operator?: string;
  remark?: string;
  created_at: string;
}

export interface CreateSpcDataPointRequestBackend {
  chart_id: string;
  sample_no: string;
  sample_time?: string;
  values: number[];
  operator?: string;
  remark?: string;
}

export interface ControlLimitsResultBackend {
  ucl: number;
  lcl: number;
  cl: number;
  usl?: number;
  lsl?: number;
  cp?: number;
  cpk?: number;
  pp?: number;
  ppk?: number;
  mean?: number;
  std_dev?: number;
  data_points_count: number;
}

export interface SpcChart {
  id: string;
  chartNo: string;
  chartName: string;
  chartType: string;
  productId?: string;
  productName?: string;
  processId?: string;
  processName?: string;
  characteristic: string;
  unit?: string;
  usl?: number;
  lsl?: number;
  target?: number;
  ucl?: number;
  lcl?: number;
  cl?: number;
  sampleSize: number;
  samplingFrequency?: string;
  status: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpcChartRequest {
  chartNo: string;
  chartName: string;
  chartType: string;
  productId?: string;
  productName?: string;
  processId?: string;
  processName?: string;
  characteristic: string;
  unit?: string;
  usl?: number;
  lsl?: number;
  target?: number;
  sampleSize: number;
  samplingFrequency?: string;
  status?: string;
  description?: string;
}

export interface SpcDataPoint {
  id: string;
  chartId: string;
  sampleNo: string;
  sampleTime: string;
  values: number[];
  mean?: number;
  range?: number;
  stdDev?: number;
  isOutOfControl: boolean;
  violationRules?: string[];
  operator?: string;
  remark?: string;
  createdAt: string;
}

export interface ControlLimitsResult {
  ucl: number;
  lcl: number;
  cl: number;
  usl?: number;
  lsl?: number;
  cp?: number;
  cpk?: number;
  pp?: number;
  ppk?: number;
  mean?: number;
  stdDev?: number;
  dataPointsCount: number;
}

// ============================================
// Quality Cost Types
// ============================================
export interface QualityCostBackend {
  id: string;
  cost_no: string;
  cost_type: string;
  cost_category: string;
  amount: number;
  currency?: string;
  occurrence_date: string;
  department?: string;
  related_order_no?: string;
  description?: string;
  responsible_person?: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityCostRequestBackend {
  cost_no: string;
  cost_type: string;
  cost_category: string;
  amount: number;
  currency?: string;
  occurrence_date: string;
  department?: string;
  related_order_no?: string;
  description?: string;
  responsible_person?: string;
  status?: string;
}

export interface UpdateQualityCostRequestBackend {
  cost_type?: string;
  cost_category?: string;
  amount?: number;
  currency?: string;
  occurrence_date?: string;
  department?: string;
  related_order_no?: string;
  description?: string;
  responsible_person?: string;
  status?: string;
}

export interface CostStatisticsBackend {
  total_cost: number;
  prevention_cost: number;
  appraisal_cost: number;
  internal_failure_cost: number;
  external_failure_cost: number;
  cost_by_category: Record<string, number>;
  cost_by_department: Record<string, number>;
  period_start: string;
  period_end: string;
}

export interface CostTrendItemBackend {
  date: string;
  total_cost: number;
  prevention_cost: number;
  appraisal_cost: number;
  internal_failure_cost: number;
  external_failure_cost: number;
}

export interface QualityCost {
  id: string;
  costNo: string;
  costType: string;
  costCategory: string;
  amount: number;
  currency?: string;
  occurrenceDate: string;
  department?: string;
  relatedOrderNo?: string;
  description?: string;
  responsiblePerson?: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQualityCostRequest {
  costNo: string;
  costType: string;
  costCategory: string;
  amount: number;
  currency?: string;
  occurrenceDate: string;
  department?: string;
  relatedOrderNo?: string;
  description?: string;
  responsiblePerson?: string;
  status?: string;
}

export interface CostStatistics {
  totalCost: number;
  preventionCost: number;
  appraisalCost: number;
  internalFailureCost: number;
  externalFailureCost: number;
  costByCategory: Record<string, number>;
  costByDepartment: Record<string, number>;
  periodStart: string;
  periodEnd: string;
}

export interface CostTrendItem {
  date: string;
  totalCost: number;
  preventionCost: number;
  appraisalCost: number;
  internalFailureCost: number;
  externalFailureCost: number;
}

// ============================================
// 8D Problem Solving Types
// ============================================
export interface EightDReportBackend {
  id: string;
  report_no: string;
  title: string;
  problem_description: string;
  severity: string;
  source?: string;
  related_issue_id?: string;
  product_id?: string;
  product_name?: string;
  customer?: string;
  status: string;
  current_stage: number;
  team_leader?: string;
  team_members?: string[];
  d1_team_established?: boolean;
  d2_problem_described?: boolean;
  d3_containment_implemented?: boolean;
  d4_root_cause_identified?: boolean;
  d5_permanent_action_selected?: boolean;
  d6_action_verified?: boolean;
  d7_preventive_implemented?: boolean;
  d8_team_recognized?: boolean;
  d1_content?: string;
  d2_content?: string;
  d3_content?: string;
  d4_content?: string;
  d5_content?: string;
  d6_content?: string;
  d7_content?: string;
  d8_content?: string;
  due_date?: string;
  closed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEightDReportRequestBackend {
  report_no: string;
  title: string;
  problem_description: string;
  severity: string;
  source?: string;
  related_issue_id?: string;
  product_id?: string;
  product_name?: string;
  customer?: string;
  team_leader?: string;
  team_members?: string[];
  due_date?: string;
}

export interface UpdateEightDReportRequestBackend {
  title?: string;
  problem_description?: string;
  severity?: string;
  source?: string;
  product_id?: string;
  product_name?: string;
  customer?: string;
  status?: string;
  due_date?: string;
}

export interface EightDAuditLogBackend {
  id: string;
  report_id: string;
  action: string;
  stage?: number;
  operator: string;
  remark?: string;
  created_at: string;
}

export interface EightDReport {
  id: string;
  reportNo: string;
  title: string;
  problemDescription: string;
  severity: string;
  source?: string;
  relatedIssueId?: string;
  productId?: string;
  productName?: string;
  customer?: string;
  status: string;
  currentStage: number;
  teamLeader?: string;
  teamMembers?: string[];
  d1TeamEstablished: boolean;
  d2ProblemDescribed: boolean;
  d3ContainmentImplemented: boolean;
  d4RootCauseIdentified: boolean;
  d5PermanentActionSelected: boolean;
  d6ActionVerified: boolean;
  d7PreventiveImplemented: boolean;
  d8TeamRecognized: boolean;
  d1Content?: string;
  d2Content?: string;
  d3Content?: string;
  d4Content?: string;
  d5Content?: string;
  d6Content?: string;
  d7Content?: string;
  d8Content?: string;
  dueDate?: string;
  closedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEightDReportRequest {
  reportNo: string;
  title: string;
  problemDescription: string;
  severity: string;
  source?: string;
  relatedIssueId?: string;
  productId?: string;
  productName?: string;
  customer?: string;
  teamLeader?: string;
  teamMembers?: string[];
  dueDate?: string;
}

export interface EightDAuditLog {
  id: string;
  reportId: string;
  action: string;
  stage?: number;
  operator: string;
  remark?: string;
  createdAt: string;
}

// ============================================
// FMEA Types
// ============================================
export interface FmeaAnalysisBackend {
  id: string;
  fmea_no: string;
  fmea_name: string;
  fmea_type: string;
  product_id?: string;
  product_name?: string;
  process_id?: string;
  process_name?: string;
  version?: string;
  status: string;
  scope?: string;
  team_leader?: string;
  team_members?: string[];
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFmeaAnalysisRequestBackend {
  fmea_no: string;
  fmea_name: string;
  fmea_type: string;
  product_id?: string;
  product_name?: string;
  process_id?: string;
  process_name?: string;
  version?: string;
  status?: string;
  scope?: string;
  team_leader?: string;
  team_members?: string[];
  description?: string;
}

export interface UpdateFmeaAnalysisRequestBackend {
  fmea_name?: string;
  fmea_type?: string;
  product_id?: string;
  product_name?: string;
  process_id?: string;
  process_name?: string;
  version?: string;
  status?: string;
  scope?: string;
  team_leader?: string;
  team_members?: string[];
  description?: string;
}

export interface FmeaItemBackend {
  id: string;
  fmea_id: string;
  item_no: string;
  function_description: string;
  failure_mode: string;
  failure_effect: string;
  severity: number;
  failure_cause: string;
  occurrence: number;
  current_controls?: string;
  detection: number;
  rpn: number;
  recommended_actions?: string;
  responsibility?: string;
  target_date?: string;
  actions_taken?: string;
  severity_revised?: number;
  occurrence_revised?: number;
  detection_revised?: number;
  rpn_revised?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFmeaItemRequestBackend {
  fmea_id: string;
  item_no: string;
  function_description: string;
  failure_mode: string;
  failure_effect: string;
  severity: number;
  failure_cause: string;
  occurrence: number;
  current_controls?: string;
  detection: number;
  recommended_actions?: string;
  responsibility?: string;
  target_date?: string;
  status?: string;
}

export interface UpdateFmeaItemRequestBackend {
  function_description?: string;
  failure_mode?: string;
  failure_effect?: string;
  severity?: number;
  failure_cause?: string;
  occurrence?: number;
  current_controls?: string;
  detection?: number;
  recommended_actions?: string;
  responsibility?: string;
  target_date?: string;
  actions_taken?: string;
  severity_revised?: number;
  occurrence_revised?: number;
  detection_revised?: number;
  status?: string;
}

export interface FmeaStatisticsBackend {
  totalitems: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  average_rpn: number;
  max_rpn: number;
  bySeverity: Record<number, number>;
  by_occurrence: Record<number, number>;
  by_detection: Record<number, number>;
}

export interface FmeaAnalysis {
  id: string;
  fmeaNo: string;
  fmeaName: string;
  fmeaType: string;
  productId?: string;
  productName?: string;
  processId?: string;
  processName?: string;
  version?: string;
  status: string;
  scope?: string;
  teamLeader?: string;
  teamMembers?: string[];
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFmeaAnalysisRequest {
  fmeaNo: string;
  fmeaName: string;
  fmeaType: string;
  productId?: string;
  productName?: string;
  processId?: string;
  processName?: string;
  version?: string;
  status?: string;
  scope?: string;
  teamLeader?: string;
  teamMembers?: string[];
  description?: string;
}

export interface FmeaItem {
  id: string;
  fmeaId: string;
  itemNo: string;
  functionDescription: string;
  failureMode: string;
  failureEffect: string;
  severity: number;
  failureCause: string;
  occurrence: number;
  currentControls?: string;
  detection: number;
  rpn: number;
  recommendedActions?: string;
  responsibility?: string;
  targetDate?: string;
  actionsTaken?: string;
  severityRevised?: number;
  occurrenceRevised?: number;
  detectionRevised?: number;
  rpnRevised?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FmeaStatistics {
  totalItems: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageRpn: number;
  maxRpn: number;
  bySeverity: Record<number, number>;
  byOccurrence: Record<number, number>;
  byDetection: Record<number, number>;
}

// ============================================
// Quality Dashboard Types
// ============================================
export interface QualityOverviewBackend {
  total_standards: number;
  total_inspections: number;
  total_issues: number;
  total_actions: number;
  pass_rate: number;
  defect_rate: number;
  on_time_delivery_rate: number;
  customer_complaint_count: number;
  quality_cost_total: number;
  quality_cost_ratio: number;
  spc_chart_count: number;
  fmea_count: number;
  eightd_count: number;
  audit_plan_count: number;
  trend_data: {
    date: string;
    pass_rate: number;
    defect_count: number;
    issue_count: number;
  }[];
  top_issues: {
    category: string;
    count: number;
    percentage: number;
  }[];
  department_performance: {
    department: string;
    pass_rate: number;
    issue_count: number;
  }[];
}

export interface QualityOverview {
  totalStandards: number;
  totalInspections: number;
  totalIssues: number;
  totalActions: number;
  passRate: number;
  defectRate: number;
  onTimeDeliveryRate: number;
  customerComplaintCount: number;
  qualityCostTotal: number;
  qualityCostRatio: number;
  spcChartCount: number;
  fmeaCount: number;
  eightdCount: number;
  auditPlanCount: number;
  trendData: {
    date: string;
    passRate: number;
    defectCount: number;
    issueCount: number;
  }[];
  topIssues: {
    category: string;
    count: number;
    percentage: number;
  }[];
  departmentPerformance: {
    department: string;
    passRate: number;
    issueCount: number;
  }[];
}

// ============================================
// Data Sync Types
// ============================================
export interface SyncRecordBackend {
  id: string;
  sync_type: string;
  source_system: string;
  target_system: string;
  record_id?: string;
  record_type?: string;
  status: string;
  error_message?: string;
  retry_count: number;
  synced_by?: string;
  synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncRecord {
  id: string;
  syncType: string;
  sourceSystem: string;
  targetSystem: string;
  recordId?: string;
  recordType?: string;
  status: string;
  errorMessage?: string;
  retryCount: number;
  syncedBy?: string;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Corrective Action Item Types
// ============================================
export interface ActionItemBackend {
  id: string;
  action_id: string;
  item_no: string;
  description: string;
  assigned_to: string;
  status: string;
  due_date?: string;
  completed_at?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  actionId: string;
  itemNo: string;
  description: string;
  assignedTo: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Audit Frontend (camelCase) Types — 双套模式补全
// ============================================================================
// 现有 AuditPlan / AuditTask / AuditFinding 为 snake_case 单套（Backend），
// 以下追加 camelCase Frontend 版本，与 SPC/QualityCost/EightD/FMEA 双套模式一致。
export interface AuditPlanFrontend {
  id: string;
  planNo: string;
  title: string;
  description?: string;
  auditType: string;
  status: string;
  auditor: string;
  auditors: string[];
  startDate: string;
  endDate: string;
  departments: string[];
  plannedDate: string;
  scope?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAuditPlanRequest {
  planNo: string;
  title: string;
  description?: string;
  auditType: string;
  auditor: string;
  auditors?: string[];
  startDate: string;
  endDate: string;
  departments?: string[];
  plannedDate?: string;
  scope?: string;
  createdBy?: string;
}

export interface CreateAuditPlanRequestBackend {
  plan_no: string;
  title: string;
  description?: string;
  audit_type: string;
  auditor: string;
  auditors?: string[];
  start_date: string;
  end_date: string;
  departments?: string[];
  planned_date?: string;
  scope?: string;
  created_by?: string;
}

export interface AuditTaskFrontend {
  id: string;
  planId: string;
  taskNo: string;
  title: string;
  description?: string;
  status: string;
  assignedTo: string;
  assignee: string;
  priority: string;
  dueDate?: string;
  completedAt?: string;
  findingsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditFindingFrontend {
  id: string;
  taskId: string;
  findingNo: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  recommendation?: string;
  assignedTo?: string;
  dueDate?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// APQP Frontend (camelCase) Types — 双套模式补全
// ============================================================================
// 现有 ApqpProject / ApqpPhase / ApqpTask / ApqpRisk / ApqpApproval 为 snake_case
// 单套（Backend），以下追加 camelCase Frontend 版本。
export interface ApqpProjectFrontend {
  id: string;
  projectNo: string;
  projectName: string;
  productId?: string;
  productName?: string;
  customer?: string;
  description?: string;
  status: string;
  currentPhase?: string;
  leader?: string;
  team?: string;
  startDate?: string;
  targetDate?: string;
  actualEndDate?: string;
  progress: number;
  riskLevel?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApqpProjectFrontendRequest {
  projectNo: string;
  projectName: string;
  productId?: string;
  productName?: string;
  customer?: string;
  description?: string;
  leader?: string;
  team?: string;
  startDate?: string;
  targetDate?: string;
  createdBy?: string;
}

export interface CreateApqpProjectBackendRequest {
  project_no: string;
  project_name: string;
  product_id?: string;
  product_name?: string;
  customer?: string;
  description?: string;
  leader?: string;
  team?: string;
  start_date?: string;
  target_date?: string;
  created_by?: string;
}

export interface ApqpPhaseFrontend {
  id: string;
  projectId: string;
  phaseCode: string;
  phaseName: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  progress: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApqpTaskFrontend {
  id: string;
  projectId: string;
  phaseId: string;
  taskName: string;
  description?: string;
  taskType?: string;
  deliverable?: string;
  status: string;
  assignee?: string;
  dueDate?: string;
  completedAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApqpRiskFrontend {
  id: string;
  projectId: string;
  riskName: string;
  description?: string;
  riskCategory?: string;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  status: string;
  mitigationPlan?: string;
  responsible?: string;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApqpApprovalFrontend {
  id: string;
  projectId: string;
  approvalType: string;
  status: string;
  applicant?: string;
  approver?: string;
  comment?: string;
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 通用审批 DTO（Frontend camelCase）
// ============================================================================
type ApprovalAction = 'approve' | 'reject' | 'rework' | 'cancel';

export type ApprovalEntityType =
  | 'inspection'
  | 'issue'
  | 'corrective_action'
  | 'audit_plan'
  | 'audit_finding'
  | 'eight_d_report'
  | 'apqp_project'
  | 'apqp_approval';

export interface ApprovalRequest {
  entityType: ApprovalEntityType;
  entityId: string;
  action: ApprovalAction;
  operator: string;
  comment?: string;
  nextStatus?: string;
}

export interface ApprovalResponse {
  id: string;
  entityType: ApprovalEntityType;
  entityId: string;
  action: ApprovalAction;
  status: string;
  operator: string;
  comment?: string;
  processedAt: string;
  createdAt: string;
}

// ============================================================================
// BI 聚合类型补充（QualityTrendItem / DefectDistribution 单独导出）
// ============================================================================
export interface QualityTrendItem {
  date: string;
  passRate: number;
  defectCount: number;
  issueCount: number;
  inspectionCount: number;
}

export interface DefectDistribution {
  category: string;
  count: number;
  percentage: number;
}
