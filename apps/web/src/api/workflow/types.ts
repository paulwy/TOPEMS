export interface StatisticsResponse {
  total_workflows: number;
  active_workflows: number;
  total_instances: number;
  running_instances: number;
  completed_instances: number;
  rejected_instances: number;
  total_approvals: number;
  pending_approvals: number;
  approved_approvals: number;
  rejected_approvals: number;
  avg_approval_time: number;
  approval_rate: number;
  rejection_rate: number;
  workflow_stats: WorkflowStat[];
  monthly_data: MonthlyData[];
}

export interface PerformanceStats {
  total_requests: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  slow_requests_count: number;
  slow_requests_threshold_ms: number;
}

interface WorkflowStat {
  workflow_id: string;
  workflow_name: string;
  instance_count: number;
  completion_rate: number;
  avg_duration: number;
}

interface MonthlyData {
  month: string;
  instances_started: number;
  instances_completed: number;
  approvals_processed: number;
}

interface ConditionValue {
  [key: string]: unknown;
}

interface Condition {
  field: string;
  operator: string;
  value: ConditionValue;
}

export type ApprovalType = 'single' | 'counter' | 'or';

export interface ApprovalNode {
  node_id: string;
  name: string;
  approvers: string[];
  approval_type: ApprovalType;
  conditions?: Condition[];
  timeout_hours?: number;
  auto_action?: string;
  notification_users?: string[];
  nextnodes?: string[];
}

export interface WorkflowDefinition {
  version: string;
  nodes: ApprovalNode[];
  startnode: string;
  endnodes: string[];
  timeout_action?: string;
}

interface WorkflowData {
  type?: string;
  scope?: string;
  usageCount?: number;
  applicant?: string;
  name?: string;
  [key: string]: unknown;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  isactive: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  data?: WorkflowData;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  definition?: WorkflowDefinition;
  isactive?: boolean;
  created_by?: string;
  data?: WorkflowData;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  definition?: WorkflowDefinition;
  isactive?: boolean;
}

interface WorkflowInstanceData {
  [key: string]: unknown;
}

