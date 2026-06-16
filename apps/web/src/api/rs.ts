import apiClient, { downloadBlob } from "./client";
import type { ApiResponse } from "./client";
import config from "../config/runtime";

// 项目相关类型
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

// 试验相关类型
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

// 配方相关类型
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

// 批量操作相关
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

// 项目仪表盘相关
export interface ProjectDashboardResponse {
  project: Project;
  progress: any;
  budget: any;
  members: any[];
  equipment: any[];
  benefits: any;
  risks: any[];
}

// 甘特图相关
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

// RS API 函数
export const rsApi = {
  // 项目相关
  listProjects: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<
    ApiResponse<{
      projects: Project[];
      total: number;
      page: number;
      page_size: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)]),
        )
      : "";
    const url = queryParams
      ? `/api/v1/projects?${queryParams}`
      : "/api/v1/projects";
    return apiClient.rs.get(url);
  },

  getProject: async (id: string): Promise<ApiResponse<Project>> => {
    return apiClient.rs.get(`/api/v1/projects/${id}`);
  },

  createProject: async (
    data: CreateProjectRequest,
  ): Promise<ApiResponse<Project>> => {
    return apiClient.rs.post("/api/v1/projects", data);
  },

  updateProject: async (
    id: string,
    data: UpdateProjectRequest,
  ): Promise<ApiResponse<Project>> => {
    return apiClient.rs.put(`/api/v1/projects/${id}`, data);
  },

  deleteProject: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.rs.delete(`/api/v1/projects/${id}`);
  },

  batchCreateProjects: async (
    data: BatchCreateProjectsRequest,
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.rs.post("/api/v1/projects/batch", data);
  },

  batchDeleteProjects: async (
    data: BatchDeleteProjectsRequest,
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.rs.delete("/api/v1/projects/batch", { data });
  },

  exportProjects: async (): Promise<Blob> => {
    const baseURL =
      (apiClient.rs as any).defaults?.baseURL || config.services.rs;
    return downloadBlob(baseURL, "/api/v1/projects/export");
  },

  importProjects: async (
    file: File,
  ): Promise<ApiResponse<BatchOperationResult>> => {
    const content = await file.text();
    return apiClient.rs.post("/api/v1/projects/import", content, {
      headers: {
        "Content-Type": "text/csv",
      },
    });
  },

  getProjectDashboard: async (
    id: string,
  ): Promise<ApiResponse<ProjectDashboardResponse>> => {
    return apiClient.rs.get(`/api/v1/projects/${id}/dashboard`);
  },

  getProjectGantt: async (
    id: string,
  ): Promise<ApiResponse<ProjectGanttResponse>> => {
    return apiClient.rs.get(`/api/v1/projects/${id}/gantt`);
  },

  // 试验相关
  listExperiments: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    project_id?: string;
    experiment_type?: string;
  }): Promise<
    ApiResponse<{
      experiments: Experiment[];
      total: number;
      page: number;
      page_size: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)]),
        )
      : "";
    const url = queryParams
      ? `/api/v1/experiments?${queryParams}`
      : "/api/v1/experiments";
    return apiClient.rs.get(url);
  },

  getExperiment: async (id: string): Promise<ApiResponse<Experiment>> => {
    return apiClient.rs.get(`/api/v1/experiments/${id}`);
  },

  createExperiment: async (
    data: CreateExperimentRequest,
  ): Promise<ApiResponse<Experiment>> => {
    return apiClient.rs.post("/api/v1/experiments", data);
  },

  updateExperiment: async (
    id: string,
    data: UpdateExperimentRequest,
  ): Promise<ApiResponse<Experiment>> => {
    return apiClient.rs.put(`/api/v1/experiments/${id}`, data);
  },

  deleteExperiment: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.rs.delete(`/api/v1/experiments/${id}`);
  },

  listExperimentsByProject: async (
    projectId: string,
  ): Promise<ApiResponse<Experiment[]>> => {
    return apiClient.rs.get(`/api/v1/experiments/project/${projectId}`);
  },

  listLabExperiments: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<
    ApiResponse<{
      experiments: Experiment[];
      total: number;
      page: number;
      page_size: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)]),
        )
      : "";
    const url = queryParams
      ? `/api/v1/experiments/phase/lab?${queryParams}`
      : "/api/v1/experiments/phase/lab";
    return apiClient.rs.get(url);
  },

  listPilotExperiments: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<
    ApiResponse<{
      experiments: Experiment[];
      total: number;
      page: number;
      page_size: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)]),
        )
      : "";
    const url = queryParams
      ? `/api/v1/experiments/phase/pilot?${queryParams}`
      : "/api/v1/experiments/phase/pilot";
    return apiClient.rs.get(url);
  },

  listScaleupExperiments: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<
    ApiResponse<{
      experiments: Experiment[];
      total: number;
      page: number;
      page_size: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)]),
        )
      : "";
    const url = queryParams
      ? `/api/v1/experiments/phase/scaleup?${queryParams}`
      : "/api/v1/experiments/phase/scaleup";
    return apiClient.rs.get(url);
  },

  advancePhase: async (
    id: string,
    data?: { new_status?: string },
  ): Promise<ApiResponse<Experiment>> => {
    return apiClient.rs.post(
      `/api/v1/experiments/${id}/advance-phase`,
      data || {},
    );
  },

  traceBatch: async (
    batchNumber: string,
  ): Promise<ApiResponse<BatchTraceItem[]>> => {
    return apiClient.rs.get(`/api/v1/batch-trace/${batchNumber}`);
  },

  // 试验记录相关
  getExperimentRecords: async (
    experimentId: string,
  ): Promise<ApiResponse<ExperimentRecord[]>> => {
    return apiClient.rs.get(`/api/v1/experiments/${experimentId}/records`);
  },

  createExperimentRecord: async (
    experimentId: string,
    data: CreateExperimentRecordRequest,
  ): Promise<ApiResponse<{ id: string; recorded_at: string }>> => {
    return apiClient.rs.post(
      `/api/v1/experiments/${experimentId}/records`,
      data,
    );
  },

  // 统计相关
  getStatistics: async (): Promise<ApiResponse<RsStatistics>> => {
    return apiClient.rs.get("/api/v1/statistics");
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.rs.get("/health");
  },
};

