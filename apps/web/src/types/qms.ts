/**
 * QMS 模块全量 DTO 定义 — 单一事实源 (Single Source of Truth)
 *
 * 本文件定义 QMS 10 实体的完整 DTO（Data Transfer Object）：
 * - Response DTO：完整实体（含 id/tenant_id/created_at/updated_at）
 * - Request DTO：创建请求（不含 id/时间戳）
 * - Update DTO：更新请求（所有字段可选）
 *
 * 字段命名规则：snake_case（与后端 Rust svc/qms Schema 一致）
 * 字段类型规则：
 *   - id / tenant_id / created_at / updated_at 为 string
 *   - 可空字段用 `string | null` 或 `number | null`
 *   - 数量字段为 number
 *   - 日期字段为 string（ISO 8601）
 *
 * 10 实体清单：
 *   E-1  QualityStandard（+ StandardRevision）
 *   E-2  QualityInspection（+ InspectionResultItem + InspectionAudit）
 *   E-3  QualityIssue
 *   E-4  CorrectiveAction（+ ActionItem）
 *   E-5  AuditPlan + AuditTask + AuditFinding
 *   E-6  SpcChart + SpcDataPoint + ControlLimitsResult
 *   E-7  QualityCost + QualityCostStatistics
 *   E-8  EightDReport + EightDAuditLog
 *   E-9  FmeaAnalysis + FmeaItem + FmeaStatistics
 *   E-10 ApqpProject + ApqpPhase + ApqpTask + ApqpRisk + ApqpApproval
 */

// ============================================================================
// FSM 状态枚举常量（7 个有限状态机）
// ============================================================================

/** 质量检验 FSM 状态 */
const INSPECTION_STATES = [
  'pending',
  'assigned',
  'in_progress',
  'completed',
  'audited',
  'reworked',
] as const;
export type InspectionState = (typeof INSPECTION_STATES)[number];

/** 质量问题 FSM 状态 */
const ISSUE_STATES = ['open', 'in_progress', 'resolved', 'closed', 'reopened'] as const;
export type IssueState = (typeof ISSUE_STATES)[number];

/** 纠正措施 FSM 状态 */
const ACTION_STATES = ['pending', 'in_progress', 'implemented', 'verified', 'closed'] as const;
export type ActionState = (typeof ACTION_STATES)[number];

/** 审核计划 FSM 状态 */
const AUDIT_PLAN_STATES = ['draft', 'planned', 'in_progress', 'completed', 'cancelled'] as const;
export type AuditPlanState = (typeof AUDIT_PLAN_STATES)[number];

/** 审核发现 FSM 状态 */
const AUDIT_FINDING_STATES = [
  'open',
  'in_review',
  'confirmed',
  'rectified',
  'verified',
  'closed',
] as const;
export type AuditFindingState = (typeof AUDIT_FINDING_STATES)[number];

/** 8D 报告 FSM 状态 */
const EIGHT_D_STATES = [
  'draft',
  'd1_team',
  'd2_describe',
  'd3_containment',
  'd4_root_cause',
  'd5_permanent',
  'd6_verify',
  'd7_preventive',
  'd8_recognize',
  'closed',
] as const;
export type EightDState = (typeof EIGHT_D_STATES)[number];

/** APQP 项目 FSM 状态 */
const APQP_STATES = [
  'concept',
  'planning',
  'product_design',
  'process_design',
  'product_validation',
  'process_validation',
  'production',
  'closure',
  'cancelled',
] as const;
export type ApqpState = (typeof APQP_STATES)[number];

// ============================================================================
// E-1 QualityStandard（+ StandardRevision）
// ============================================================================

