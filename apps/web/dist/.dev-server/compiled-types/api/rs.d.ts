import type { ApiResponse } from "./client";
export interface Project {
    id: string;
    name: string;
    code: string;
    description?: string;
    project_type: string;
    status: string;
    leader: string;
    team_members?: any;
    start_date: string;
    end_date?: string;
    budget?: number;
    progress: number;
    created_by: string;
    created_at: string;
    updated_at: string;
    project_config?: any;
    benefit_target?: any;
    risk_level?: string;
    priority?: number;
    tags?: string[];
    parent_id?: string;
    workspace_id?: string;
}
export interface CreateProjectRequest {
    name: string;
    code: string;
    description?: string;
    project_type: string;
    leader: string;
    team_members?: any;
    start_date: string;
    end_date?: string;
    budget?: number;
    project_config?: any;
    benefit_target?: any;
    risk_level?: string;
    priority?: number;
    tags?: string[];
    parent_id?: string;
    workspace_id?: string;
}
export interface UpdateProjectRequest {
    name?: string;
    description?: string;
    status?: string;
    leader?: string;
    team_members?: any;
    end_date?: string;
    budget?: number;
    progress?: number;
    project_config?: any;
    benefit_target?: any;
    risk_level?: string;
    priority?: number;
    tags?: string[];
    parent_id?: string;
    workspace_id?: string;
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
    results: any;
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
    results?: any;
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
export interface ProjectDashboardResponse {
    project: Project;
    progress: any;
    budget: any;
    members: any[];
    equipment: any[];
    benefits: any;
    risks: any[];
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
export interface GanttResource {
    id: string;
    resource_type: string;
    name: string;
    assignments: any[];
}
export interface ProjectGanttResponse {
    phases: GanttPhase[];
    milestones: GanttMilestone[];
    resources: GanttResource[];
}
export declare const rsApi: {
    listProjects: (params?: {
        page?: number;
        page_size?: number;
        search?: string;
        status?: string;
    }) => Promise<ApiResponse<{
        projects: Project[];
        total: number;
        page: number;
        page_size: number;
    }>>;
    getProject: (id: string) => Promise<ApiResponse<Project>>;
    createProject: (data: CreateProjectRequest) => Promise<ApiResponse<Project>>;
    updateProject: (id: string, data: UpdateProjectRequest) => Promise<ApiResponse<Project>>;
    deleteProject: (id: string) => Promise<ApiResponse<string>>;
    batchCreateProjects: (data: BatchCreateProjectsRequest) => Promise<ApiResponse<BatchOperationResult>>;
    batchDeleteProjects: (data: BatchDeleteProjectsRequest) => Promise<ApiResponse<BatchOperationResult>>;
    exportProjects: () => Promise<Blob>;
    importProjects: (file: File) => Promise<ApiResponse<BatchOperationResult>>;
    getProjectDashboard: (id: string) => Promise<ApiResponse<ProjectDashboardResponse>>;
    getProjectGantt: (id: string) => Promise<ApiResponse<ProjectGanttResponse>>;
    listExperiments: (params?: {
        page?: number;
        page_size?: number;
        search?: string;
        status?: string;
        project_id?: string;
        experiment_type?: string;
    }) => Promise<ApiResponse<{
        experiments: Experiment[];
        total: number;
        page: number;
        page_size: number;
    }>>;
    getExperiment: (id: string) => Promise<ApiResponse<Experiment>>;
    createExperiment: (data: CreateExperimentRequest) => Promise<ApiResponse<Experiment>>;
    updateExperiment: (id: string, data: UpdateExperimentRequest) => Promise<ApiResponse<Experiment>>;
    deleteExperiment: (id: string) => Promise<ApiResponse<string>>;
    listExperimentsByProject: (projectId: string) => Promise<ApiResponse<Experiment[]>>;
    listLabExperiments: (params?: {
        page?: number;
        page_size?: number;
        search?: string;
        status?: string;
    }) => Promise<ApiResponse<{
        experiments: Experiment[];
        total: number;
        page: number;
        page_size: number;
    }>>;
    listPilotExperiments: (params?: {
        page?: number;
        page_size?: number;
        search?: string;
        status?: string;
    }) => Promise<ApiResponse<{
        experiments: Experiment[];
        total: number;
        page: number;
        page_size: number;
    }>>;
    listScaleupExperiments: (params?: {
        page?: number;
        page_size?: number;
        search?: string;
        status?: string;
    }) => Promise<ApiResponse<{
        experiments: Experiment[];
        total: number;
        page: number;
        page_size: number;
    }>>;
    advancePhase: (id: string, data?: {
        new_status?: string;
    }) => Promise<ApiResponse<Experiment>>;
    traceBatch: (batchNumber: string) => Promise<ApiResponse<BatchTraceItem[]>>;
    getExperimentRecords: (experimentId: string) => Promise<ApiResponse<ExperimentRecord[]>>;
    createExperimentRecord: (experimentId: string, data: CreateExperimentRecordRequest) => Promise<ApiResponse<{
        id: string;
        recorded_at: string;
    }>>;
    getStatistics: () => Promise<ApiResponse<RsStatistics>>;
    health: () => Promise<ApiResponse<string>>;
};
export declare const formulaApi: {
    listFormulas: (params?: {
        project_id?: string;
        status?: string;
    }) => Promise<ApiResponse<Formula[]>>;
    getFormula: (id: string) => Promise<ApiResponse<Formula>>;
    createFormula: (data: CreateFormulaRequest) => Promise<ApiResponse<Formula>>;
    updateFormula: (id: string, data: UpdateFormulaRequest) => Promise<ApiResponse<Formula>>;
    deleteFormula: (id: string) => Promise<ApiResponse<boolean>>;
    listVersions: (formulaId: string) => Promise<ApiResponse<FormulaVersion[]>>;
    listFormulaVersions: (formulaId: string) => Promise<ApiResponse<FormulaVersion[]>>;
    createVersion: (formulaId: string, data: CreateFormulaVersionRequest) => Promise<ApiResponse<FormulaVersion>>;
    createFormulaVersion: (formulaId: string, data: CreateFormulaVersionRequest) => Promise<ApiResponse<FormulaVersion>>;
    approveFormula: (id: string) => Promise<ApiResponse<Formula>>;
};
export interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    entity_ids?: string[] | null;
    user_id?: string;
    user_name?: string;
    request_details?: any;
    response_details?: any;
    status: "success" | "partial" | "error";
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
    page?: number;
    page_size?: number;
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
export declare const auditRsApi: {
    listAuditLogs: (params?: AuditLogQueryParams) => Promise<ApiResponse<{
        audit_logs: AuditLog[];
        total: number;
    }>>;
    getAuditLog: (id: string) => Promise<ApiResponse<AuditLog>>;
};
export declare const rsStatisticsApi: {
    getStatistics: () => Promise<ApiResponse<RsStatistics>>;
};
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
    page_size?: number;
    search?: string;
    category?: string;
    status?: string;
}
export declare const materialApi: {
    listMaterials: (params?: MaterialQueryParams) => Promise<ApiResponse<{
        materials: Material[];
        total: number;
        page: number;
        page_size: number;
    }>>;
    getMaterial: (id: string) => Promise<ApiResponse<Material>>;
    createMaterial: (data: CreateMaterialRequest) => Promise<ApiResponse<Material>>;
    updateMaterial: (id: string, data: UpdateMaterialRequest) => Promise<ApiResponse<Material>>;
    deleteMaterial: (id: string) => Promise<ApiResponse<string>>;
    batchDeleteMaterials: (ids: string[]) => Promise<ApiResponse<BatchOperationResult>>;
    importMaterials: (file: File) => Promise<ApiResponse<BatchOperationResult>>;
    exportMaterials: () => Promise<Blob>;
};
export type { Experiment as LegacyExperimentRecord };
export interface CreateExperimentRequestLegacy {
    project_id: string;
    title: string;
    description: string;
    experiment_type: string;
    result: string;
    status: string;
    experimenter: string;
}
export interface UpdateExperimentRequestLegacy {
    title?: string;
    description?: string;
    experiment_type?: string;
    result?: string;
    status?: string;
    experimenter?: string;
    conclusion?: string;
}
