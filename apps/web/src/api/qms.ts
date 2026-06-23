import apiClient from "./client";
import type { ApiResponse } from "./client";
import { apiLogger } from "@/utils/logger";

// Backend returns data structures
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
  inspection_no: string;
  inspection_type: string;
  product_id?: string;
  product_name?: string;
  standard_id?: string;
  quantity: number;
  qualified_quantity?: number;
  unqualified_quantity?: number;
  qualification_rate?: number;
  status: string;
  inspector?: string;
  assignee?: string;
  inspected_at?: string;
  result?: string;
  memo?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateQualityInspectionRequestBackend {
  inspection_type: string;
  product_id?: string;
  product_name?: string;
  standard_id?: string;
  quantity: number;
  created_by?: string;
}

export interface UpdateQualityInspectionRequestBackend {
  inspection_type?: string;
  product_id?: string;
  product_name?: string;
  standard_id?: string;
  quantity?: number;
}

export interface AssignInspectionRequestBackend {
  assignee: string;
  operator: string;
}

export interface SubmitInspectionResultRequestBackend {
  qualified_quantity: number;
  unqualified_quantity: number;
  qualification_rate?: number;
  result?: string;
  memo?: string;
  inspector: string;
  results?: InspectionResultItem[];
}

export interface InspectionResultItem {
  item_name: string;
  standard_value?: string;
  measured_value?: string;
  is_qualified: boolean;
  remark?: string;
}

export interface AuditInspectionRequestBackend {
  action: string;
  operator: string;
  comment?: string;
}

export interface InspectionAudit {
  id: string;
  inspection_id: string;
  status_from: string;
  status_to: string;
  action: string;
  operator: string;
  comment?: string;
  created_at?: string;
}