export interface QualityStandardDto {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  version: string;
  status: string;
  effective_date: string | null;
  expiry_date: string | null;
  content: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityStandardDto {
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  version?: string;
  status?: string;
  effective_date?: string | null;
  expiry_date?: string | null;
  content?: string | null;
  created_by?: string;
}

export interface UpdateQualityStandardDto {
  name?: string;
  description?: string | null;
  category?: string | null;
  version?: string;
  status?: string;
  effective_date?: string | null;
  expiry_date?: string | null;
  content?: string | null;
}

export interface StandardRevisionDto {
  id: string;
  tenant_id: string;
  standard_id: string;
  version: string;
  description: string | null;
  changes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStandardRevisionDto {
  standard_id: string;
  version: string;
  description?: string | null;
  changes?: string | null;
  created_by?: string;
}

export interface UpdateStandardRevisionDto {
  version?: string;
  description?: string | null;
  changes?: string | null;
}

// ============================================================================
// E-2 QualityInspection（+ InspectionResultItem + InspectionAudit）
// ============================================================================

export interface QualityInspectionDto {
  id: string;
  tenant_id: string;
  inspection_no: string;
  inspection_type: string;
  product_id: string | null;
  product_name: string | null;
  standard_id: string | null;
  quantity: number;
  qualified_quantity: number | null;
  unqualified_quantity: number | null;
  qualification_rate: number | null;
  status: string;
  inspector: string | null;
  assignee: string | null;
  inspected_at: string | null;
  result: string | null;
  memo: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityInspectionDto {
  inspection_type: string;
  product_id?: string | null;
  product_name?: string | null;
  standard_id?: string | null;
  quantity: number;
  created_by?: string;
}

export interface UpdateQualityInspectionDto {
  inspection_type?: string;
  product_id?: string | null;
  product_name?: string | null;
  standard_id?: string | null;
  quantity?: number;
  status?: string;
  inspector?: string | null;
  assignee?: string | null;
  result?: string | null;
  memo?: string | null;
}

export interface AssignInspectionDto {
  assignee: string;
  operator: string;
}

export interface SubmitInspectionResultDto {
  qualified_quantity: number;
  unqualified_quantity: number;
  qualification_rate?: number;
  result?: string;
  memo?: string;
  inspector: string;
  results?: InspectionResultItemDto[];
}

export interface AuditInspectionDto {
  action: string;
  operator: string;
  comment?: string;
}

export interface InspectionResultItemDto {
  id: string;
  tenant_id: string;
  inspection_id: string;
  item_name: string;
  standard_value: string | null;
  measured_value: string | null;
  is_qualified: boolean;
  remark: string | null;
  created_at: string;
}

export interface CreateInspectionResultItemDto {
  inspection_id: string;
  item_name: string;
  standard_value?: string | null;
  measured_value?: string | null;
  is_qualified: boolean;
  remark?: string | null;
}

export interface InspectionAuditDto {
  id: string;
  tenant_id: string;
  inspection_id: string;
  status_from: string;
  status_to: string;
  action: string;
  operator: string;
  comment: string | null;
  created_at: string;
}

// ============================================================================
// E-3 QualityIssue
// ============================================================================

export interface QualityIssueDto {
  id: string;
  tenant_id: string;
  issue_no: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  source: string | null;
  related_inspection_id: string | null;
  assigned_to: string | null;
  priority: string | null;
  due_date: string | null;
  resolution: string | null;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityIssueDto {
  title: string;
  description: string;
  severity: string;
  source?: string | null;
  related_inspection_id?: string | null;
  assigned_to?: string | null;
  priority?: string | null;
  due_date?: string | null;
  created_by?: string;
}

export interface UpdateQualityIssueDto {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  source?: string | null;
  related_inspection_id?: string | null;
  assigned_to?: string | null;
  priority?: string | null;
  due_date?: string | null;
  resolution?: string | null;
  closed_at?: string | null;
}

// ============================================================================
// E-4 CorrectiveAction（+ ActionItem）
// ============================================================================

export interface CorrectiveActionDto {
  id: string;
  tenant_id: string;
  issue_id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  status: string;
  implementation_date: string | null;
  verification_result: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCorrectiveActionDto {
  issue_id: string;
  title: string;
  description?: string | null;
  assigned_to: string;
  created_by?: string;
}

export interface UpdateCorrectiveActionDto {
  title?: string;
  description?: string | null;
  assigned_to?: string;
  status?: string;
  implementation_date?: string | null;
  verification_result?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
}

export interface ActionItemDto {
  id: string;
  tenant_id: string;
  action_id: string;
  item_no: string;
  description: string;
  assigned_to: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateActionItemDto {
  action_id: string;
  item_no: string;
  description: string;
  assigned_to: string;
  due_date?: string | null;
  remark?: string | null;
}

export interface UpdateActionItemDto {
  item_no?: string;
  description?: string;
  assigned_to?: string;
  status?: string;
  due_date?: string | null;
  completed_at?: string | null;
  remark?: string | null;
}

// ============================================================================
// E-5 AuditPlan + AuditTask + AuditFinding
// ============================================================================

export interface AuditPlanDto {
  id: string;
  tenant_id: string;
  plan_no: string;
  title: string;
  description: string | null;
  audit_type: string;
  status: string;
  auditor: string;
  auditors: string[];
  start_date: string;
  end_date: string;
  departments: string[];
  planned_date: string;
  scope: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAuditPlanDto {
  plan_no: string;
  title: string;
  description?: string | null;
  audit_type: string;
  auditor: string;
  auditors?: string[];
  start_date: string;
  end_date: string;
  departments?: string[];
  planned_date?: string;
  scope?: string | null;
  created_by?: string;
}

export interface UpdateAuditPlanDto {
  title?: string;
  description?: string | null;
  audit_type?: string;
  status?: string;
  auditor?: string;
  auditors?: string[];
  start_date?: string;
  end_date?: string;
  departments?: string[];
  planned_date?: string;
  scope?: string | null;
}

export interface AuditTaskDto {
  id: string;
  tenant_id: string;
  plan_id: string;
  task_no: string;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string;
  assignee: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  findings_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAuditTaskDto {
  plan_id: string;
  title: string;
  description?: string | null;
  assigned_to: string;
  assignee?: string;
  priority?: string;
  due_date?: string | null;
}

export interface UpdateAuditTaskDto {
  title?: string;
  description?: string | null;
  status?: string;
  assigned_to?: string;
  assignee?: string;
  priority?: string;
  due_date?: string | null;
  completed_at?: string | null;
}

export interface AuditFindingDto {
  id: string;
  tenant_id: string;
  task_id: string;
  finding_no: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  recommendation: string | null;
  assigned_to: string | null;
  due_date: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAuditFindingDto {
  task_id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  recommendation?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
}

export interface UpdateAuditFindingDto {
  title?: string;
  description?: string;
  severity?: string;
  category?: string;
  status?: string;
  recommendation?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  resolved_at?: string | null;
}

// ============================================================================
// E-6 SpcChart + SpcDataPoint + ControlLimitsResult
// ============================================================================

export interface SpcChartDto {
  id: string;
  tenant_id: string;
  chart_no: string;
  chart_name: string;
  chart_type: string;
  product_id: string | null;
  product_name: string | null;
  process_id: string | null;
  process_name: string | null;
  characteristic: string;
  unit: string | null;
  usl: number | null;
  lsl: number | null;
  target: number | null;
  ucl: number | null;
  lcl: number | null;
  cl: number | null;
  sample_size: number;
  sampling_frequency: string | null;
  status: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSpcChartDto {
  chart_no: string;
  chart_name: string;
  chart_type: string;
  product_id?: string | null;
  product_name?: string | null;
  process_id?: string | null;
  process_name?: string | null;
  characteristic: string;
  unit?: string | null;
  usl?: number | null;
  lsl?: number | null;
  target?: number | null;
  sample_size: number;
  sampling_frequency?: string | null;
  status?: string;
  description?: string | null;
  created_by?: string;
}

export interface UpdateSpcChartDto {
  chart_name?: string;
  chart_type?: string;
  product_id?: string | null;
  product_name?: string | null;
  process_id?: string | null;
  process_name?: string | null;
  characteristic?: string;
  unit?: string | null;
  usl?: number | null;
  lsl?: number | null;
  target?: number | null;
  ucl?: number | null;
  lcl?: number | null;
  cl?: number | null;
  sample_size?: number;
  sampling_frequency?: string | null;
  status?: string;
  description?: string | null;
}

export interface SpcDataPointDto {
  id: string;
  tenant_id: string;
  chart_id: string;
  sample_no: string;
  sample_time: string;
  values: number[];
  mean: number | null;
  range: number | null;
  std_dev: number | null;
  is_out_of_control: boolean;
  violation_rules: string[] | null;
  operator: string | null;
  remark: string | null;
  created_at: string;
}

export interface CreateSpcDataPointDto {
  chart_id: string;
  sample_no: string;
  sample_time?: string;
  values: number[];
  operator?: string | null;
  remark?: string | null;
}

export interface ControlLimitsResultDto {
  ucl: number;
  lcl: number;
  cl: number;
  usl: number | null;
  lsl: number | null;
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
  mean: number | null;
  std_dev: number | null;
  data_points_count: number;
}

// ============================================================================
// E-7 QualityCost + QualityCostStatistics
// ============================================================================

export interface QualityCostDto {
  id: string;
  tenant_id: string;
  cost_no: string;
  cost_type: string;
  cost_category: string;
  amount: number;
  currency: string | null;
  occurrence_date: string;
  department: string | null;
  related_order_no: string | null;
  description: string | null;
  responsible_person: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityCostDto {
  cost_no: string;
  cost_type: string;
  cost_category: string;
  amount: number;
  currency?: string | null;
  occurrence_date: string;
  department?: string | null;
  related_order_no?: string | null;
  description?: string | null;
  responsible_person?: string | null;
  status?: string;
  created_by?: string;
}

export interface UpdateQualityCostDto {
  cost_type?: string;
  cost_category?: string;
  amount?: number;
  currency?: string | null;
  occurrence_date?: string;
  department?: string | null;
  related_order_no?: string | null;
  description?: string | null;
  responsible_person?: string | null;
  status?: string;
}

export interface QualityCostStatisticsDto {
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

// ============================================================================
// E-8 EightDReport + EightDAuditLog
// ============================================================================

export interface EightDReportDto {
  id: string;
  tenant_id: string;
  report_no: string;
  title: string;
  problem_description: string;
  severity: string;
  source: string | null;
  related_issue_id: string | null;
  product_id: string | null;
  product_name: string | null;
  customer: string | null;
  status: string;
  current_stage: number;
  team_leader: string | null;
  team_members: string[] | null;
  d1_team_established: boolean;
  d2_problem_described: boolean;
  d3_containment_implemented: boolean;
  d4_root_cause_identified: boolean;
  d5_permanent_action_selected: boolean;
  d6_action_verified: boolean;
  d7_preventive_implemented: boolean;
  d8_team_recognized: boolean;
  d1_content: string | null;
  d2_content: string | null;
  d3_content: string | null;
  d4_content: string | null;
  d5_content: string | null;
  d6_content: string | null;
  d7_content: string | null;
  d8_content: string | null;
  due_date: string | null;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEightDReportDto {
  report_no: string;
  title: string;
  problem_description: string;
  severity: string;
  source?: string | null;
  related_issue_id?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  customer?: string | null;
  team_leader?: string | null;
  team_members?: string[] | null;
  due_date?: string | null;
  created_by?: string;
}

export interface UpdateEightDReportDto {
  title?: string;
  problem_description?: string;
  severity?: string;
  source?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  customer?: string | null;
  status?: string;
  current_stage?: number;
  team_leader?: string | null;
  team_members?: string[] | null;
  d1_team_established?: boolean;
  d2_problem_described?: boolean;
  d3_containment_implemented?: boolean;
  d4_root_cause_identified?: boolean;
  d5_permanent_action_selected?: boolean;
  d6_action_verified?: boolean;
  d7_preventive_implemented?: boolean;
  d8_team_recognized?: boolean;
  d1_content?: string | null;
  d2_content?: string | null;
  d3_content?: string | null;
  d4_content?: string | null;
  d5_content?: string | null;
  d6_content?: string | null;
  d7_content?: string | null;
  d8_content?: string | null;
  due_date?: string | null;
  closed_at?: string | null;
}

export interface EightDAuditLogDto {
  id: string;
  tenant_id: string;
  report_id: string;
  action: string;
  stage: number | null;
  operator: string;
  remark: string | null;
  created_at: string;
}

export interface CreateEightDAuditLogDto {
  report_id: string;
  action: string;
  stage?: number | null;
  operator: string;
  remark?: string | null;
}

// ============================================================================
// E-9 FmeaAnalysis + FmeaItem + FmeaStatistics
// ============================================================================

export interface FmeaAnalysisDto {
  id: string;
  tenant_id: string;
  fmea_no: string;
  fmea_name: string;
  fmea_type: string;
  product_id: string | null;
  product_name: string | null;
  process_id: string | null;
  process_name: string | null;
  version: string | null;
  status: string;
  scope: string | null;
  team_leader: string | null;
  team_members: string[] | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFmeaAnalysisDto {
  fmea_no: string;
  fmea_name: string;
  fmea_type: string;
  product_id?: string | null;
  product_name?: string | null;
  process_id?: string | null;
  process_name?: string | null;
  version?: string | null;
  status?: string;
  scope?: string | null;
  team_leader?: string | null;
  team_members?: string[] | null;
  description?: string | null;
  created_by?: string;
}

export interface UpdateFmeaAnalysisDto {
  fmea_name?: string;
  fmea_type?: string;
  product_id?: string | null;
  product_name?: string | null;
  process_id?: string | null;
  process_name?: string | null;
  version?: string | null;
  status?: string;
  scope?: string | null;
  team_leader?: string | null;
  team_members?: string[] | null;
  description?: string | null;
}

export interface FmeaItemDto {
  id: string;
  tenant_id: string;
  fmea_id: string;
  item_no: string;
  function_description: string;
  failure_mode: string;
  failure_effect: string;
  severity: number;
  failure_cause: string;
  occurrence: number;
  current_controls: string | null;
  detection: number;
  rpn: number;
  recommended_actions: string | null;
  responsibility: string | null;
  target_date: string | null;
  actions_taken: string | null;
  severity_revised: number | null;
  occurrence_revised: number | null;
  detection_revised: number | null;
  rpn_revised: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFmeaItemDto {
  fmea_id: string;
  item_no: string;
  function_description: string;
  failure_mode: string;
  failure_effect: string;
  severity: number;
  failure_cause: string;
  occurrence: number;
  current_controls?: string | null;
  detection: number;
  recommended_actions?: string | null;
  responsibility?: string | null;
  target_date?: string | null;
  status?: string;
}

export interface UpdateFmeaItemDto {
  function_description?: string;
  failure_mode?: string;
  failure_effect?: string;
  severity?: number;
  failure_cause?: string;
  occurrence?: number;
  current_controls?: string | null;
  detection?: number;
  recommended_actions?: string | null;
  responsibility?: string | null;
  target_date?: string | null;
  actions_taken?: string | null;
  severity_revised?: number | null;
  occurrence_revised?: number | null;
  detection_revised?: number | null;
  status?: string;
}

export interface FmeaStatisticsDto {
  total_items: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  average_rpn: number;
  max_rpn: number;
  by_severity: Record<number, number>;
  by_occurrence: Record<number, number>;
  by_detection: Record<number, number>;
}

// ============================================================================
// E-10 ApqpProject + ApqpPhase + ApqpTask + ApqpRisk + ApqpApproval
// ============================================================================

export interface ApqpProjectDto {
  id: string;
  tenant_id: string;
  project_no: string;
  project_name: string;
  product_id: string | null;
  product_name: string | null;
  customer: string | null;
  description: string | null;
  status: string;
  current_phase: string | null;
  leader: string | null;
  team: string | null;
  start_date: string | null;
  target_date: string | null;
  actual_end_date: string | null;
  progress: number;
  risk_level: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApqpProjectDto {
  project_no: string;
  project_name: string;
  product_id?: string | null;
  product_name?: string | null;
  customer?: string | null;
  description?: string | null;
  leader?: string | null;
  team?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  created_by?: string;
}

export interface UpdateApqpProjectDto {
  project_name?: string;
  product_id?: string | null;
  product_name?: string | null;
  customer?: string | null;
  description?: string | null;
  status?: string;
  current_phase?: string | null;
  leader?: string | null;
  team?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  actual_end_date?: string | null;
  progress?: number;
  risk_level?: string | null;
}

export interface ApqpPhaseDto {
  id: string;
  tenant_id: string;
  project_id: string;
  phase_code: string;
  phase_name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  progress: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateApqpPhaseDto {
  project_id: string;
  phase_code: string;
  phase_name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  sort_order?: number;
}

export interface UpdateApqpPhaseDto {
  phase_name?: string;
  description?: string | null;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  progress?: number;
  sort_order?: number;
}

export interface ApqpTaskDto {
  id: string;
  tenant_id: string;
  project_id: string;
  phase_id: string;
  task_name: string;
  description: string | null;
  task_type: string | null;
  deliverable: string | null;
  status: string;
  assignee: string | null;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateApqpTaskDto {
  project_id: string;
  phase_id: string;
  task_name: string;
  description?: string | null;
  task_type?: string | null;
  deliverable?: string | null;
  assignee?: string | null;
  due_date?: string | null;
  sort_order?: number;
}

export interface UpdateApqpTaskDto {
  task_name?: string;
  description?: string | null;
  task_type?: string | null;
  deliverable?: string | null;
  status?: string;
  assignee?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  sort_order?: number;
}

export interface ApqpRiskDto {
  id: string;
  tenant_id: string;
  project_id: string;
  risk_name: string;
  description: string | null;
  risk_category: string | null;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  status: string;
  mitigation_plan: string | null;
  responsible: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApqpRiskDto {
  project_id: string;
  risk_name: string;
  description?: string | null;
  risk_category?: string | null;
  severity: number;
  occurrence: number;
  detection: number;
  mitigation_plan?: string | null;
  responsible?: string | null;
  target_date?: string | null;
}

export interface UpdateApqpRiskDto {
  risk_name?: string;
  description?: string | null;
  risk_category?: string | null;
  severity?: number;
  occurrence?: number;
  detection?: number;
  status?: string;
  mitigation_plan?: string | null;
  responsible?: string | null;
  target_date?: string | null;
}

export interface ApqpApprovalDto {
  id: string;
  tenant_id: string;
  project_id: string;
  approval_type: string;
  status: string;
  applicant: string | null;
  approver: string | null;
  comment: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApqpApprovalDto {
  project_id: string;
  approval_type: string;
  applicant?: string | null;
  comment?: string | null;
}

export interface UpdateApqpApprovalDto {
  status?: string;
  approver?: string | null;
  comment?: string | null;
  approved_at?: string | null;
}

// ============================================================================
// 审批 DTO（通用 ApprovalRequest / ApprovalResponse）
// ============================================================================

export type ApprovalAction = 'approve' | 'reject' | 'rework' | 'cancel';

export type ApprovalEntityType =
  | 'inspection'
  | 'issue'
  | 'corrective_action'
  | 'audit_plan'
  | 'audit_finding'
  | 'eight_d_report'
  | 'apqp_project'
  | 'apqp_approval';

export interface ApprovalRequestDto {
  entity_type: ApprovalEntityType;
  entity_id: string;
  action: ApprovalAction;
  operator: string;
  comment?: string | null;
  next_status?: string | null;
}

export interface ApprovalResponseDto {
  id: string;
  tenant_id: string;
  entity_type: ApprovalEntityType;
  entity_id: string;
  action: ApprovalAction;
  status: string;
  operator: string;
  comment: string | null;
  processed_at: string;
  created_at: string;
}

// ============================================================================
// BI 聚合类型（QualityOverview / QualityTrendItem / DefectDistribution）
// ============================================================================

export interface QualityOverviewDto {
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
  apqp_project_count: number;
  trend_data: QualityTrendItemDto[];
  top_issues: DefectDistributionDto[];
  department_performance: DepartmentPerformanceDto[];
}

export interface QualityTrendItemDto {
  date: string;
  pass_rate: number;
  defect_count: number;
  issue_count: number;
  inspection_count: number;
}

export interface DefectDistributionDto {
  category: string;
  count: number;
  percentage: number;
}

export interface DepartmentPerformanceDto {
  department: string;
  pass_rate: number;
  issue_count: number;
  inspection_count: number;
}
