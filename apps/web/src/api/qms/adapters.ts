import type {
  QualityStandardBackend,
  QualityStandard,
  CreateQualityStandardRequest,
  CreateQualityStandardRequestBackend,
  QualityInspectionBackend,
  QualityCheck,
  CreateQualityCheckRequest,
  CreateQualityInspectionRequestBackend,
  QualityIssueBackend,
  QualityIssue,
  CreateQualityIssueRequest,
  CreateQualityIssueRequestBackend,
  CorrectiveActionBackend,
  QualityImprovement,
  CreateQualityImprovementRequest,
  CreateCorrectiveActionRequestBackend,
  SpcChartBackend,
  SpcChart,
  CreateSpcChartRequest,
  CreateSpcChartRequestBackend,
  SpcDataPointBackend,
  SpcDataPoint,
  ControlLimitsResultBackend,
  ControlLimitsResult,
  QualityCostBackend,
  QualityCost,
  CreateQualityCostRequest,
  CreateQualityCostRequestBackend,
  CostStatisticsBackend,
  CostStatistics,
  CostTrendItemBackend,
  CostTrendItem,
  EightDReportBackend,
  EightDReport,
  CreateEightDReportRequest,
  CreateEightDReportRequestBackend,
  EightDAuditLogBackend,
  EightDAuditLog,
  FmeaAnalysisBackend,
  FmeaAnalysis,
  CreateFmeaAnalysisRequest,
  CreateFmeaAnalysisRequestBackend,
  FmeaItemBackend,
  FmeaItem,
  CreateFmeaItemRequestBackend,
  FmeaStatisticsBackend,
  FmeaStatistics,
  QualityOverviewBackend,
  QualityOverview,
  SyncRecordBackend,
  SyncRecord,
  ActionItemBackend,
  ActionItem,
} from './types';