export interface InspectionResult {
  id: string;
  inspection_id: string;
  item_name: string;
  standard_value?: string;
  measured_value?: string;
  is_qualified: boolean;
  remark?: string;
  created_at?: string;
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

// Frontend types
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
  inspection_no: string;
  inspection_type: string;
  product_name?: string;
  standard_id?: string;
  quantity: number;
  qualified_quantity?: number;
  unqualified_quantity?: number;
  qualification_rate?: number;
  status: string;
  inspector?: string;
  assignee?: string;
  inspected_at?: string;
  result?: string;
  memo?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateQualityCheckRequest {
  inspection_type: string;
  product_name?: string;
  standard_id?: string;
  quantity: number;
  created_by?: string;
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

// Audit types
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

// Standard Revision
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

// Pagination wrapper
interface PaginatedResponse<T> {
  standards?: T[];
  inspections?: T[];
  issues?: T[];
  actions?: T[];
  total: number;
  page: number;
  page_size: number;
}

// Adapter functions
const adaptStandardToFrontend = (
  backend: QualityStandardBackend,
): QualityStandard => ({
  id: backend.id,
  name: backend.name,
  code: backend.code,
  category: backend.category || "",
  version: backend.version || "",
  description: backend.description || "",
  content: backend.description || "",
  status: backend.status,
  effective_date: backend.created_at,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

const adaptStandardToBackend = (
  frontend: CreateQualityStandardRequest,
): CreateQualityStandardRequestBackend => ({
  code: frontend.code,
  name: frontend.name,
  description: frontend.description,
  category: frontend.category,
  version: frontend.version,
});

const adaptInspectionToFrontend = (
  backend: QualityInspectionBackend,
): QualityCheck => ({
  id: backend.id,
  inspection_no: backend.inspection_no,
  inspection_type: backend.inspection_type,
  product_name: backend.product_name,
  standard_id: backend.standard_id,
  quantity: backend.quantity,
  qualified_quantity: backend.qualified_quantity,
  unqualified_quantity: backend.unqualified_quantity,
  qualification_rate: backend.qualification_rate,
  status: backend.status,
  inspector: backend.inspector,
  assignee: backend.assignee,
  inspected_at: backend.inspected_at,
  result: backend.result,
  memo: backend.memo,
  created_by: backend.created_by,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

const adaptInspectionToBackend = (
  frontend: CreateQualityCheckRequest,
): CreateQualityInspectionRequestBackend => ({
  inspection_type: frontend.inspection_type,
  product_name: frontend.product_name,
  standard_id: frontend.standard_id,
  quantity: frontend.quantity,
  created_by: frontend.created_by,
});

const adaptIssueToFrontend = (backend: QualityIssueBackend): QualityIssue => ({
  id: backend.id,
  issue_no:
    backend.title.substring(0, 20) + (backend.title.length > 20 ? "..." : ""),
  title: backend.title,
  description: backend.description,
  severity: backend.severity,
  category: backend.source || "",
  status: backend.status,
  assignee: backend.assigned_to || "",
  due_date: backend.due_date,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

const adaptIssueToBackend = (
  frontend: CreateQualityIssueRequest,
): CreateQualityIssueRequestBackend => ({
  title: frontend.title,
  description: frontend.description,
  severity: frontend.severity,
  source: frontend.category,
  assigned_to: frontend.assignee,
});

const adaptActionToFrontend = (
  backend: CorrectiveActionBackend,
): QualityImprovement => ({
  id: backend.id,
  improvement_no:
    backend.title.substring(0, 20) + (backend.title.length > 20 ? "..." : ""),
  title: backend.title,
  description: backend.description || "",
  category: "",
  status: backend.status,
  proposer: backend.verified_by || "",
  assignee: backend.assigned_to,
  improvement_effect: backend.verification_result,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

const adaptActionToBackend = (
  frontend: CreateQualityImprovementRequest,
): CreateCorrectiveActionRequestBackend => ({
  issue_id: "00000000-0000-0000-0000-000000000000",
  title: frontend.title,
  description: frontend.description,
  assigned_to: frontend.assignee,
});

// QMS Statistics Types
export interface QmsStatistics {
  // Quality Standards
  total_standards: number;
  active_standards: number;
  inactive_standards: number;

  // Quality Inspections/Checks
  total_inspections: number;
  pending_inspections: number;
  in_progress_inspections: number;
  completed_inspections: number;

  // Quality Issues
  total_issues: number;
  open_issues: number;
  resolved_issues: number;
  critical_issues: number;

  // Quality Improvements/Corrective Actions
  total_actions: number;
  pending_actions: number;
  in_progress_actions: number;
  completed_actions: number;
}

export const qmsApi = {
  // Quality Standards
  listStandards: async (): Promise<ApiResponse<QualityStandard[]>> => {
    const response =
      await apiClient.qms.get<PaginatedResponse<QualityStandardBackend>>(
        "/api/qms/standards",
      );
    const adaptedData = (response.data?.standards || []).map(
      adaptStandardToFrontend,
    );
    return { ...response, data: adaptedData };
  },
  getStandard: async (id: string): Promise<ApiResponse<QualityStandard>> => {
    const response = await apiClient.qms.get<QualityStandardBackend>(
      `/api/qms/standards/${id}`,
    );
    return {
      ...response,
      data: response.data ? adaptStandardToFrontend(response.data) : undefined,
    };
  },
  createStandard: async (
    data: CreateQualityStandardRequest,
  ): Promise<ApiResponse<QualityStandard>> => {
    const backendData = adaptStandardToBackend(data);
    const response = await apiClient.qms.post<QualityStandardBackend>(
      "/api/qms/standards",
      backendData,
    );
    return {
      ...response,
      data: response.data ? adaptStandardToFrontend(response.data) : undefined,
    };
  },
  updateStandard: async (
    id: string,
    data: CreateQualityStandardRequest,
  ): Promise<ApiResponse<QualityStandard>> => {
    const backendData: UpdateQualityStandardRequestBackend = {
      name: data.name,
      description: data.description,
      category: data.category,
      version: data.version,
      status: data.status,
    };
    const response = await apiClient.qms.put<QualityStandardBackend>(
      `/api/qms/standards/${id}`,
      backendData,
    );
    return {
      ...response,
      data: response.data ? adaptStandardToFrontend(response.data) : undefined,
    };
  },
  deleteStandard: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/standards/${id}`);
  },

  // Quality Checks
  listChecks: async (): Promise<ApiResponse<QualityCheck[]>> => {
    const response =
      await apiClient.qms.get<PaginatedResponse<QualityInspectionBackend>>(
        "/api/qms/checks",
      );
    const adaptedData = (response.data?.inspections || []).map(
      adaptInspectionToFrontend,
    );
    return { ...response, data: adaptedData };
  },
  getCheck: async (id: string): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.get<QualityInspectionBackend>(
      `/api/qms/checks/${id}`,
    );
    return {
      ...response,
      data: response.data
        ? adaptInspectionToFrontend(response.data)
        : undefined,
    };
  },
  createCheck: async (
    data: CreateQualityCheckRequest,
  ): Promise<ApiResponse<QualityCheck>> => {
    const backendData = adaptInspectionToBackend(data);
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      "/api/qms/checks",
      backendData,
    );
    return {
      ...response,
      data: response.data
        ? adaptInspectionToFrontend(response.data)
        : undefined,
    };
  },
  updateCheck: async (
    id: string,
    data: CreateQualityCheckRequest,
  ): Promise<ApiResponse<QualityCheck>> => {
    const backendData: UpdateQualityInspectionRequestBackend = {
      inspection_type: data.inspection_type,
      product_name: data.product_name,
      standard_id: data.standard_id,
      quantity: data.quantity,
    };
    const response = await apiClient.qms.put<QualityInspectionBackend>(
      `/api/qms/checks/${id}`,
      backendData,
    );
    return {
      ...response,
      data: response.data
        ? adaptInspectionToFrontend(response.data)
        : undefined,
    };
  },
  deleteCheck: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/checks/${id}`);
  },
  assignCheck: async (
    id: string,
    data: AssignInspectionRequestBackend,
  ): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      `/api/qms/checks/${id}/assign`,
      data,
    );
    return {
      ...response,
      data: response.data
        ? adaptInspectionToFrontend(response.data)
        : undefined,
    };
  },
  submitCheckResult: async (
    id: string,
    data: SubmitInspectionResultRequestBackend,
  ): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      `/api/qms/checks/${id}/submit`,
      data,
    );
    return {
      ...response,
      data: response.data
        ? adaptInspectionToFrontend(response.data)
        : undefined,
    };
  },
  auditCheck: async (
    id: string,
    data: AuditInspectionRequestBackend,
  ): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      `/api/qms/checks/${id}/audit`,
      data,
    );
    return {
      ...response,
      data: response.data
        ? adaptInspectionToFrontend(response.data)
        : undefined,
    };
  },
  reworkCheck: async (
    id: string,
    data: AuditInspectionRequestBackend,
  ): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      `/api/qms/checks/${id}/rework`,
      data,
    );
    return {
      ...response,
      data: response.data
        ? adaptInspectionToFrontend(response.data)
        : undefined,
    };
  },
  getCheckResults: async (
    id: string,
  ): Promise<ApiResponse<InspectionResult[]>> => {
    const response = await apiClient.qms.get<{ results?: InspectionResult[] }>(
      `/api/qms/checks/${id}/results`,
    );
    return { ...response, data: response.data?.results || [] };
  },
  getCheckAudits: async (
    id: string,
  ): Promise<ApiResponse<InspectionAudit[]>> => {
    const response = await apiClient.qms.get<{ audits?: InspectionAudit[] }>(
      `/api/qms/checks/${id}/audits`,
    );
    return { ...response, data: response.data?.audits || [] };
  },