export interface WorkflowInstance {
  id: string;
  workflow_id?: string;
  workflow_name?: string;
  name?: string;
  status: 'pending' | 'running' | 'completed' | 'rejected' | 'suspended' | 'terminated' | string;
  currentnode?: string;
  initiator_id?: string;
  start_user_id?: string;
  start_user_name?: string;
  data?: WorkflowInstanceData;
  started_at?: string;
  completed_at?: string;
  end_time?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateWorkflowInstanceRequest {
  workflow_id: string;
  initiator_id?: string;
  data?: WorkflowInstanceData;
}

export interface Approval {
  id: string;
  workflow_instance_id?: string;
  node_id?: string;
  task_name: string;
  assignee_id?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  approval_type?: string;
  comment?: string;
  approved_by?: string;
  approved_at?: string;
  timeout_at?: string;
  created_at: string;
}

interface ApprovalTaskData {
  [key: string]: unknown;
}

export interface ApprovalTask {
  id: string;
  workflow_instance_id?: string;
  workflow_id?: string;
  workflow_name?: string;
  node_id?: string;
  node_name?: string;
  task_name: string;
  assignee_id?: string;
  assignee_name?: string;
  initiator_id?: string;
  initiator_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'completed' | string;
  approval_type?: string;
  comment?: string;
  approved_by?: string;
  approved_at?: string;
  timeout_at?: string;
  priority?: 'low' | 'medium' | 'high';
  data?: ApprovalTaskData;
  created_at: string;
  updated_at?: string;
}

interface TaskData {
  [key: string]: unknown;
}

export interface Task {
  id: string;
  name?: string;
  instance_id?: string;
  instance_name?: string;
  process_definition_id?: string;
  process_definition_name?: string;
  workflow_id?: string;
  workflow_name?: string;
  node_key?: string;
  node_name?: string;
  assignee?: string;
  assignee_name?: string;
  owner?: string;
  start_user_id?: string;
  start_user_name?: string;
  initiator?: string;
  initiator_name?: string;
  candidate_users?: string[];
  candidate_groups?: string[];
  status:
    | 'pending'
    | 'running'
    | 'completed'
    | 'rejected'
    | 'suspended'
    | 'claimed'
    | 'finished'
    | string;
  priority?: number;
  description?: string;
  due_time?: string;
  create_time?: string;
  end_time?: string;
  claim_time?: string;
  data?: TaskData;
  variables?: Record<string, unknown>;
  form_key?: string;
  task_definition_key?: string;
  created_at?: string;
  updated_at?: string;
}

interface TaskStats {
  todo: number;
  done: number;
  sent: number;
  cc: number;
  myPending?: number;
  myCompleted?: number;
  myInvolved?: number;
  myCreated?: number;
  candidate?: number;
}

export interface CreateApprovalRequest {
  workflow_instance_id: string;
  node_id?: string;
  task_name: string;
  assignee_id?: string;
  approval_type?: string;
  timeout_hours?: number;
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version: string;
  definition: WorkflowDefinition;
  change_description?: string;
  created_by?: string;
  created_at: string;
  isactive: boolean;
}

export interface CreateVersionRequest {
  version: string;
  definition?: WorkflowDefinition;
  change_description?: string;
  created_by?: string;
}

export interface RollbackRequest {
  to_version: string;
  reason?: string;
  rolled_back_by?: string;
}

export interface ProcessApprovalRequest {
  action: 'approve' | 'reject' | 'delegate';
  comment?: string;
  actor_id: string;
  actor_name?: string;
  delegate_to?: string;
  delegate_to_name?: string;
}

export interface ApprovalRecord {
  id: string;
  approval_id: string;
  action: string;
  actor_id: string;
  actor_name?: string;
  comment?: string;
  previous_status: string;
  new_status: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  notification_type: string;
  workflow_instance_id?: string;
  approval_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  type?: string;
  scope?: string;
  definition?: WorkflowDefinition;
  usage_count?: number;
  isactive?: boolean;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

interface WorkflowSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  created_at: string;
  updated_at?: string;
}

interface WorkflowHistoryData {
  [key: string]: unknown;
}

export interface WorkflowHistory {
  id: string;
  workflow_instance_id?: string;
  workflow_id?: string;
  workflow_name?: string;
  action: string;
  actor_id?: string;
  actor_name?: string;
  node_id?: string;
  node_name?: string;
  status_before?: string;
  status_after?: string;
  comment?: string;
  data?: WorkflowHistoryData;
  created_at: string;
}

export interface CreateNotificationRequest {
  user_id?: string;
  title: string;
  content: string;
  notification_type: string;
  workflow_instance_id?: string;
  approval_id?: string;
}

export interface ListParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
  workflow_id?: string;
  assignee_id?: string;
  initiator_id?: string;
  user_id?: string;
  isactive?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
}

// ==================== 表单相关类型 ====================

export interface FormField {
  id: string;
  name: string;
  label: string;
  type:
    | 'input'
    | 'textarea'
    | 'select'
    | 'radio'
    | 'checkbox'
    | 'date'
    | 'datetime'
    | 'number'
    | 'upload'
    | 'user'
    | 'dept'
    | 'table';
  placeholder?: string;
  required?: boolean;
  default_value?: unknown;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  props?: Record<string, unknown>;
  sort_order?: number;
  readonly?: boolean;
  hidden?: boolean;
}

interface FormFieldOption {
  label: string;
  value: string | number | boolean;
  disabled?: boolean;
}

interface FormFieldValidation {
  pattern?: string;
  min_length?: number;
  max_length?: number;
  min?: number;
  max?: number;
  custom_rule?: string;
  error_message?: string;
}