// Quality Standard adapters
export const adaptStandardToFrontend = (backend: QualityStandardBackend): QualityStandard => ({
  id: backend.id,
  name: backend.name,
  code: backend.code,
  category: backend.category || '',
  version: backend.version || '',
  description: backend.description || '',
  content: backend.description || '',
  status: backend.status,
  effective_date: backend.created_at,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

export const adaptStandardToBackend = (
  frontend: CreateQualityStandardRequest
): CreateQualityStandardRequestBackend => ({
  code: frontend.code,
  name: frontend.name,
  description: frontend.description,
  category: frontend.category,
  version: frontend.version,
});

// Quality Inspection adapters
export const adaptInspectionToFrontend = (backend: QualityInspectionBackend): QualityCheck => ({
  id: backend.id,
  inspection_no: backend.inspection_no,
  inspection_type: backend.inspection_type,
  product_name: backend.product_name,
  standard_id: backend.standard_id,
  quantity: backend.quantity,
  qualified_quantity: backend.qualified_quantity,
  unqualified_quantity: backend.unqualified_quantity,
  qualification_rate: backend.qualification_rate,
  status: backend.status,
  inspector: backend.inspector,
  assignee: backend.assignee,
  inspected_at: backend.inspected_at,
  result: backend.result,
  memo: backend.memo,
  created_by: backend.created_by,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

export const adaptInspectionToBackend = (
  frontend: CreateQualityCheckRequest
): CreateQualityInspectionRequestBackend => ({
  inspection_type: frontend.inspection_type,
  product_name: frontend.product_name,
  standard_id: frontend.standard_id,
  quantity: frontend.quantity,
  created_by: frontend.created_by,
});

// Quality Issue adapters
export const adaptIssueToFrontend = (backend: QualityIssueBackend): QualityIssue => ({
  id: backend.id,
  issue_no: backend.title.substring(0, 20) + (backend.title.length > 20 ? '...' : ''),
  title: backend.title,
  description: backend.description,
  severity: backend.severity,
  category: backend.source || '',
  status: backend.status,
  assignee: backend.assigned_to || '',
  due_date: backend.due_date,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

export const adaptIssueToBackend = (
  frontend: CreateQualityIssueRequest
): CreateQualityIssueRequestBackend => ({
  title: frontend.title,
  description: frontend.description,
  severity: frontend.severity,
  source: frontend.category,
  assigned_to: frontend.assignee,
});

// Quality Improvement / Corrective Action adapters
export const adaptActionToFrontend = (backend: CorrectiveActionBackend): QualityImprovement => ({
  id: backend.id,
  improvement_no: backend.title.substring(0, 20) + (backend.title.length > 20 ? '...' : ''),
  title: backend.title,
  description: backend.description || '',
  category: '',
  status: backend.status,
  proposer: backend.verified_by || '',
  assignee: backend.assigned_to,
  improvement_effect: backend.verification_result,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

export const adaptActionToBackend = (
  frontend: CreateQualityImprovementRequest
): CreateCorrectiveActionRequestBackend => ({
  issue_id: '00000000-0000-0000-0000-000000000000',
  title: frontend.title,
  description: frontend.description,
  assigned_to: frontend.assignee,
});

// SPC adapters
export const adaptSpcChartToFrontend = (backend: SpcChartBackend): SpcChart => ({
  id: backend.id,
  chartNo: backend.chart_no,
  chartName: backend.chart_name,
  chartType: backend.chart_type,
  productId: backend.product_id,
  productName: backend.product_name,
  processId: backend.process_id,
  processName: backend.process_name,
  characteristic: backend.characteristic,
  unit: backend.unit,
  usl: backend.usl,
  lsl: backend.lsl,
  target: backend.target,
  ucl: backend.ucl,
  lcl: backend.lcl,
  cl: backend.cl,
  sampleSize: backend.samplesize,
  samplingFrequency: backend.sampling_frequency,
  status: backend.status,
  description: backend.description,
  createdBy: backend.created_by,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

export const adaptSpcChartToBackend = (
  frontend: CreateSpcChartRequest
): CreateSpcChartRequestBackend => ({
  chart_no: frontend.chartNo,
  chart_name: frontend.chartName,
  chart_type: frontend.chartType,
  product_id: frontend.productId,
  product_name: frontend.productName,
  process_id: frontend.processId,
  process_name: frontend.processName,
  characteristic: frontend.characteristic,
  unit: frontend.unit,
  usl: frontend.usl,
  lsl: frontend.lsl,
  target: frontend.target,
  samplesize: frontend.sampleSize,
  sampling_frequency: frontend.samplingFrequency,
  status: frontend.status,
  description: frontend.description,
});

export const adaptSpcDataPointToFrontend = (backend: SpcDataPointBackend): SpcDataPoint => ({
  id: backend.id,
  chartId: backend.chart_id,
  sampleNo: backend.sample_no,
  sampleTime: backend.sample_time,
  values: backend.values,
  mean: backend.mean,
  range: backend.range,
  stdDev: backend.std_dev,
  isOutOfControl: backend.is_out_of_control,
  violationRules: backend.violation_rules,
  operator: backend.operator,
  remark: backend.remark,
  createdAt: backend.created_at,
});

export const adaptControlLimitsToFrontend = (
  backend: ControlLimitsResultBackend
): ControlLimitsResult => ({
  ucl: backend.ucl,
  lcl: backend.lcl,
  cl: backend.cl,
  usl: backend.usl,
  lsl: backend.lsl,
  cp: backend.cp,
  cpk: backend.cpk,
  pp: backend.pp,
  ppk: backend.ppk,
  mean: backend.mean,
  stdDev: backend.std_dev,
  dataPointsCount: backend.data_points_count,
});

// Quality Cost adapters
export const adaptQualityCostToFrontend = (backend: QualityCostBackend): QualityCost => ({
  id: backend.id,
  costNo: backend.cost_no,
  costType: backend.cost_type,
  costCategory: backend.cost_category,
  amount: backend.amount,
  currency: backend.currency,
  occurrenceDate: backend.occurrence_date,
  department: backend.department,
  relatedOrderNo: backend.related_order_no,
  description: backend.description,
  responsiblePerson: backend.responsible_person,
  status: backend.status,
  createdBy: backend.created_by,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

export const adaptQualityCostToBackend = (
  frontend: CreateQualityCostRequest
): CreateQualityCostRequestBackend => ({
  cost_no: frontend.costNo,
  cost_type: frontend.costType,
  cost_category: frontend.costCategory,
  amount: frontend.amount,
  currency: frontend.currency,
  occurrence_date: frontend.occurrenceDate,
  department: frontend.department,
  related_order_no: frontend.relatedOrderNo,
  description: frontend.description,
  responsible_person: frontend.responsiblePerson,
  status: frontend.status,
});

export const adaptCostStatisticsToFrontend = (backend: CostStatisticsBackend): CostStatistics => ({
  totalCost: backend.total_cost,
  preventionCost: backend.prevention_cost,
  appraisalCost: backend.appraisal_cost,
  internalFailureCost: backend.internal_failure_cost,
  externalFailureCost: backend.external_failure_cost,
  costByCategory: backend.cost_by_category,
  costByDepartment: backend.cost_by_department,
  periodStart: backend.period_start,
  periodEnd: backend.period_end,
});

export const adaptCostTrendItemToFrontend = (backend: CostTrendItemBackend): CostTrendItem => ({
  date: backend.date,
  totalCost: backend.total_cost,
  preventionCost: backend.prevention_cost,
  appraisalCost: backend.appraisal_cost,
  internalFailureCost: backend.internal_failure_cost,
  externalFailureCost: backend.external_failure_cost,
});

// 8D Report adapters
export const adaptEightDReportToFrontend = (backend: EightDReportBackend): EightDReport => ({
  id: backend.id,
  reportNo: backend.report_no,
  title: backend.title,
  problemDescription: backend.problem_description,
  severity: backend.severity,
  source: backend.source,
  relatedIssueId: backend.related_issue_id,
  productId: backend.product_id,
  productName: backend.product_name,
  customer: backend.customer,
  status: backend.status,
  currentStage: backend.current_stage,
  teamLeader: backend.team_leader,
  teamMembers: backend.team_members,
  d1TeamEstablished: backend.d1_team_established || false,
  d2ProblemDescribed: backend.d2_problem_described || false,
  d3ContainmentImplemented: backend.d3_containment_implemented || false,
  d4RootCauseIdentified: backend.d4_root_cause_identified || false,
  d5PermanentActionSelected: backend.d5_permanent_action_selected || false,
  d6ActionVerified: backend.d6_action_verified || false,
  d7PreventiveImplemented: backend.d7_preventive_implemented || false,
  d8TeamRecognized: backend.d8_team_recognized || false,
  d1Content: backend.d1_content,
  d2Content: backend.d2_content,
  d3Content: backend.d3_content,
  d4Content: backend.d4_content,
  d5Content: backend.d5_content,
  d6Content: backend.d6_content,
  d7Content: backend.d7_content,
  d8Content: backend.d8_content,
  dueDate: backend.due_date,
  closedAt: backend.closed_at,
  createdBy: backend.created_by,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

export const adaptEightDReportToBackend = (
  frontend: CreateEightDReportRequest
): CreateEightDReportRequestBackend => ({
  report_no: frontend.reportNo,
  title: frontend.title,
  problem_description: frontend.problemDescription,
  severity: frontend.severity,
  source: frontend.source,
  related_issue_id: frontend.relatedIssueId,
  product_id: frontend.productId,
  product_name: frontend.productName,
  customer: frontend.customer,
  team_leader: frontend.teamLeader,
  team_members: frontend.teamMembers,
  due_date: frontend.dueDate,
});

export const adaptEightDAuditLogToFrontend = (backend: EightDAuditLogBackend): EightDAuditLog => ({
  id: backend.id,
  reportId: backend.report_id,
  action: backend.action,
  stage: backend.stage,
  operator: backend.operator,
  remark: backend.remark,
  createdAt: backend.created_at,
});

// FMEA adapters
export const adaptFmeaAnalysisToFrontend = (backend: FmeaAnalysisBackend): FmeaAnalysis => ({
  id: backend.id,
  fmeaNo: backend.fmea_no,
  fmeaName: backend.fmea_name,
  fmeaType: backend.fmea_type,
  productId: backend.product_id,
  productName: backend.product_name,
  processId: backend.process_id,
  processName: backend.process_name,
  version: backend.version,
  status: backend.status,
  scope: backend.scope,
  teamLeader: backend.team_leader,
  teamMembers: backend.team_members,
  description: backend.description,
  createdBy: backend.created_by,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

export const adaptFmeaAnalysisToBackend = (
  frontend: CreateFmeaAnalysisRequest
): CreateFmeaAnalysisRequestBackend => ({
  fmea_no: frontend.fmeaNo,
  fmea_name: frontend.fmeaName,
  fmea_type: frontend.fmeaType,
  product_id: frontend.productId,
  product_name: frontend.productName,
  process_id: frontend.processId,
  process_name: frontend.processName,
  version: frontend.version,
  status: frontend.status,
  scope: frontend.scope,
  team_leader: frontend.teamLeader,
  team_members: frontend.teamMembers,
  description: frontend.description,
});

export const adaptFmeaItemToFrontend = (backend: FmeaItemBackend): FmeaItem => ({
  id: backend.id,
  fmeaId: backend.fmea_id,
  itemNo: backend.item_no,
  functionDescription: backend.function_description,
  failureMode: backend.failure_mode,
  failureEffect: backend.failure_effect,
  severity: backend.severity,
  failureCause: backend.failure_cause,
  occurrence: backend.occurrence,
  currentControls: backend.current_controls,
  detection: backend.detection,
  rpn: backend.rpn,
  recommendedActions: backend.recommended_actions,
  responsibility: backend.responsibility,
  targetDate: backend.target_date,
  actionsTaken: backend.actions_taken,
  severityRevised: backend.severity_revised,
  occurrenceRevised: backend.occurrence_revised,
  detectionRevised: backend.detection_revised,
  rpnRevised: backend.rpn_revised,
  status: backend.status,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

export const adaptFmeaItemToBackend = (
  frontend: Omit<FmeaItem, 'id' | 'rpn' | 'rpnRevised' | 'createdAt' | 'updatedAt'>
): CreateFmeaItemRequestBackend => ({
  fmea_id: frontend.fmeaId,
  item_no: frontend.itemNo,
  function_description: frontend.functionDescription,
  failure_mode: frontend.failureMode,
  failure_effect: frontend.failureEffect,
  severity: frontend.severity,
  failure_cause: frontend.failureCause,
  occurrence: frontend.occurrence,
  current_controls: frontend.currentControls,
  detection: frontend.detection,
  recommended_actions: frontend.recommendedActions,
  responsibility: frontend.responsibility,
  target_date: frontend.targetDate,
  status: frontend.status,
});

export const adaptFmeaStatisticsToFrontend = (backend: FmeaStatisticsBackend): FmeaStatistics => ({
  totalItems: backend.totalitems,
  highRiskCount: backend.high_risk_count,
  mediumRiskCount: backend.medium_risk_count,
  lowRiskCount: backend.low_risk_count,
  averageRpn: backend.average_rpn,
  maxRpn: backend.max_rpn,
  bySeverity: backend.bySeverity,
  byOccurrence: backend.by_occurrence,
  byDetection: backend.by_detection,
});

// Quality Dashboard adapters
export const adaptQualityOverviewToFrontend = (
  backend: QualityOverviewBackend
): QualityOverview => ({
  totalStandards: backend.total_standards,
  totalInspections: backend.total_inspections,
  totalIssues: backend.total_issues,
  totalActions: backend.total_actions,
  passRate: backend.pass_rate,
  defectRate: backend.defect_rate,
  onTimeDeliveryRate: backend.on_time_delivery_rate,
  customerComplaintCount: backend.customer_complaint_count,
  qualityCostTotal: backend.quality_cost_total,
  qualityCostRatio: backend.quality_cost_ratio,
  spcChartCount: backend.spc_chart_count,
  fmeaCount: backend.fmea_count,
  eightdCount: backend.eightd_count,
  auditPlanCount: backend.audit_plan_count,
  trendData:
    backend.trend_data?.map((item) => ({
      date: item.date,
      passRate: item.pass_rate,
      defectCount: item.defect_count,
      issueCount: item.issue_count,
    })) || [],
  topIssues:
    backend.top_issues?.map((item) => ({
      category: item.category,
      count: item.count,
      percentage: item.percentage,
    })) || [],
  departmentPerformance:
    backend.department_performance?.map((item) => ({
      department: item.department,
      passRate: item.pass_rate,
      issueCount: item.issue_count,
    })) || [],
});

// Data Sync adapters
export const adaptSyncRecordToFrontend = (backend: SyncRecordBackend): SyncRecord => ({
  id: backend.id,
  syncType: backend.sync_type,
  sourceSystem: backend.source_system,
  targetSystem: backend.target_system,
  recordId: backend.record_id,
  recordType: backend.record_type,
  status: backend.status,
  errorMessage: backend.error_message,
  retryCount: backend.retry_count,
  syncedBy: backend.synced_by,
  syncedAt: backend.synced_at,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

// Corrective Action Item adapters
export const adaptActionItemToFrontend = (backend: ActionItemBackend): ActionItem => ({
  id: backend.id,
  actionId: backend.action_id,
  itemNo: backend.item_no,
  description: backend.description,
  assignedTo: backend.assigned_to,
  status: backend.status,
  dueDate: backend.due_date,
  completedAt: backend.completed_at,
  remark: backend.remark,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});