  // Quality Issues
  listIssues: async (): Promise<ApiResponse<QualityIssue[]>> => {
    const response =
      await apiClient.qms.get<PaginatedResponse<QualityIssueBackend>>(
        "/api/qms/issues",
      );
    const adaptedData = (response.data?.issues || []).map(adaptIssueToFrontend);
    return { ...response, data: adaptedData };
  },
  getIssue: async (id: string): Promise<ApiResponse<QualityIssue>> => {
    const response = await apiClient.qms.get<QualityIssueBackend>(
      `/api/qms/issues/${id}`,
    );
    return {
      ...response,
      data: response.data ? adaptIssueToFrontend(response.data) : undefined,
    };
  },
  createIssue: async (
    data: CreateQualityIssueRequest,
  ): Promise<ApiResponse<QualityIssue>> => {
    const backendData = adaptIssueToBackend(data);
    const response = await apiClient.qms.post<QualityIssueBackend>(
      "/api/qms/issues",
      backendData,
    );
    return {
      ...response,
      data: response.data ? adaptIssueToFrontend(response.data) : undefined,
    };
  },
  updateIssue: async (
    id: string,
    data: CreateQualityIssueRequest,
  ): Promise<ApiResponse<QualityIssue>> => {
    const backendData: UpdateQualityIssueRequestBackend = {
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: data.status,
      assigned_to: data.assignee,
    };
    const response = await apiClient.qms.put<QualityIssueBackend>(
      `/api/qms/issues/${id}`,
      backendData,
    );
    return {
      ...response,
      data: response.data ? adaptIssueToFrontend(response.data) : undefined,
    };
  },
  deleteIssue: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/issues/${id}`);
  },

  // Quality Improvements
  listImprovements: async (): Promise<ApiResponse<QualityImprovement[]>> => {
    const response = await apiClient.qms.get<
      PaginatedResponse<CorrectiveActionBackend>
    >("/api/qms/improvements");
    const adaptedData = (response.data?.actions || []).map(
      adaptActionToFrontend,
    );
    return { ...response, data: adaptedData };
  },
  getImprovement: async (
    id: string,
  ): Promise<ApiResponse<QualityImprovement>> => {
    const response = await apiClient.qms.get<CorrectiveActionBackend>(
      `/api/qms/improvements/${id}`,
    );
    return {
      ...response,
      data: response.data ? adaptActionToFrontend(response.data) : undefined,
    };
  },
  createImprovement: async (
    data: CreateQualityImprovementRequest,
  ): Promise<ApiResponse<QualityImprovement>> => {
    const backendData = adaptActionToBackend(data);
    const response = await apiClient.qms.post<CorrectiveActionBackend>(
      "/api/qms/improvements",
      backendData,
    );
    return {
      ...response,
      data: response.data ? adaptActionToFrontend(response.data) : undefined,
    };
  },
  updateImprovement: async (
    id: string,
    data: CreateQualityImprovementRequest,
  ): Promise<ApiResponse<QualityImprovement>> => {
    const backendData: UpdateCorrectiveActionRequestBackend = {
      title: data.title,
      description: data.description,
      assigned_to: data.assignee,
      status: data.status,
      verified_by: data.proposer,
      verification_result: data.improvement_effect,
    };
    const response = await apiClient.qms.put<CorrectiveActionBackend>(
      `/api/qms/improvements/${id}`,
      backendData,
    );
    return {
      ...response,
      data: response.data ? adaptActionToFrontend(response.data) : undefined,
    };
  },
  deleteImprovement: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/improvements/${id}`);
  },

  // Statistics
  getStatistics: async (): Promise<ApiResponse<QmsStatistics>> => {
    try {
      // Fetch all data to calculate statistics client-side
      const [standardsRes, checksRes, issuesRes, improvementsRes] =
        await Promise.all([
          qmsApi.listStandards(),
          qmsApi.listChecks(),
          qmsApi.listIssues(),
          qmsApi.listImprovements(),
        ]);

      const standards = standardsRes.data || [];
      const checks = checksRes.data || [];
      const issues = issuesRes.data || [];
      const improvements = improvementsRes.data || [];

      const statistics: QmsStatistics = {
        total_standards: standards.length,
        active_standards: standards.filter(
          (s) => s.status === "active" || s.status === "启用",
        ).length,
        inactive_standards: standards.filter(
          (s) => s.status === "inactive" || s.status === "禁用",
        ).length,

        total_inspections: checks.length,
        pending_inspections: checks.filter(
          (c) => c.status === "pending" || c.status === "待处理",
        ).length,
        in_progress_inspections: checks.filter(
          (c) => c.status === "in_progress" || c.status === "进行中",
        ).length,
        completed_inspections: checks.filter(
          (c) => c.status === "completed" || c.status === "已完成",
        ).length,

        total_issues: issues.length,
        open_issues: issues.filter(
          (i) =>
            i.status === "open" ||
            i.status === "待处理" ||
            i.status === "处理中",
        ).length,
        resolved_issues: issues.filter(
          (i) =>
            i.status === "closed" ||
            i.status === "resolved" ||
            i.status === "已关闭",
        ).length,
        critical_issues: issues.filter(
          (i) => i.severity === "critical" || i.severity === "严重",
        ).length,

        total_actions: improvements.length,
        pending_actions: improvements.filter(
          (a) => a.status === "pending" || a.status === "提议",
        ).length,
        in_progress_actions: improvements.filter(
          (a) => a.status === "in_progress" || a.status === "实施中",
        ).length,
        completed_actions: improvements.filter(
          (a) => a.status === "completed" || a.status === "已完成",
        ).length,
      };

      return {
        success: true,
        data: statistics,
        message: "Statistics calculated",
        code: 200,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      apiLogger.error("Failed to calculate QMS statistics:", error);
      const fallbackStats: QmsStatistics = {
        total_standards: 0,
        active_standards: 0,
        inactive_standards: 0,
        total_inspections: 0,
        pending_inspections: 0,
        in_progress_inspections: 0,
        completed_inspections: 0,
        total_issues: 0,
        open_issues: 0,
        resolved_issues: 0,
        critical_issues: 0,
        total_actions: 0,
        pending_actions: 0,
        in_progress_actions: 0,
        completed_actions: 0,
      };
      return {
        success: true,
        data: fallbackStats,
        message: "Using fallback statistics",
        code: 200,
        timestamp: new Date().toISOString(),
      };
    }
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.qms.get<string>("/health");
  },

  // Audit Plans
  listAuditPlans: async (): Promise<ApiResponse<AuditPlan[]>> => {
    const response = await apiClient.qms.get<{ plans?: AuditPlan[] }>(
      "/api/qms/audit-plans",
    );
    return { ...response, data: response.data?.plans || [] };
  },

  // Audit Tasks
  listAuditTasks: async (
    planId?: string,
  ): Promise<ApiResponse<AuditTask[]>> => {
    const url = planId
      ? `/api/qms/audit-tasks?plan_id=${planId}`
      : "/api/qms/audit-tasks";
    const response = await apiClient.qms.get<{ tasks?: AuditTask[] }>(url);
    return { ...response, data: response.data?.tasks || [] };
  },

  // Audit Findings
  listAuditFindings: async (
    taskId?: string,
  ): Promise<ApiResponse<AuditFinding[]>> => {
    const url = taskId
      ? `/api/qms/audit-findings?task_id=${taskId}`
      : "/api/qms/audit-findings";
    const response = await apiClient.qms.get<{ findings?: AuditFinding[] }>(
      url,
    );
    return { ...response, data: response.data?.findings || [] };
  },

  // Create Audit Plan
  createAuditPlan: async (
    data: Omit<AuditPlan, "id" | "created_at" | "updated_at">,
  ): Promise<ApiResponse<AuditPlan>> => {
    const response = await apiClient.qms.post<AuditPlan>(
      "/api/qms/audit-plans",
      data,
    );
    return response;
  },

  // Complete Audit Task
  completeAuditTask: async (
    taskId: string,
  ): Promise<ApiResponse<AuditTask>> => {
    const response = await apiClient.qms.put<AuditTask>(
      `/api/qms/audit-tasks/${taskId}/complete`,
      { status: "completed" },
    );
    return response;
  },

  // Standard Revisions
  listRevisions: async (
    standardId: string,
  ): Promise<ApiResponse<StandardRevision[]>> => {
    const response = await apiClient.qms.get<{
      revisions?: StandardRevision[];
    }>(`/api/qms/standards/${standardId}/revisions`);
    return { ...response, data: response.data?.revisions || [] };
  },
};
