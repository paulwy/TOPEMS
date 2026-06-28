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

export interface WorkflowStat {
  workflow_id: string;
  workflow_name: string;
  instance_count: number;
  completion_rate: number;
  avg_duration: number;
}

export interface MonthlyData {
  month: string;
  instances_started: number;
  instances_completed: number;
  approvals_processed: number;
}

export interface ConditionValue {
  [key: string]: unknown;
}

export interface Condition {
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
  next_nodes?: string[];
}

export interface WorkflowDefinition {
  version: string;
  nodes: ApprovalNode[];
  start_node: string;
  end_nodes: string[];
  timeout_action?: string;
}

export interface WorkflowData {
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
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  data?: WorkflowData;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  definition?: WorkflowDefinition;
  is_active?: boolean;
  created_by?: string;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  definition?: WorkflowDefinition;
  is_active?: boolean;
}

export interface WorkflowInstanceData {
  [key: string]: unknown;
}

export interface WorkflowInstance {
  id: string;
  workflow_id?: string;
  status: 'pending' | 'running' | 'completed' | 'rejected' | string;
  current_node?: string;
  initiator_id?: string;
  data?: WorkflowInstanceData;
  started_at?: string;
  completed_at?: string;
  created_at: string;
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

export interface ApprovalTaskData {
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
  is_active: boolean;
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
  is_active?: boolean;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkflowSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkflowHistoryData {
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
  page_size?: number;
  search?: string;
  status?: string;
  workflow_id?: string;
  assignee_id?: string;
  initiator_id?: string;
  user_id?: string;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