export interface FormDefinition {
  id: string;
  name: string;
  description?: string;
  category?: string;
  fields: FormField[];
  layout?: FormLayout;
  isactive: boolean;
  version?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface FormLayout {
  type: 'grid' | 'tabs' | 'steps';
  columns?: number;
  groups?: FormGroup[];
}

export interface FormGroup {
  id: string;
  title: string;
  fields: string[];
  sort_order?: number;
}

export interface CreateFormDefinitionRequest {
  name: string;
  description?: string;
  category?: string;
  fields: FormField[];
  layout?: FormLayout;
  isactive?: boolean;
}

export interface UpdateFormDefinitionRequest {
  name?: string;
  description?: string;
  category?: string;
  fields?: FormField[];
  layout?: FormLayout;
  isactive?: boolean;
}

export interface FormInstance {
  id: string;
  form_definition_id: string;
  form_definition_name?: string;
  workflow_instance_id?: string;
  data: Record<string, unknown>;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFormInstanceRequest {
  form_definition_id: string;
  workflow_instance_id?: string;
  data: Record<string, unknown>;
}

export interface UpdateFormInstanceRequest {
  data?: Record<string, unknown>;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
}

// ==================== 任务相关扩展类型 ====================

export interface TaskQueryParams extends ListParams {
  assignee_id?: string;
  candidate_user?: string;
  candidate_group?: string;
  task_type?: string;
  priority?: 'low' | 'medium' | 'high';
  due_date_from?: string;
  due_date_to?: string;
}

export interface TaskDelegateRequest {
  delegate_to: string;
  delegate_to_name?: string;
  comment?: string;
}

export interface TaskTransferRequest {
  transfer_to: string;
  transfer_to_name?: string;
  comment?: string;
}

export interface TaskAddSignRequest {
  assignees: string[];
  assignee_names?: string[];
  comment?: string;
  sign_type: 'before' | 'after';
}

export interface TaskBatchApproveRequest {
  task_ids: string[];
  comment?: string;
  action: 'approve' | 'reject';
}

export interface TaskBatchResult {
  success_count: number;
  failed_count: number;
  failed_tasks: {
    task_id: string;
    error: string;
  }[];
}

// ==================== 流程监控相关类型 ====================

export interface ProcessMonitorQueryParams extends ListParams {
  start_time_from?: string;
  start_time_to?: string;
  end_time_from?: string;
  end_time_to?: string;
  duration_min?: number;
  duration_max?: number;
  assignee?: string;
  initiator?: string;
}

export interface ProcessInstanceDetail extends WorkflowInstance {
  workflow_name?: string;
  initiator_name?: string;
  current_node_name?: string;
  duration?: number;
  tasks?: ApprovalTask[];
  history?: WorkflowHistory[];
  form_data?: Record<string, unknown>;
}

interface ProcessNodeStatistics {
  node_id: string;
  node_name: string;
  total_count: number;
  avg_duration: number;
  min_duration: number;
  max_duration: number;
  pass_rate: number;
  reject_rate: number;
}

export interface ProcessAnalysisData {
  workflow_id: string;
  workflow_name: string;
  total_instances: number;
  avg_duration: number;
  node_statistics: ProcessNodeStatistics[];
  bottleneck_nodes: string[];
}

export interface ProcessLogQueryParams extends ListParams {
  workflow_instance_id?: string;
  workflow_id?: string;
  node_id?: string;
  action?: string;
  actor_id?: string;
  start_time_from?: string;
  start_time_to?: string;
}

export interface ProcessLog {
  id: string;
  workflow_instance_id: string;
  workflow_id?: string;
  workflow_name?: string;
  node_id?: string;
  node_name?: string;
  action: string;
  action_type:
    | 'start'
    | 'end'
    | 'approve'
    | 'reject'
    | 'delegate'
    | 'transfer'
    | 'claim'
    | 'unclaim'
    | 'timeout'
    | 'error';
  actor_id?: string;
  actor_name?: string;
  comment?: string;
  data?: Record<string, unknown>;
  duration?: number;
  created_at: string;
}

// ==================== 统计分析扩展类型 ====================

export interface WorkflowTrendData {
  date: string;
  instance_count: number;
  completed_count: number;
  approval_count: number;
}

export interface UserWorkflowStats {
  user_id: string;
  user_name: string;
  department?: string;
  initiated_count: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  avg_approval_time: number;
  total_approval_count: number;
}

export interface DepartmentWorkflowStats {
  department_id: string;
  department_name: string;
  total_instances: number;
  completed_instances: number;
  avg_duration: number;
  approval_rate: number;
}

export interface WorkflowEfficiencyAnalysis {
  total_workflows: number;
  total_instances: number;
  avg_completion_rate: number;
  avg_duration: number;
  most_used_workflows: WorkflowStat[];
  slowest_workflows: WorkflowStat[];
  peak_hours: { hour: number; count: number }[];
  day_of_week_distribution: { day: number; count: number }[];
}

export interface StatisticsQueryParams {
  time_range?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  start_date?: string;
  end_date?: string;
  workflow_id?: string;
  department_id?: string;
  user_id?: string;
  group_by?: 'day' | 'week' | 'month' | 'workflow' | 'user' | 'department';
}

// ==================== 流程定义扩展类型 ====================

export interface WorkflowCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  sort_order?: number;
  isactive: boolean;
  created_at: string;
}

interface WorkflowDeployRequest {
  definition?: WorkflowDefinition;
  version?: string;
  change_description?: string;
}

interface WorkflowDeploymentResult {
  workflow_id: string;
  version: string;
  deployed_at: string;
  deployed_by: string;
}

interface WorkflowExportResult {
  workflow_id: string;
  name: string;
  data: string;
  format: 'json' | 'xml' | 'bpmn';
}

interface WorkflowImportResult {
  workflow_id: string;
  name: string;
  version: string;
}

// ==================== 流程实例扩展类型 ====================

interface WorkflowInstanceQueryParams extends ListParams {
  workflow_id?: string;
  status?: string;
  initiator_id?: string;
  start_time_from?: string;
  start_time_to?: string;
  end_time_from?: string;
  end_time_to?: string;
  include_subprocess?: boolean;
}

export interface WorkflowInstanceDetail {
  instance: WorkflowInstance;
  workflow?: Workflow;
  tasks?: ApprovalTask[];
  history?: WorkflowHistory[];
  form_data?: Record<string, unknown>;
  current_node_info?: {
    node_id: string;
    node_name: string;
    assignees?: { id: string; name: string }[];
    status: string;
    arrived_at?: string;
  };
}

interface WorkflowInstanceCancelRequest {
  reason?: string;
  operator_id?: string;
  operator_name?: string;
}

interface WorkflowInstanceUrgeRequest {
  task_id?: string;
  message?: string;
  urge_type?: 'normal' | 'urgent' | 'very_urgent';
}

interface WorkflowInstanceRecallRequest {
  reason?: string;
  operator_id?: string;
  operator_name?: string;
}

// ==================== 委托/代理相关类型 ====================

export interface WorkflowDelegate {
  id: string;
  delegator_id: string;
  delegator_name?: string;
  attorney_id: string;
  attorney_name?: string;
  start_time: string;
  end_time?: string;
  workflow_ids?: string[];
  reason?: string;
  isactive: boolean;
  created_at: string;
}

export interface CreateWorkflowDelegateRequest {
  attorney_id: string;
  attorney_name?: string;
  start_time: string;
  end_time?: string;
  workflow_ids?: string[];
  reason?: string;
}

export interface UpdateWorkflowDelegateRequest {
  start_time?: string;
  end_time?: string;
  workflow_ids?: string[];
  reason?: string;
  isactive?: boolean;
}

// ==================== 流程规则相关类型 ====================

export interface WorkflowRule {
  id: string;
  name: string;
  rule_type: 'assignment' | 'condition' | 'notification' | 'escalation';
  workflow_id?: string;
  node_id?: string;
  condition?: string;
  action?: Record<string, unknown>;
  isactive: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

// ==================== 流程变量相关类型 ====================

export interface WorkflowVariable {
  id: string;
  workflow_instance_id: string;
  key: string;
  value: unknown;
  value_type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
  scope: 'global' | 'local';
  task_id?: string;
  node_id?: string;
  created_at: string;
  updated_at: string;
}