// 配方 API 函数
export const formulaApi = {
  listFormulas: async (params?: {
    project_id?: string;
    status?: string;
  }): Promise<ApiResponse<Formula[]>> => {
    let url = "/api/v1/formulas";
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return apiClient.rs.get(url);
  },

  getFormula: async (id: string): Promise<ApiResponse<Formula>> => {
    return apiClient.rs.get(`/api/v1/formulas/${id}`);
  },

  createFormula: async (
    data: CreateFormulaRequest,
  ): Promise<ApiResponse<Formula>> => {
    return apiClient.rs.post("/api/v1/formulas", data);
  },

  updateFormula: async (
    id: string,
    data: UpdateFormulaRequest,
  ): Promise<ApiResponse<Formula>> => {
    return apiClient.rs.put(`/api/v1/formulas/${id}`, data);
  },

  deleteFormula: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.rs.delete(`/api/v1/formulas/${id}`);
  },

  listVersions: async (
    formulaId: string,
  ): Promise<ApiResponse<FormulaVersion[]>> => {
    return apiClient.rs.get(`/api/v1/formulas/${formulaId}/versions`);
  },

  listFormulaVersions: async (
    formulaId: string,
  ): Promise<ApiResponse<FormulaVersion[]>> => {
    return apiClient.rs.get(`/api/v1/formulas/${formulaId}/versions`);
  },

  createVersion: async (
    formulaId: string,
    data: CreateFormulaVersionRequest,
  ): Promise<ApiResponse<FormulaVersion>> => {
    return apiClient.rs.post(`/api/v1/formulas/${formulaId}/versions`, data);
  },

  createFormulaVersion: async (
    formulaId: string,
    data: CreateFormulaVersionRequest,
  ): Promise<ApiResponse<FormulaVersion>> => {
    return apiClient.rs.post(`/api/v1/formulas/${formulaId}/versions`, data);
  },

  approveFormula: async (id: string): Promise<ApiResponse<Formula>> => {
    return apiClient.rs.post(`/api/v1/formulas/${id}/approve`, {});
  },
};

// 审计日志类型
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

export const auditRsApi = {
  listAuditLogs: async (
    params?: AuditLogQueryParams,
  ): Promise<ApiResponse<{ audit_logs: AuditLog[]; total: number }>> => {
    let url = "/api/v1/audit-logs";
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return apiClient.rs.get(url);
  },

  getAuditLog: async (id: string): Promise<ApiResponse<AuditLog>> => {
    return apiClient.rs.get(`/api/v1/audit-logs/${id}`);
  },
};

export const rsStatisticsApi = {
  getStatistics: async (): Promise<ApiResponse<RsStatistics>> => {
    return apiClient.rs.get("/api/v1/statistics");
  },
};

// ==================== Material API ====================

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

export const materialApi = {
  listMaterials: async (
    params?: MaterialQueryParams,
  ): Promise<
    ApiResponse<{
      materials: Material[];
      total: number;
      page: number;
      page_size: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)]),
        )
      : "";
    const url = queryParams
      ? `/api/v1/materials?${queryParams}`
      : "/api/v1/materials";
    return apiClient.rs.get(url);
  },

  getMaterial: async (id: string): Promise<ApiResponse<Material>> => {
    return apiClient.rs.get(`/api/v1/materials/${id}`);
  },

  createMaterial: async (
    data: CreateMaterialRequest,
  ): Promise<ApiResponse<Material>> => {
    return apiClient.rs.post("/api/v1/materials", data);
  },

  updateMaterial: async (
    id: string,
    data: UpdateMaterialRequest,
  ): Promise<ApiResponse<Material>> => {
    return apiClient.rs.put(`/api/v1/materials/${id}`, data);
  },

  deleteMaterial: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.rs.delete(`/api/v1/materials/${id}`);
  },

  batchDeleteMaterials: async (
    ids: string[],
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.rs.delete("/api/v1/materials/batch", { data: { ids } });
  },

  importMaterials: async (
    file: File,
  ): Promise<ApiResponse<BatchOperationResult>> => {
    const content = await file.text();
    return apiClient.rs.post("/api/v1/materials/import", content, {
      headers: {
        "Content-Type": "text/csv",
      },
    });
  },

  exportMaterials: async (): Promise<Blob> => {
    const baseURL =
      (apiClient.rs as any).defaults?.baseURL || config.services.rs;
    return downloadBlob(baseURL, "/api/v1/materials/export");
  },
};

// 导出向后兼容的旧类型（为了保持现有代码工作）
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
