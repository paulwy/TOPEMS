export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  project_type: string;
  status: string;
  leader?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  progress: number;
  project_config?: Record<string, unknown>;
  benefittarget?: Record<string, unknown>;
  risklevel?: string;
  priority?: number;
  tags?: string[];
  parent_id?: string;
  workspace_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  cost_center_id?: string;
  cost_center_name?: string;
  actual_cost?: number;
  committed_cost?: number;
  remaining_budget?: number;
  cost_variance?: number;
  cost_variance_rate?: number;
  revenue_recognized?: number;
  accounts_receivable?: number;
  gross_profit?: number;
  gross_margin?: number;
  budget_utilization_rate?: number;
}

export interface CreateProjectRequest {
  name: string;
  code: string;
  description?: string;
  project_type: string;
  leader?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  project_config?: Record<string, unknown>;
  benefittarget?: Record<string, unknown>;
  risklevel?: string;
  priority?: number;
  tags?: string[];
  parent_id?: string;
  workspace_id?: string;
  cost_center_id?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: string;
  leader?: string;
  end_date?: string;
  budget?: number;
  progress?: number;
  project_config?: Record<string, unknown>;
  benefittarget?: Record<string, unknown>;
  risklevel?: string;
  priority?: number;
  tags?: string[];
  parent_id?: string;
  workspace_id?: string;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  sequence_number: number;
  start_date?: string;
  end_date?: string;
  progress: number;
  status: string;
  predecessor_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  date: string;
  status: string;
  phase_id?: string;
  acceptance_criteria?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  responsibilities?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectResource {
  id: string;
  project_id: string;
  resource_type: string;
  resource_id: string;
  resource_service?: string;
  role?: string;
  start_date?: string;
  end_date?: string;
  allocation_percent?: number;
  actual_hours?: number;
  actual_cost?: number;
  status?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectExpense {
  id: string;
  project_id: string;
  phase_id?: string;
  expense_type: string;
  category?: string;
  subcategory?: string;
  description?: string;
  amount: number;
  currency?: string;
  incurred_date: string;
  reported_date?: string;
  paid_date?: string;
  budgetitem_id?: string;
  resource_id?: string;
  expense_ref_id?: string;
  status?: string;
  approval_workflow_id?: string;
  attachment_ids?: string[];
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectBenefit {
  id: string;
  project_id: string;
  period_type: string;
  period_date: string;
  planned_cost: number;
  actual_cost: number;
  planned_progress: number;
  actual_progress: number;
  planned_value: number;
  earned_value: number;
  actual_cost_eva: number;
  cpi: number;
  spi: number;
  cv: number;
  sv: number;
  eac: number;
  etc: number;
  roi: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectApproval {
  id: string;
  project_id: string;
  status: string;
  current_step: number;
  total_steps: number;
  approvals: Record<string, unknown>;
  comments?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectProgress {
  planned: number;
  actual: number;
  trend: 'ahead' | 'behind' | 'normal';
  completed_phases: number;
  total_phases: number;
}

export interface ProjectBenefits {
  spi: number;
  milestones_achieved: number;
  total_milestones: number;
}

export interface ProjectDashboardResponse {
  project: Project;
  progress: ProjectProgress;
  budget: Record<string, unknown>;
  members: Record<string, unknown>[];
  equipment: Record<string, unknown>[];
  benefits: ProjectBenefits;
  risks: ProjectRisk[];
}

export interface GanttPhase {
  id: string;
  name: string;
  project_id: string;
  start_date?: string;
  end_date?: string;
  progress: number;
  status: string;
  predecessor_ids: string[];
}

export interface GanttMilestone {
  id: string;
  name: string;
  project_id: string;
  date: string;
  status: string;
}

export interface GanttResource {
  id: string;
  resource_type: string;
  name: string;
  assignments: Record<string, unknown>[];
}

export interface ProjectGanttResponse {
  phases: GanttPhase[];
  milestones: GanttMilestone[];
  resources: GanttResource[];
}

export interface BenefitAnalysis {
  summary: {
    total_planned_cost: number;
    total_actual_cost: number;
    total_planned_value: number;
    total_earned_value: number;
    period_count: number;
  };
  eva: {
    cpi: number;
    spi: number;
    cv: number;
    sv: number;
    eac: number;
    etc: number;
    roi: number;
  };
  trend: {
    cpi_status: string;
    spi_status: string;
    cost_status: string;
  };
  details: Array<{
    period_type: string;
    period_date: string;
    cpi: number;
    spi: number;
    cv: number;
    sv: number;
  }>;
}

export interface ApprovalRequest {
  action: 'approve' | 'reject' | 'cancel';
  comment?: string;
  approver_id: string;
}

export interface Contract {
  id: string;
  project_id?: string;
  contract_code: string;
  contract_name: string;
  contract_type: string;
  contract_category?: string;
  party_a_name?: string;
  party_a_id?: string;
  party_a_contact?: string;
  party_b_name?: string;
  party_b_id?: string;
  party_b_contact?: string;
  amount: number;
  currency?: string;
  tax_rate?: number;
  signing_date?: string;
  effective_date?: string;
  end_date?: string;
  status?: string;
  template_id?: string;
  workflow_instance_id?: string;
  description?: string;
  attachment_ids?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractMilestone {
  id: string;
  contract_id: string;
  project_milestone_id?: string;
  name: string;
  description?: string;
  target_date: string;
  payment_amount?: number;
  payment_percent?: number;
  status?: string;
  actual_date?: string;
  payment_status?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractPaymentSchedule {
  id: string;
  contract_id: string;
  payment_number: number;
  payment_name?: string;
  payment_percent?: number;
  payment_amount: number;
  due_date: string;
  actual_payment_date?: string;
  actual_payment_amount?: number;
  status?: string;
  invoice_number?: string;
  expense_ref_id?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  contract_type: string;
  description?: string;
  content: Record<string, unknown>;
  isactive: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  project_id: string;
  budget_code: string;
  budget_name: string;
  budget_type?: string;
  total_amount: number;
  allocated_amount: number;
  spent_amount: number;
  status?: string;
  version: number;
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetItem {
  id: string;
  budget_id: string;
  item_code?: string;
  item_name: string;
  category?: string;
  subcategory?: string;
  budget_amount: number;
  allocated_amount: number;
  spent_amount: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRisk {
  id: string;
  project_id: string;
  risk_code?: string;
  risk_name: string;
  risk_description?: string;
  description?: string;
  risk_category?: string;
  risk_subcategory?: string;
  likelihood: string;
  impact: string;
  level?: string;
  risk_score: number;
  status?: string;
  mitigation_strategy?: string;
  contingency_plan?: string;
  trigger_condition?: string;
  warning_threshold: number;
  owner?: string;
  response_due_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskEvent {
  id: string;
  risk_id: string;
  event_type: string;
  event_description?: string;
  occurred_at: string;
  reported_by?: string;
  created_at: string;
}

export interface QualityCheck {
  id: string;
  project_id: string;
  check_code?: string;
  check_name: string;
  check_type?: string;
  phase_id?: string;
  milestone_id?: string;
  check_criteria?: string;
  acceptance_standard?: string;
  status?: string;
  check_date?: string;
  checked_by?: string;
  result_details?: Record<string, any>;
  nonconformities?: Record<string, any>;
  corrective_actions?: Record<string, any>;
  follow_up_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Defect {
  id: string;
  project_id: string;
  check_id?: string;
  defect_code?: string;
  defect_name: string;
  defect_description?: string;
  severity: string;
  priority: string;
  status?: string;
  assignee?: string;
  due_date?: string;
  resolution?: string;
  resolved_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AcceptancePlan {
  id: string;
  project_id: string;
  plan_code?: string;
  plan_name: string;
  acceptance_type: string;
  milestone_id?: string;
  phase_id?: string;
  acceptance_criteria?: string;
  expected_date?: string;
  status?: string;
  participants?: Record<string, any>;
  documents_required?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AcceptanceItem {
  id: string;
  plan_id: string;
  item_code?: string;
  item_name: string;
  item_description?: string;
  required_standard?: string;
  actual_result?: string;
  is_passed?: boolean;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export interface AcceptanceRecord {
  id: string;
  project_id: string;
  plan_id: string;
  acceptance_date: string;
  status: string;
  conclusion?: string;
  score?: number;
  accepted_by?: string;
  attendees?: Record<string, any>;
  findings?: Record<string, any>;
  recommendations?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Settlement {
  id: string;
  project_id: string;
  settlement_code?: string;
  settlement_name: string;
  settlement_type: string;
  status?: string;
  budget_amount?: number;
  actual_amount?: number;
  variance_amount?: number;
  variance_percent?: number;
  settlement_period_start?: string;
  settlement_period_end?: string;
  description?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SettlementItem {
  id: string;
  settlement_id: string;
  item_code?: string;
  item_name: string;
  category?: string;
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percent?: number;
  description?: string;
  expense_ref_id?: string;
  contract_ref_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SettlementAdjustment {
  id: string;
  settlement_id: string;
  adjustment_type: string;
  adjustment_code?: string;
  description?: string;
  amount: number;
  reason?: string;
  supporting_documents?: Record<string, any>;
  created_by?: string;
  created_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  document_code?: string;
  document_name: string;
  document_type: string;
  file_path: string;
  filesize: number;
  file_hash?: string;
  version: number;
  status?: string;
  description?: string;
  tags?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  file_path: string;
  file_hash?: string;
  change_note?: string;
  created_by?: string;
  created_at: string;
}

export interface DocumentFolder {
  id: string;
  project_id: string;
  parent_id?: string;
  folder_name: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectReport {
  id: string;
  project_id: string;
  report_code?: string;
  report_name: string;
  report_type: string;
  report_period?: string;
  status?: string;
  generated_at?: string;
  data?: Record<string, any>;
  summary?: string;
  generated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  template_code: string;
  template_name: string;
  report_type: string;
  content: Record<string, any>;
  isactive: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  project_id: string;
  user_id?: string;
  notification_type: string;
  title: string;
  message: string;
  status?: string;
  priority?: string;
  metadata?: Record<string, any>;
  due_date?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSetting {
  id: string;
  project_id: string;
  user_id: string;
  notification_type: string;
  enabled: boolean;
  notify_before_days?: number;
  preferred_channel?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationType {
  code: string;
  name: string;
  description: string;
  default_enabled: boolean;
  default_priority: string;
}

export interface PmStatistics {
  total_projects: number;
  draft_projects: number;
  pending_projects: number;
  active_projects: number;
  completed_projects: number;
  cancelled_projects: number;

  total_contracts: number;
  pending_contracts: number;
  active_contracts: number;
  completed_contracts: number;

  total_budget: number;
  spent_budget: number;
  budget_usage_rate: number;

  on_time_projects: number;
  delayed_projects: number;
  average_progress: number;

  high_risk_projects: number;
  medium_risk_projects: number;
  low_risk_projects: number;
}
