export interface TeamMember {
  id: string;
  name?: string;
  role?: string;
  user_id?: string;
}

export interface ProjectConfig {
  [key: string]: unknown;
}

interface BenefitTarget {
  [key: string]: unknown;
}

export interface Project {
  id: string;
  name: string;
  project_name: string;
  code: string;
  description?: string;
  project_type: string;
  status: string;
  leader: string;
  team_members?: TeamMember[];
  start_date: string;
  end_date?: string;
  budget?: number;
  progress: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  project_config?: ProjectConfig;
  benefittarget?: BenefitTarget;
  risklevel?: string;
  priority?: number;
  tags?: string[];
  parentId?: string;
  workspace_id?: string;
  repo_url?: string;
  tech_stack?: string;
}

export interface CreateProjectRequest {
  name: string;
  code: string;
  description?: string;
  project_type: string;
  leader: string;
  team_members?: TeamMember[];
  start_date: string;
  end_date?: string;
  budget?: number;
  project_config?: ProjectConfig;
  benefittarget?: BenefitTarget;
  risklevel?: string;
  priority?: number;
  tags?: string[];
  parentId?: string;
  workspace_id?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: string;
  leader?: string;
  team_members?: TeamMember[];
  end_date?: string;
  budget?: number;
  progress?: number;
  project_config?: ProjectConfig;
  benefittarget?: BenefitTarget;
  risklevel?: string;
  priority?: number;
  tags?: string[];
  parentId?: string;
  workspace_id?: string;
  repo_url?: string;
  tech_stack?: string;
}

export interface ExperimentResult {
  [key: string]: unknown;
}

