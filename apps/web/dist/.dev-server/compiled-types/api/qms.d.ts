import type { ApiResponse } from "./client";
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
    title: string;
    description?: string;
    inspection_type: string;
    standard_id?: string;
    inspector: string;
    status: string;
    result?: string;
    findings?: string;
    inspected_at?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateQualityInspectionRequestBackend {
    title: string;
    description?: string;
    inspection_type: string;
    standard_id?: string;
    inspector: string;
}
export interface UpdateQualityInspectionRequestBackend {
    title?: string;
    description?: string;
    status?: string;
    result?: string;
    findings?: string;
    inspected_at?: string;
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
    check_no: string;
    check_type: string;
    inspector: string;
    check_date: string;
    location: string;
    result: string;
    conclusion: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface CreateQualityCheckRequest {
    check_no: string;
    check_type: string;
    inspector: string;
    check_date: string;
    location: string;
    result: string;
    conclusion: string;
    status: string;
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
export interface QmsStatistics {
    total_standards: number;
    active_standards: number;
    inactive_standards: number;
    total_inspections: number;
    pending_inspections: number;
    in_progress_inspections: number;
    completed_inspections: number;
    total_issues: number;
    open_issues: number;
    resolved_issues: number;
    critical_issues: number;
    total_actions: number;
    pending_actions: number;
    in_progress_actions: number;
    completed_actions: number;
}
export declare const qmsApi: {
    listStandards: () => Promise<ApiResponse<QualityStandard[]>>;
    getStandard: (id: string) => Promise<ApiResponse<QualityStandard>>;
    createStandard: (data: CreateQualityStandardRequest) => Promise<ApiResponse<QualityStandard>>;
    updateStandard: (id: string, data: CreateQualityStandardRequest) => Promise<ApiResponse<QualityStandard>>;
    deleteStandard: (id: string) => Promise<ApiResponse<boolean>>;
    listChecks: () => Promise<ApiResponse<QualityCheck[]>>;
    getCheck: (id: string) => Promise<ApiResponse<QualityCheck>>;
    createCheck: (data: CreateQualityCheckRequest) => Promise<ApiResponse<QualityCheck>>;
    updateCheck: (id: string, data: CreateQualityCheckRequest) => Promise<ApiResponse<QualityCheck>>;
    deleteCheck: (id: string) => Promise<ApiResponse<boolean>>;
    listIssues: () => Promise<ApiResponse<QualityIssue[]>>;
    getIssue: (id: string) => Promise<ApiResponse<QualityIssue>>;
    createIssue: (data: CreateQualityIssueRequest) => Promise<ApiResponse<QualityIssue>>;
    updateIssue: (id: string, data: CreateQualityIssueRequest) => Promise<ApiResponse<QualityIssue>>;
    deleteIssue: (id: string) => Promise<ApiResponse<boolean>>;
    listImprovements: () => Promise<ApiResponse<QualityImprovement[]>>;
    getImprovement: (id: string) => Promise<ApiResponse<QualityImprovement>>;
    createImprovement: (data: CreateQualityImprovementRequest) => Promise<ApiResponse<QualityImprovement>>;
    updateImprovement: (id: string, data: CreateQualityImprovementRequest) => Promise<ApiResponse<QualityImprovement>>;
    deleteImprovement: (id: string) => Promise<ApiResponse<boolean>>;
    getStatistics: () => Promise<ApiResponse<QmsStatistics>>;
    health: () => Promise<ApiResponse<string>>;
    listAuditPlans: () => Promise<ApiResponse<AuditPlan[]>>;
    listAuditTasks: (planId?: string) => Promise<ApiResponse<AuditTask[]>>;
    listAuditFindings: (taskId?: string) => Promise<ApiResponse<AuditFinding[]>>;
    createAuditPlan: (data: Omit<AuditPlan, "id" | "created_at" | "updated_at">) => Promise<ApiResponse<AuditPlan>>;
    completeAuditTask: (taskId: string) => Promise<ApiResponse<AuditTask>>;
    listRevisions: (standardId: string) => Promise<ApiResponse<StandardRevision[]>>;
};
