import type { ApiResponse } from "./client";
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
export interface Condition {
    field: string;
    operator: string;
    value: any;
}
export type ApprovalType = "single" | "counter" | "or";
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
export interface Workflow {
    id: string;
    name: string;
    description?: string;
    definition: WorkflowDefinition | any;
    is_active: boolean;
    created_by?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateWorkflowRequest {
    name: string;
    description?: string;
    definition?: WorkflowDefinition | any;
    is_active?: boolean;
    created_by?: string;
}
export interface UpdateWorkflowRequest {
    name?: string;
    description?: string;
    definition?: WorkflowDefinition | any;
    is_active?: boolean;
}
export interface WorkflowInstance {
    id: string;
    workflow_id?: string;
    status: "pending" | "running" | "completed" | "rejected" | string;
    current_node?: string;
    initiator_id?: string;
    data?: any;
    started_at?: string;
    completed_at?: string;
    created_at: string;
}
export interface CreateWorkflowInstanceRequest {
    workflow_id: string;
    initiator_id?: string;
    data?: any;
}
export interface Approval {
    id: string;
    workflow_instance_id?: string;
    node_id?: string;
    task_name: string;
    assignee_id?: string;
    status: "pending" | "approved" | "rejected" | string;
    approval_type?: string;
    comment?: string;
    approved_by?: string;
    approved_at?: string;
    timeout_at?: string;
    created_at: string;
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
    definition: any;
    change_description?: string;
    created_by?: string;
    created_at: string;
    is_active: boolean;
}
export interface CreateVersionRequest {
    version: string;
    definition?: any;
    change_description?: string;
    created_by?: string;
}
export interface RollbackRequest {
    to_version: string;
    reason?: string;
    rolled_back_by?: string;
}
export interface ProcessApprovalRequest {
    action: "approve" | "reject";
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
export declare const workflowApi: {
    listWorkflows: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Workflow>>>;
    getWorkflow: (id: string) => Promise<ApiResponse<Workflow>>;
    createWorkflow: (data: CreateWorkflowRequest) => Promise<ApiResponse<Workflow>>;
    updateWorkflow: (id: string, data: UpdateWorkflowRequest) => Promise<ApiResponse<Workflow>>;
    deleteWorkflow: (id: string) => Promise<ApiResponse<string>>;
    getVersions: (workflowId: string, params?: ListParams) => Promise<ApiResponse<any>>;
    createVersion: (workflowId: string, data: CreateVersionRequest) => Promise<ApiResponse<any>>;
    getVersion: (workflowId: string, versionId: string) => Promise<ApiResponse<any>>;
    activateVersion: (workflowId: string, versionId: string) => Promise<ApiResponse<any>>;
    rollback: (workflowId: string, data: RollbackRequest) => Promise<ApiResponse<any>>;
    compareVersions: (workflowId: string, version1: string, version2: string) => Promise<ApiResponse<any>>;
    deleteVersion: (workflowId: string, versionId: string) => Promise<ApiResponse<any>>;
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Workflow>>>;
    get: (id: string) => Promise<ApiResponse<Workflow>>;
    create: (data: Partial<Workflow>) => Promise<ApiResponse<Workflow>>;
    update: (id: string, data: Partial<Workflow>) => Promise<ApiResponse<Workflow>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
};
export declare const instanceApi: {
    list: (params?: ListParams) => Promise<ApiResponse<any>>;
    start: (data: CreateWorkflowInstanceRequest) => Promise<ApiResponse<any>>;
    get: (id: string) => Promise<ApiResponse<any>>;
    getDetails: (id: string) => Promise<ApiResponse<any>>;
    listInstances: (params?: ListParams) => Promise<ApiResponse<any>>;
};
export declare const approvalApi: {
    list: (params?: ListParams) => Promise<ApiResponse<any>>;
    create: (data: CreateApprovalRequest) => Promise<ApiResponse<any>>;
    get: (id: string) => Promise<ApiResponse<any>>;
    process: (id: string, data: ProcessApprovalRequest) => Promise<ApiResponse<any>>;
    listApprovals: (params?: ListParams) => Promise<ApiResponse<any>>;
    getRecords: (params?: ListParams) => Promise<ApiResponse<any>>;
    getRecordsByApproval: (approvalId: string) => Promise<ApiResponse<any>>;
};
export declare const notificationApi: {
    list: (userId: string, params?: ListParams) => Promise<ApiResponse<any>>;
    getCount: (userId: string) => Promise<ApiResponse<any>>;
    markAsRead: (userId: string) => Promise<ApiResponse<any>>;
    create: (data: CreateNotificationRequest) => Promise<ApiResponse<any>>;
    listNotifications: (userId: string, params?: ListParams) => Promise<ApiResponse<any>>;
};
export declare const flowApi: {
    workflows: {
        listWorkflows: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Workflow>>>;
        getWorkflow: (id: string) => Promise<ApiResponse<Workflow>>;
        createWorkflow: (data: CreateWorkflowRequest) => Promise<ApiResponse<Workflow>>;
        updateWorkflow: (id: string, data: UpdateWorkflowRequest) => Promise<ApiResponse<Workflow>>;
        deleteWorkflow: (id: string) => Promise<ApiResponse<string>>;
        getVersions: (workflowId: string, params?: ListParams) => Promise<ApiResponse<any>>;
        createVersion: (workflowId: string, data: CreateVersionRequest) => Promise<ApiResponse<any>>;
        getVersion: (workflowId: string, versionId: string) => Promise<ApiResponse<any>>;
        activateVersion: (workflowId: string, versionId: string) => Promise<ApiResponse<any>>;
        rollback: (workflowId: string, data: RollbackRequest) => Promise<ApiResponse<any>>;
        compareVersions: (workflowId: string, version1: string, version2: string) => Promise<ApiResponse<any>>;
        deleteVersion: (workflowId: string, versionId: string) => Promise<ApiResponse<any>>;
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Workflow>>>;
        get: (id: string) => Promise<ApiResponse<Workflow>>;
        create: (data: Partial<Workflow>) => Promise<ApiResponse<Workflow>>;
        update: (id: string, data: Partial<Workflow>) => Promise<ApiResponse<Workflow>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    instances: {
        list: (params?: ListParams) => Promise<ApiResponse<any>>;
        start: (data: CreateWorkflowInstanceRequest) => Promise<ApiResponse<any>>;
        get: (id: string) => Promise<ApiResponse<any>>;
        getDetails: (id: string) => Promise<ApiResponse<any>>;
        listInstances: (params?: ListParams) => Promise<ApiResponse<any>>;
    };
    approvals: {
        list: (params?: ListParams) => Promise<ApiResponse<any>>;
        create: (data: CreateApprovalRequest) => Promise<ApiResponse<any>>;
        get: (id: string) => Promise<ApiResponse<any>>;
        process: (id: string, data: ProcessApprovalRequest) => Promise<ApiResponse<any>>;
        listApprovals: (params?: ListParams) => Promise<ApiResponse<any>>;
        getRecords: (params?: ListParams) => Promise<ApiResponse<any>>;
        getRecordsByApproval: (approvalId: string) => Promise<ApiResponse<any>>;
    };
    notifications: {
        list: (userId: string, params?: ListParams) => Promise<ApiResponse<any>>;
        getCount: (userId: string) => Promise<ApiResponse<any>>;
        markAsRead: (userId: string) => Promise<ApiResponse<any>>;
        create: (data: CreateNotificationRequest) => Promise<ApiResponse<any>>;
        listNotifications: (userId: string, params?: ListParams) => Promise<ApiResponse<any>>;
    };
    listWorkflows: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Workflow>>>;
    getWorkflow: (id: string) => Promise<ApiResponse<Workflow>>;
    createWorkflow: (data: CreateWorkflowRequest) => Promise<ApiResponse<Workflow>>;
    updateWorkflow: (id: string, data: UpdateWorkflowRequest) => Promise<ApiResponse<Workflow>>;
    deleteWorkflow: (id: string) => Promise<ApiResponse<string>>;
    listInstances: (params?: ListParams) => Promise<ApiResponse<any>>;
    startInstance: (data: CreateWorkflowInstanceRequest) => Promise<ApiResponse<any>>;
    getInstance: (id: string) => Promise<ApiResponse<any>>;
    getInstanceDetails: (id: string) => Promise<ApiResponse<any>>;
    listApprovals: (params?: ListParams) => Promise<ApiResponse<any>>;
    createApproval: (data: CreateApprovalRequest) => Promise<ApiResponse<any>>;
    getApproval: (id: string) => Promise<ApiResponse<any>>;
    processApproval: (id: string, data: ProcessApprovalRequest) => Promise<ApiResponse<any>>;
    listNotifications: (userId: string, params?: ListParams) => Promise<ApiResponse<any>>;
    getNotificationCount: (userId: string) => Promise<ApiResponse<any>>;
    markNotificationsAsRead: (userId: string) => Promise<ApiResponse<any>>;
    createNotification: (data: CreateNotificationRequest) => Promise<ApiResponse<any>>;
    getRecords: (params?: ListParams) => Promise<ApiResponse<any>>;
    getRecordsByApproval: (approvalId: string) => Promise<ApiResponse<any>>;
    getVersions: (workflowId: string, params?: ListParams) => Promise<ApiResponse<any>>;
    createVersion: (workflowId: string, data: CreateVersionRequest) => Promise<ApiResponse<any>>;
    getVersion: (workflowId: string, versionId: string) => Promise<ApiResponse<any>>;
    activateVersion: (workflowId: string, versionId: string) => Promise<ApiResponse<any>>;
    rollbackVersion: (workflowId: string, data: RollbackRequest) => Promise<ApiResponse<any>>;
    compareVersions: (workflowId: string, version1: string, version2: string) => Promise<ApiResponse<any>>;
    deleteVersion: (workflowId: string, versionId: string) => Promise<ApiResponse<any>>;
    getStatistics: () => Promise<ApiResponse<StatisticsResponse>>;
    getPerformance: () => Promise<ApiResponse<PerformanceStats>>;
    resetPerformance: () => Promise<ApiResponse<string>>;
    health: () => Promise<ApiResponse<string>>;
};
export default flowApi;
