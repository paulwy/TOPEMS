export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  definition: any;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowInstance {
  id: string;
  workflow_id?: string;
  status: string;
  current_node?: string;
  initiator_id?: string;
  data?: any;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface Approval {
  id: string;
  workflow_instance_id?: string;
  node_id?: string;
  task_name: string;
  assignee_id?: string;
  status: string;
  approval_type?: string;
  comment?: string;
  approved_by?: string;
  approved_at?: string;
  timeout_at?: string;
  created_at: string;
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

export interface InstanceDetailsResponse {
  instance: WorkflowInstance;
  approvals: Approval[];
  records: ApprovalRecord[];
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  definition: any;
  created_by?: string;
}

export interface StartInstanceRequest {
  workflow_id: string;
  initiator_id?: string;
  data?: any;
}

export interface ProcessApprovalRequest {
  action: string;
  comment?: string;
  actor_id: string;
  actor_name?: string;
  delegate_to?: string;
  delegate_to_name?: string;
}

export interface ApprovalNode {
  node_id: string;
  name: string;
  approvers: string[];
  approval_type: 'single' | 'counter' | 'or';
  conditions?: Condition[];
  timeout_hours?: number;
  auto_action?: string;
  notification_users?: string[];
  next_nodes?: string[];
}

export interface Condition {
  field: string;
  operator: string;
  value: any;
}

export interface WorkflowDefinition {
  version: string;
  nodes: ApprovalNode[];
  start_node: string;
  end_nodes: string[];
}
