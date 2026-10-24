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
  parentId?: string;
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
  parentId?: string;
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
  parentId?: string;
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

interface ProjectProgress {
  planned: number;
  actual: number;
  trend: 'ahead' | 'behind' | 'normal';
  completed_phases: number;
  total_phases: number;
}

interface ProjectBenefits {
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

interface GanttResource {
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

export interface ApprovalRequest {
  action: 'approve' | 'reject' | 'cancel';
  comment?: string;
  approver_id: string;
}

export interface Contract {
  id: string;
  project_id: string;
  contractNo: string;
  contract_name: string;
  contract_type: string;
  party_a: string;
  party_b: string;
  amount?: number;
  currency: string;
  sign_date?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  tenant_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
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

interface ProjectRisk {
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
  result_details?: Record<string, unknown>;
  nonconformities?: Record<string, unknown>;
  corrective_actions?: Record<string, unknown>;
  follow_up_date?: string;
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
  parentId?: string;
  folder_name: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  template_code: string;
  template_name: string;
  report_type: string;
  content: Record<string, unknown>;
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
  metadata?: Record<string, unknown>;
  due_date?: string;
  delivered_at?: string;
  read_at?: string;
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

  total_risks: number;
  open_risks: number;
  closed_risks: number;

  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;

  on_time_projects?: number;
  delayed_projects?: number;
  average_progress?: number;
  high_risk_projects?: number;
  medium_risk_projects?: number;
  low_risk_projects?: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface TypeCount {
  type: string;
  count: number;
}

interface LeaderCount {
  leader: string;
  count: number;
}

interface CategoryCount {
  category: string;
  total: number;
  spent: number;
}

interface LevelCount {
  level: string;
  count: number;
}

interface PriorityCount {
  priority: string;
  count: number;
}

export interface ProjectStatistics {
  total_projects: number;
  by_status: StatusCount[];
  by_type: TypeCount[];
  by_leader: LeaderCount[];
  average_progress: number;
  on_time_rate: number;
  high_risk_count: number;
}

export interface ContractStatistics {
  total_contracts: number;
  by_status: StatusCount[];
  by_type: TypeCount[];
  total_amount: number;
  avg_amount: number;
}

export interface BudgetStatistics {
  total_budget: number;
  allocated_budget: number;
  spent_budget: number;
  remaining_budget: number;
  budget_usage_rate: number;
  by_category: CategoryCount[];
}

export interface RiskStatistics {
  total_risks: number;
  open_risks: number;
  closed_risks: number;
  by_level: LevelCount[];
  by_category: CategoryCount[];
}

export interface TaskStatistics {
  total_tasks: number;
  by_status: StatusCount[];
  by_priority: PriorityCount[];
  completion_rate: number;
  overdue_count: number;
}

export interface DashboardOverview {
  projects: ProjectStatistics;
  contracts: ContractStatistics;
  budget: BudgetStatistics;
  risks: RiskStatistics;
  tasks: TaskStatistics;
}

export interface StatisticsQuery {
  start_date?: string;
  end_date?: string;
  status?: string;
  limit?: number;
}