export interface Experiment {
  id: string;
  name: string;
  code: string;
  project_id: string;
  formula_id?: string;
  experiment_type: string;
  phase: string;
  status: string;
  objective: string;
  method: string;
  results: ExperimentResult;
  conclusions?: string;
  experimenter: string;
  batch_number?: string;
  scale?: number;
  scale_unit?: string;
  started_at: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExperimentRequest {
  name: string;
  code: string;
  project_id: string;
  formula_id?: string;
  experiment_type: string;
  phase: string;
  objective: string;
  method: string;
  experimenter: string;
  batch_number?: string;
  scale?: number;
  scale_unit?: string;
}

export interface UpdateExperimentRequest {
  name?: string;
  status?: string;
  results?: ExperimentResult;
  conclusions?: string;
  completed_at?: string;
  batch_number?: string;
  scale?: number;
  scale_unit?: string;
}

export interface ExperimentRecord {
  id: string;
  experiment_id: string;
  record_type: string;
  content: string;
  attachments: string[];
  recorded_by: string;
  recorded_at: string;
}

export interface CreateExperimentRecordRequest {
  record_type: string;
  content: string;
  attachments?: string[];
  recorded_by: string;
}

export interface BatchTraceItem {
  id: string;
  batch_number: string;
  experiment_id: string;
  experiment_name: string;
  phase: string;
  formula_id: string;
  formula_name: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

export interface Formula {
  id: string;
  project_id: string;
  name: string;
  code: string;
  version: string;
  category?: string;
  description?: string;
  ingredients?: FormulaIngredient[];
  process_steps?: string;
  status: string;
  approval_status?: string;
  approved_by?: string;
  approved_at?: string;
  effective_date?: string;
  expiration_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FormulaIngredient {
  id?: string;
  name: string;
  quantity: number;
  unit?: string;
  purity?: string;
  supplier?: string;
  notes?: string;
}

export interface CreateFormulaRequest {
  project_id: string;
  name: string;
  code: string;
  version: string;
  category?: string;
  description?: string;
  ingredients?: FormulaIngredient[];
  process_steps?: string;
  status: string;
  effective_date?: string;
  expiration_date?: string;
}

export interface UpdateFormulaRequest {
  name?: string;
  code?: string;
  version?: string;
  category?: string;
  description?: string;
  ingredients?: FormulaIngredient[];
  process_steps?: string;
  status?: string;
  approval_status?: string;
  approved_by?: string;
  effective_date?: string;
  expiration_date?: string;
}

export interface FormulaVersion {
  id: string;
  formula_id: string;
  version: string;
  changes?: string;
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFormulaVersionRequest {
  version: string;
  changes: string;
}

export interface BatchCreateProjectsRequest {
  projects: CreateProjectRequest[];
}

export interface BatchDeleteProjectsRequest {
  ids: string[];
}

export interface BatchOperationResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

interface DashboardProgress {
  current: number;
  total: number;
  percentage: number;
}

interface DashboardBudget {
  total: number;
  spent: number;
  remaining: number;
  percentage: number;
}

interface DashboardMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface DashboardEquipment {
  id: string;
  name: string;
  status: string;
  usage_rate?: number;
}

interface DashboardBenefit {
  [key: string]: unknown;
}

interface DashboardRisk {
  id: string;
  name: string;
  level: string;
  status: string;
}

export interface ProjectDashboardResponse {
  project: Project;
  progress: DashboardProgress;
  budget: DashboardBudget;
  members: DashboardMember[];
  equipment: DashboardEquipment[];
  benefits: DashboardBenefit;
  risks: DashboardRisk[];
}

export interface GanttPhase {
  id: string;
  name: string;
  project_id: string;
  start_date?: string;
  end_date?: string;
  progress: number;
  status: string;
  predecessor_ids?: string[];
}

export interface GanttMilestone {
  id: string;
  name: string;
  project_id: string;
  date: string;
  status: string;
}

interface GanttResourceAssignment {
  task_id: string;
  task_name: string;
  start_date?: string;
  end_date?: string;
  allocation?: number;
}

export interface GanttResource {
  id: string;
  resource_type: string;
  name: string;
  assignments: GanttResourceAssignment[];
}

export interface ProjectGanttResponse {
  phases: GanttPhase[];
  milestones: GanttMilestone[];
  resources: GanttResource[];
}

export interface Bug {
  id: string;
  bug_no: string;
  bug_title: string;
  severity: string;
  priority: string;
  status: string;
  assignee: string;
  create_time: string;
  description: string;
}

export interface CreateBugRequest {
  bug_title: string;
  severity: string;
  priority: string;
  description: string;
}

export interface UpdateBugRequest {
  bug_title?: string;
  severity?: string;
  priority?: string;
  status?: string;
  assignee?: string;
  description?: string;
}

export interface TestCase {
  id: string;
  case_no: string;
  case_name: string;
  case_type: string;
  priority: string;
  status: string;
  related_requirement: string;
}

export interface CreateTestCaseRequest {
  case_name: string;
  case_type: string;
  priority: string;
  related_requirement?: string;
}

export interface UpdateTestCaseRequest {
  case_name?: string;
  case_type?: string;
  priority?: string;
  status?: string;
  related_requirement?: string;
}

export interface Build {
  id: string;
  build_no: string;
  project_id: string;
  project_name: string;
  branch: string;
  commit_hash: string;
  build_type: string;
  trigger_type: string;
  status: string;
  duration: number;
  build_time: string;
  created_at: string;
  logs?: string;
}

export interface CreateBuildRequest {
  project_id: string;
  branch: string;
  commit_hash: string;
  build_type?: string;
  build_task?: string;
  trigger_type?: string;
}

export interface Deploy {
  id: string;
  deploy_no: string;
  project_id: string;
  project_name: string;
  build_id: string;
  env: string;
  deploy_type: string;
  environment: string;
  app_name: string;
  version: string;
  status: string;
  deploy_time: string;
  deployer: string;
  operator: string;
  target_url?: string;
  created_at: string;
  logs?: string;
}

export interface CreateDeployRequest {
  project_id: string;
  build_id: string;
  env: string;
  deploy_type?: string;
  environment: string;
  app_name: string;
  version: string;
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

export interface RsStatistics {
  total_projects: number;
  pending_projects: number;
  in_progress_projects: number;
  completed_projects: number;
  cancelled_projects: number;

  total_experiments: number;
  pending_experiments: number;
  in_progress_experiments: number;
  completed_experiments: number;

  total_formulas: number;
  draft_formulas: number;
  approved_formulas: number;

  total_tasks: number;
}

export interface Material {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  specification?: string;
  supplier?: string;
  stock_quantity?: number;
  min_stock?: number;
  max_stock?: number;
  status: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialRequest {
  name: string;
  code: string;
  category: string;
  unit: string;
  specification?: string;
  supplier?: string;
  min_stock?: number;
  max_stock?: number;
  description?: string;
}

export interface UpdateMaterialRequest {
  name?: string;
  category?: string;
  unit?: string;
  specification?: string;
  supplier?: string;
  min_stock?: number;
  max_stock?: number;
  status?: string;
  description?: string;
}

export interface MaterialQueryParams {
  page?: number;
  pagesize?: number;
  search?: string;
  category?: string;
  status?: string;
}

export type { Experiment as LegacyExperimentRecord };

interface CreateExperimentRequestLegacy {
  project_id: string;
  title: string;
  description: string;
  experiment_type: string;
  result: string;
  status: string;
  experimenter: string;
}

interface UpdateExperimentRequestLegacy {
  title?: string;
  description?: string;
  experiment_type?: string;
  result?: string;
  status?: string;
  experimenter?: string;
  conclusion?: string;
}
