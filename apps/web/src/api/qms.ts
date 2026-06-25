import apiClient from './client';
import type { ApiResponse } from './client';
import { apiLogger } from '@/utils/logger';

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
const adaptStandardToFrontend = (backend: QualityStandardBackend): QualityStandard => ({
  id: backend.id,
  name: backend.name,
  code: backend.code,
  category: backend.category || '',
  version: backend.version || '',
  description: backend.description || '',
  content: backend.description || '',
  status: backend.status,
  effective_date: backend.created_at,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

const adaptStandardToBackend = (
  frontend: CreateQualityStandardRequest
): CreateQualityStandardRequestBackend => ({
  code: frontend.code,
  name: frontend.name,
  description: frontend.description,
  category: frontend.category,
  version: frontend.version,
});

const adaptInspectionToFrontend = (backend: QualityInspectionBackend): QualityCheck => ({
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
  frontend: CreateQualityCheckRequest
): CreateQualityInspectionRequestBackend => ({
  inspection_type: frontend.inspection_type,
  product_name: frontend.product_name,
  standard_id: frontend.standard_id,
  quantity: frontend.quantity,
  created_by: frontend.created_by,
});

const adaptIssueToFrontend = (backend: QualityIssueBackend): QualityIssue => ({
  id: backend.id,
  issue_no: backend.title.substring(0, 20) + (backend.title.length > 20 ? '...' : ''),
  title: backend.title,
  description: backend.description,
  severity: backend.severity,
  category: backend.source || '',
  status: backend.status,
  assignee: backend.assigned_to || '',
  due_date: backend.due_date,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

const adaptIssueToBackend = (
  frontend: CreateQualityIssueRequest
): CreateQualityIssueRequestBackend => ({
  title: frontend.title,
  description: frontend.description,
  severity: frontend.severity,
  source: frontend.category,
  assigned_to: frontend.assignee,
});

const adaptActionToFrontend = (backend: CorrectiveActionBackend): QualityImprovement => ({
  id: backend.id,
  improvement_no: backend.title.substring(0, 20) + (backend.title.length > 20 ? '...' : ''),
  title: backend.title,
  description: backend.description || '',
  category: '',
  status: backend.status,
  proposer: backend.verified_by || '',
  assignee: backend.assigned_to,
  improvement_effect: backend.verification_result,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

const adaptActionToBackend = (
  frontend: CreateQualityImprovementRequest
): CreateCorrectiveActionRequestBackend => ({
  issue_id: '00000000-0000-0000-0000-000000000000',
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
      await apiClient.qms.get<PaginatedResponse<QualityStandardBackend>>('/api/qms/standards');
    const adaptedData = (response.data?.standards || []).map(adaptStandardToFrontend);
    return { ...response, data: adaptedData };
  },
  getStandard: async (id: string): Promise<ApiResponse<QualityStandard>> => {
    const response = await apiClient.qms.get<QualityStandardBackend>(`/api/qms/standards/${id}`);
    return {
      ...response,
      data: response.data ? adaptStandardToFrontend(response.data) : undefined,
    };
  },
  createStandard: async (
    data: CreateQualityStandardRequest
  ): Promise<ApiResponse<QualityStandard>> => {
    const backendData = adaptStandardToBackend(data);
    const response = await apiClient.qms.post<QualityStandardBackend>(
      '/api/qms/standards',
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptStandardToFrontend(response.data) : undefined,
    };
  },
  updateStandard: async (
    id: string,
    data: CreateQualityStandardRequest
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
      backendData
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
      await apiClient.qms.get<PaginatedResponse<QualityInspectionBackend>>('/api/qms/checks');
    const adaptedData = (response.data?.inspections || []).map(adaptInspectionToFrontend);
    return { ...response, data: adaptedData };
  },
  getCheck: async (id: string): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.get<QualityInspectionBackend>(`/api/qms/checks/${id}`);
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },
  createCheck: async (data: CreateQualityCheckRequest): Promise<ApiResponse<QualityCheck>> => {
    const backendData = adaptInspectionToBackend(data);
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      '/api/qms/checks',
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },
  updateCheck: async (
    id: string,
    data: CreateQualityCheckRequest
  ): Promise<ApiResponse<QualityCheck>> => {
    const backendData: UpdateQualityInspectionRequestBackend = {
      inspection_type: data.inspection_type,
      product_name: data.product_name,
      standard_id: data.standard_id,
      quantity: data.quantity,
    };
    const response = await apiClient.qms.put<QualityInspectionBackend>(
      `/api/qms/checks/${id}`,
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },
  deleteCheck: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/checks/${id}`);
  },
  assignCheck: async (
    id: string,
    data: AssignInspectionRequestBackend
  ): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      `/api/qms/checks/${id}/assign`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },
  submitCheckResult: async (
    id: string,
    data: SubmitInspectionResultRequestBackend
  ): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      `/api/qms/checks/${id}/submit`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },
  auditCheck: async (
    id: string,
    data: AuditInspectionRequestBackend
  ): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      `/api/qms/checks/${id}/audit`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },
  reworkCheck: async (
    id: string,
    data: AuditInspectionRequestBackend
  ): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      `/api/qms/checks/${id}/rework`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },
  getCheckResults: async (id: string): Promise<ApiResponse<InspectionResult[]>> => {
    const response = await apiClient.qms.get<{ results?: InspectionResult[] }>(
      `/api/qms/checks/${id}/results`
    );
    return { ...response, data: response.data?.results || [] };
  },
  getCheckAudits: async (id: string): Promise<ApiResponse<InspectionAudit[]>> => {
    const response = await apiClient.qms.get<{ audits?: InspectionAudit[] }>(
      `/api/qms/checks/${id}/audits`
    );
    return { ...response, data: response.data?.audits || [] };
  },

  // Quality Issues
  listIssues: async (): Promise<ApiResponse<QualityIssue[]>> => {
    const response =
      await apiClient.qms.get<PaginatedResponse<QualityIssueBackend>>('/api/qms/issues');
    const adaptedData = (response.data?.issues || []).map(adaptIssueToFrontend);
    return { ...response, data: adaptedData };
  },
  getIssue: async (id: string): Promise<ApiResponse<QualityIssue>> => {
    const response = await apiClient.qms.get<QualityIssueBackend>(`/api/qms/issues/${id}`);
    return {
      ...response,
      data: response.data ? adaptIssueToFrontend(response.data) : undefined,
    };
  },
  createIssue: async (data: CreateQualityIssueRequest): Promise<ApiResponse<QualityIssue>> => {
    const backendData = adaptIssueToBackend(data);
    const response = await apiClient.qms.post<QualityIssueBackend>('/api/qms/issues', backendData);
    return {
      ...response,
      data: response.data ? adaptIssueToFrontend(response.data) : undefined,
    };
  },
  updateIssue: async (
    id: string,
    data: CreateQualityIssueRequest
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
      backendData
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
    const response =
      await apiClient.qms.get<PaginatedResponse<CorrectiveActionBackend>>('/api/qms/improvements');
    const adaptedData = (response.data?.actions || []).map(adaptActionToFrontend);
    return { ...response, data: adaptedData };
  },
  getImprovement: async (id: string): Promise<ApiResponse<QualityImprovement>> => {
    const response = await apiClient.qms.get<CorrectiveActionBackend>(
      `/api/qms/improvements/${id}`
    );
    return {
      ...response,
      data: response.data ? adaptActionToFrontend(response.data) : undefined,
    };
  },
  createImprovement: async (
    data: CreateQualityImprovementRequest
  ): Promise<ApiResponse<QualityImprovement>> => {
    const backendData = adaptActionToBackend(data);
    const response = await apiClient.qms.post<CorrectiveActionBackend>(
      '/api/qms/improvements',
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptActionToFrontend(response.data) : undefined,
    };
  },
  updateImprovement: async (
    id: string,
    data: CreateQualityImprovementRequest
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
      backendData
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
      const [standardsRes, checksRes, issuesRes, improvementsRes] = await Promise.all([
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
        active_standards: standards.filter((s) => s.status === 'active' || s.status === '启用')
          .length,
        inactive_standards: standards.filter((s) => s.status === 'inactive' || s.status === '禁用')
          .length,

        total_inspections: checks.length,
        pending_inspections: checks.filter((c) => c.status === 'pending' || c.status === '待处理')
          .length,
        in_progress_inspections: checks.filter(
          (c) => c.status === 'in_progress' || c.status === '进行中'
        ).length,
        completed_inspections: checks.filter(
          (c) => c.status === 'completed' || c.status === '已完成'
        ).length,

        total_issues: issues.length,
        open_issues: issues.filter(
          (i) => i.status === 'open' || i.status === '待处理' || i.status === '处理中'
        ).length,
        resolved_issues: issues.filter(
          (i) => i.status === 'closed' || i.status === 'resolved' || i.status === '已关闭'
        ).length,
        critical_issues: issues.filter((i) => i.severity === 'critical' || i.severity === '严重')
          .length,

        total_actions: improvements.length,
        pending_actions: improvements.filter((a) => a.status === 'pending' || a.status === '提议')
          .length,
        in_progress_actions: improvements.filter(
          (a) => a.status === 'in_progress' || a.status === '实施中'
        ).length,
        completed_actions: improvements.filter(
          (a) => a.status === 'completed' || a.status === '已完成'
        ).length,
      };

      return {
        success: true,
        data: statistics,
        message: 'Statistics calculated',
        code: 200,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      apiLogger.error('Failed to calculate QMS statistics:', error);
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
        message: 'Using fallback statistics',
        code: 200,
        timestamp: new Date().toISOString(),
      };
    }
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.qms.get<string>('/health');
  },

  // Audit Plans
  listAuditPlans: async (): Promise<ApiResponse<AuditPlan[]>> => {
    const response = await apiClient.qms.get<{ plans?: AuditPlan[] }>('/api/qms/audit-plans');
    return { ...response, data: response.data?.plans || [] };
  },

  // Audit Tasks
  listAuditTasks: async (planId?: string): Promise<ApiResponse<AuditTask[]>> => {
    const url = planId ? `/api/qms/audit-tasks?plan_id=${planId}` : '/api/qms/audit-tasks';
    const response = await apiClient.qms.get<{ tasks?: AuditTask[] }>(url);
    return { ...response, data: response.data?.tasks || [] };
  },

  // Audit Findings
  listAuditFindings: async (taskId?: string): Promise<ApiResponse<AuditFinding[]>> => {
    const url = taskId ? `/api/qms/audit-findings?task_id=${taskId}` : '/api/qms/audit-findings';
    const response = await apiClient.qms.get<{ findings?: AuditFinding[] }>(url);
    return { ...response, data: response.data?.findings || [] };
  },

  // Create Audit Plan
  createAuditPlan: async (
    data: Omit<AuditPlan, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<AuditPlan>> => {
    const response = await apiClient.qms.post<AuditPlan>('/api/qms/audit-plans', data);
    return response;
  },

  // Complete Audit Task
  completeAuditTask: async (taskId: string): Promise<ApiResponse<AuditTask>> => {
    const response = await apiClient.qms.put<AuditTask>(`/api/qms/audit-tasks/${taskId}/complete`, {
      status: 'completed',
    });
    return response;
  },

  // Standard Revisions
  listRevisions: async (standardId: string): Promise<ApiResponse<StandardRevision[]>> => {
    const response = await apiClient.qms.get<{
      revisions?: StandardRevision[];
    }>(`/api/qms/standards/${standardId}/revisions`);
    return { ...response, data: response.data?.revisions || [] };
  },
};

// ============================================
// SPC (Statistical Process Control) Types
// ============================================
export interface SpcChartBackend {
  id: string;
  chart_no: string;
  chart_name: string;
  chart_type: string;
  product_id?: string;
  product_name?: string;
  process_id?: string;
  process_name?: string;
  characteristic: string;
  unit?: string;
  usl?: number;
  lsl?: number;
  target?: number;
  ucl?: number;
  lcl?: number;
  cl?: number;
  sample_size: number;
  sampling_frequency?: string;
  status: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSpcChartRequestBackend {
  chart_no: string;
  chart_name: string;
  chart_type: string;
  product_id?: string;
  product_name?: string;
  process_id?: string;
  process_name?: string;
  characteristic: string;
  unit?: string;
  usl?: number;
  lsl?: number;
  target?: number;
  sample_size: number;
  sampling_frequency?: string;
  status?: string;
  description?: string;
}

export interface UpdateSpcChartRequestBackend {
  chart_name?: string;
  chart_type?: string;
  product_id?: string;
  product_name?: string;
  process_id?: string;
  process_name?: string;
  characteristic?: string;
  unit?: string;
  usl?: number;
  lsl?: number;
  target?: number;
  ucl?: number;
  lcl?: number;
  cl?: number;
  sample_size?: number;
  sampling_frequency?: string;
  status?: string;
  description?: string;
}

export interface SpcDataPointBackend {
  id: string;
  chart_id: string;
  sample_no: string;
  sample_time: string;
  values: number[];
  mean?: number;
  range?: number;
  std_dev?: number;
  is_out_of_control: boolean;
  violation_rules?: string[];
  operator?: string;
  remark?: string;
  created_at: string;
}

export interface CreateSpcDataPointRequestBackend {
  chart_id: string;
  sample_no: string;
  sample_time?: string;
  values: number[];
  operator?: string;
  remark?: string;
}

export interface ControlLimitsResultBackend {
  ucl: number;
  lcl: number;
  cl: number;
  usl?: number;
  lsl?: number;
  cp?: number;
  cpk?: number;
  pp?: number;
  ppk?: number;
  mean?: number;
  std_dev?: number;
  data_points_count: number;
}

export interface SpcChart {
  id: string;
  chartNo: string;
  chartName: string;
  chartType: string;
  productId?: string;
  productName?: string;
  processId?: string;
  processName?: string;
  characteristic: string;
  unit?: string;
  usl?: number;
  lsl?: number;
  target?: number;
  ucl?: number;
  lcl?: number;
  cl?: number;
  sampleSize: number;
  samplingFrequency?: string;
  status: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpcChartRequest {
  chartNo: string;
  chartName: string;
  chartType: string;
  productId?: string;
  productName?: string;
  processId?: string;
  processName?: string;
  characteristic: string;
  unit?: string;
  usl?: number;
  lsl?: number;
  target?: number;
  sampleSize: number;
  samplingFrequency?: string;
  status?: string;
  description?: string;
}

export interface SpcDataPoint {
  id: string;
  chartId: string;
  sampleNo: string;
  sampleTime: string;
  values: number[];
  mean?: number;
  range?: number;
  stdDev?: number;
  isOutOfControl: boolean;
  violationRules?: string[];
  operator?: string;
  remark?: string;
  createdAt: string;
}

export interface ControlLimitsResult {
  ucl: number;
  lcl: number;
  cl: number;
  usl?: number;
  lsl?: number;
  cp?: number;
  cpk?: number;
  pp?: number;
  ppk?: number;
  mean?: number;
  stdDev?: number;
  dataPointsCount: number;
}

const adaptSpcChartToFrontend = (backend: SpcChartBackend): SpcChart => ({
  id: backend.id,
  chartNo: backend.chart_no,
  chartName: backend.chart_name,
  chartType: backend.chart_type,
  productId: backend.product_id,
  productName: backend.product_name,
  processId: backend.process_id,
  processName: backend.process_name,
  characteristic: backend.characteristic,
  unit: backend.unit,
  usl: backend.usl,
  lsl: backend.lsl,
  target: backend.target,
  ucl: backend.ucl,
  lcl: backend.lcl,
  cl: backend.cl,
  sampleSize: backend.sample_size,
  samplingFrequency: backend.sampling_frequency,
  status: backend.status,
  description: backend.description,
  createdBy: backend.created_by,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

const adaptSpcChartToBackend = (
  frontend: CreateSpcChartRequest
): CreateSpcChartRequestBackend => ({
  chart_no: frontend.chartNo,
  chart_name: frontend.chartName,
  chart_type: frontend.chartType,
  product_id: frontend.productId,
  product_name: frontend.productName,
  process_id: frontend.processId,
  process_name: frontend.processName,
  characteristic: frontend.characteristic,
  unit: frontend.unit,
  usl: frontend.usl,
  lsl: frontend.lsl,
  target: frontend.target,
  sample_size: frontend.sampleSize,
  sampling_frequency: frontend.samplingFrequency,
  status: frontend.status,
  description: frontend.description,
});

const adaptSpcDataPointToFrontend = (backend: SpcDataPointBackend): SpcDataPoint => ({
  id: backend.id,
  chartId: backend.chart_id,
  sampleNo: backend.sample_no,
  sampleTime: backend.sample_time,
  values: backend.values,
  mean: backend.mean,
  range: backend.range,
  stdDev: backend.std_dev,
  isOutOfControl: backend.is_out_of_control,
  violationRules: backend.violation_rules,
  operator: backend.operator,
  remark: backend.remark,
  createdAt: backend.created_at,
});

const adaptControlLimitsToFrontend = (backend: ControlLimitsResultBackend): ControlLimitsResult => ({
  ucl: backend.ucl,
  lcl: backend.lcl,
  cl: backend.cl,
  usl: backend.usl,
  lsl: backend.lsl,
  cp: backend.cp,
  cpk: backend.cpk,
  pp: backend.pp,
  ppk: backend.ppk,
  mean: backend.mean,
  stdDev: backend.std_dev,
  dataPointsCount: backend.data_points_count,
});

// ============================================
// Quality Cost Types
// ============================================
export interface QualityCostBackend {
  id: string;
  cost_no: string;
  cost_type: string;
  cost_category: string;
  amount: number;
  currency?: string;
  occurrence_date: string;
  department?: string;
  related_order_no?: string;
  description?: string;
  responsible_person?: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityCostRequestBackend {
  cost_no: string;
  cost_type: string;
  cost_category: string;
  amount: number;
  currency?: string;
  occurrence_date: string;
  department?: string;
  related_order_no?: string;
  description?: string;
  responsible_person?: string;
  status?: string;
}

export interface UpdateQualityCostRequestBackend {
  cost_type?: string;
  cost_category?: string;
  amount?: number;
  currency?: string;
  occurrence_date?: string;
  department?: string;
  related_order_no?: string;
  description?: string;
  responsible_person?: string;
  status?: string;
}

export interface CostStatisticsBackend {
  total_cost: number;
  prevention_cost: number;
  appraisal_cost: number;
  internal_failure_cost: number;
  external_failure_cost: number;
  cost_by_category: Record<string, number>;
  cost_by_department: Record<string, number>;
  period_start: string;
  period_end: string;
}

export interface CostTrendItemBackend {
  date: string;
  total_cost: number;
  prevention_cost: number;
  appraisal_cost: number;
  internal_failure_cost: number;
  external_failure_cost: number;
}

export interface QualityCost {
  id: string;
  costNo: string;
  costType: string;
  costCategory: string;
  amount: number;
  currency?: string;
  occurrenceDate: string;
  department?: string;
  relatedOrderNo?: string;
  description?: string;
  responsiblePerson?: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQualityCostRequest {
  costNo: string;
  costType: string;
  costCategory: string;
  amount: number;
  currency?: string;
  occurrenceDate: string;
  department?: string;
  relatedOrderNo?: string;
  description?: string;
  responsiblePerson?: string;
  status?: string;
}

export interface CostStatistics {
  totalCost: number;
  preventionCost: number;
  appraisalCost: number;
  internalFailureCost: number;
  externalFailureCost: number;
  costByCategory: Record<string, number>;
  costByDepartment: Record<string, number>;
  periodStart: string;
  periodEnd: string;
}

export interface CostTrendItem {
  date: string;
  totalCost: number;
  preventionCost: number;
  appraisalCost: number;
  internalFailureCost: number;
  externalFailureCost: number;
}

const adaptQualityCostToFrontend = (backend: QualityCostBackend): QualityCost => ({
  id: backend.id,
  costNo: backend.cost_no,
  costType: backend.cost_type,
  costCategory: backend.cost_category,
  amount: backend.amount,
  currency: backend.currency,
  occurrenceDate: backend.occurrence_date,
  department: backend.department,
  relatedOrderNo: backend.related_order_no,
  description: backend.description,
  responsiblePerson: backend.responsible_person,
  status: backend.status,
  createdBy: backend.created_by,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

const adaptQualityCostToBackend = (
  frontend: CreateQualityCostRequest
): CreateQualityCostRequestBackend => ({
  cost_no: frontend.costNo,
  cost_type: frontend.costType,
  cost_category: frontend.costCategory,
  amount: frontend.amount,
  currency: frontend.currency,
  occurrence_date: frontend.occurrenceDate,
  department: frontend.department,
  related_order_no: frontend.relatedOrderNo,
  description: frontend.description,
  responsible_person: frontend.responsiblePerson,
  status: frontend.status,
});

const adaptCostStatisticsToFrontend = (backend: CostStatisticsBackend): CostStatistics => ({
  totalCost: backend.total_cost,
  preventionCost: backend.prevention_cost,
  appraisalCost: backend.appraisal_cost,
  internalFailureCost: backend.internal_failure_cost,
  externalFailureCost: backend.external_failure_cost,
  costByCategory: backend.cost_by_category,
  costByDepartment: backend.cost_by_department,
  periodStart: backend.period_start,
  periodEnd: backend.period_end,
});

const adaptCostTrendItemToFrontend = (backend: CostTrendItemBackend): CostTrendItem => ({
  date: backend.date,
  totalCost: backend.total_cost,
  preventionCost: backend.prevention_cost,
  appraisalCost: backend.appraisal_cost,
  internalFailureCost: backend.internal_failure_cost,
  externalFailureCost: backend.external_failure_cost,
});

// ============================================
// 8D Problem Solving Types
// ============================================
export interface EightDReportBackend {
  id: string;
  report_no: string;
  title: string;
  problem_description: string;
  severity: string;
  source?: string;
  related_issue_id?: string;
  product_id?: string;
  product_name?: string;
  customer?: string;
  status: string;
  current_stage: number;
  team_leader?: string;
  team_members?: string[];
  d1_team_established?: boolean;
  d2_problem_described?: boolean;
  d3_containment_implemented?: boolean;
  d4_root_cause_identified?: boolean;
  d5_permanent_action_selected?: boolean;
  d6_action_verified?: boolean;
  d7_preventive_implemented?: boolean;
  d8_team_recognized?: boolean;
  d1_content?: string;
  d2_content?: string;
  d3_content?: string;
  d4_content?: string;
  d5_content?: string;
  d6_content?: string;
  d7_content?: string;
  d8_content?: string;
  due_date?: string;
  closed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEightDReportRequestBackend {
  report_no: string;
  title: string;
  problem_description: string;
  severity: string;
  source?: string;
  related_issue_id?: string;
  product_id?: string;
  product_name?: string;
  customer?: string;
  team_leader?: string;
  team_members?: string[];
  due_date?: string;
}

export interface UpdateEightDReportRequestBackend {
  title?: string;
  problem_description?: string;
  severity?: string;
  source?: string;
  product_id?: string;
  product_name?: string;
  customer?: string;
  status?: string;
  due_date?: string;
}

export interface EightDAuditLogBackend {
  id: string;
  report_id: string;
  action: string;
  stage?: number;
  operator: string;
  remark?: string;
  created_at: string;
}

export interface EightDReport {
  id: string;
  reportNo: string;
  title: string;
  problemDescription: string;
  severity: string;
  source?: string;
  relatedIssueId?: string;
  productId?: string;
  productName?: string;
  customer?: string;
  status: string;
  currentStage: number;
  teamLeader?: string;
  teamMembers?: string[];
  d1TeamEstablished: boolean;
  d2ProblemDescribed: boolean;
  d3ContainmentImplemented: boolean;
  d4RootCauseIdentified: boolean;
  d5PermanentActionSelected: boolean;
  d6ActionVerified: boolean;
  d7PreventiveImplemented: boolean;
  d8TeamRecognized: boolean;
  d1Content?: string;
  d2Content?: string;
  d3Content?: string;
  d4Content?: string;
  d5Content?: string;
  d6Content?: string;
  d7Content?: string;
  d8Content?: string;
  dueDate?: string;
  closedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEightDReportRequest {
  reportNo: string;
  title: string;
  problemDescription: string;
  severity: string;
  source?: string;
  relatedIssueId?: string;
  productId?: string;
  productName?: string;
  customer?: string;
  teamLeader?: string;
  teamMembers?: string[];
  dueDate?: string;
}

export interface EightDAuditLog {
  id: string;
  reportId: string;
  action: string;
  stage?: number;
  operator: string;
  remark?: string;
  createdAt: string;
}

const adaptEightDReportToFrontend = (backend: EightDReportBackend): EightDReport => ({
  id: backend.id,
  reportNo: backend.report_no,
  title: backend.title,
  problemDescription: backend.problem_description,
  severity: backend.severity,
  source: backend.source,
  relatedIssueId: backend.related_issue_id,
  productId: backend.product_id,
  productName: backend.product_name,
  customer: backend.customer,
  status: backend.status,
  currentStage: backend.current_stage,
  teamLeader: backend.team_leader,
  teamMembers: backend.team_members,
  d1TeamEstablished: backend.d1_team_established || false,
  d2ProblemDescribed: backend.d2_problem_described || false,
  d3ContainmentImplemented: backend.d3_containment_implemented || false,
  d4RootCauseIdentified: backend.d4_root_cause_identified || false,
  d5PermanentActionSelected: backend.d5_permanent_action_selected || false,
  d6ActionVerified: backend.d6_action_verified || false,
  d7PreventiveImplemented: backend.d7_preventive_implemented || false,
  d8TeamRecognized: backend.d8_team_recognized || false,
  d1Content: backend.d1_content,
  d2Content: backend.d2_content,
  d3Content: backend.d3_content,
  d4Content: backend.d4_content,
  d5Content: backend.d5_content,
  d6Content: backend.d6_content,
  d7Content: backend.d7_content,
  d8Content: backend.d8_content,
  dueDate: backend.due_date,
  closedAt: backend.closed_at,
  createdBy: backend.created_by,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

const adaptEightDReportToBackend = (
  frontend: CreateEightDReportRequest
): CreateEightDReportRequestBackend => ({
  report_no: frontend.reportNo,
  title: frontend.title,
  problem_description: frontend.problemDescription,
  severity: frontend.severity,
  source: frontend.source,
  related_issue_id: frontend.relatedIssueId,
  product_id: frontend.productId,
  product_name: frontend.productName,
  customer: frontend.customer,
  team_leader: frontend.teamLeader,
  team_members: frontend.teamMembers,
  due_date: frontend.dueDate,
});

const adaptEightDAuditLogToFrontend = (backend: EightDAuditLogBackend): EightDAuditLog => ({
  id: backend.id,
  reportId: backend.report_id,
  action: backend.action,
  stage: backend.stage,
  operator: backend.operator,
  remark: backend.remark,
  createdAt: backend.created_at,
});

// ============================================
// FMEA Types
// ============================================
export interface FmeaAnalysisBackend {
  id: string;
  fmea_no: string;
  fmea_name: string;
  fmea_type: string;
  product_id?: string;
  product_name?: string;
  process_id?: string;
  process_name?: string;
  version?: string;
  status: string;
  scope?: string;
  team_leader?: string;
  team_members?: string[];
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFmeaAnalysisRequestBackend {
  fmea_no: string;
  fmea_name: string;
  fmea_type: string;
  product_id?: string;
  product_name?: string;
  process_id?: string;
  process_name?: string;
  version?: string;
  status?: string;
  scope?: string;
  team_leader?: string;
  team_members?: string[];
  description?: string;
}

export interface UpdateFmeaAnalysisRequestBackend {
  fmea_name?: string;
  fmea_type?: string;
  product_id?: string;
  product_name?: string;
  process_id?: string;
  process_name?: string;
  version?: string;
  status?: string;
  scope?: string;
  team_leader?: string;
  team_members?: string[];
  description?: string;
}

export interface FmeaItemBackend {
  id: string;
  fmea_id: string;
  item_no: string;
  function_description: string;
  failure_mode: string;
  failure_effect: string;
  severity: number;
  failure_cause: string;
  occurrence: number;
  current_controls?: string;
  detection: number;
  rpn: number;
  recommended_actions?: string;
  responsibility?: string;
  target_date?: string;
  actions_taken?: string;
  severity_revised?: number;
  occurrence_revised?: number;
  detection_revised?: number;
  rpn_revised?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFmeaItemRequestBackend {
  fmea_id: string;
  item_no: string;
  function_description: string;
  failure_mode: string;
  failure_effect: string;
  severity: number;
  failure_cause: string;
  occurrence: number;
  current_controls?: string;
  detection: number;
  recommended_actions?: string;
  responsibility?: string;
  target_date?: string;
  status?: string;
}

export interface UpdateFmeaItemRequestBackend {
  function_description?: string;
  failure_mode?: string;
  failure_effect?: string;
  severity?: number;
  failure_cause?: string;
  occurrence?: number;
  current_controls?: string;
  detection?: number;
  recommended_actions?: string;
  responsibility?: string;
  target_date?: string;
  actions_taken?: string;
  severity_revised?: number;
  occurrence_revised?: number;
  detection_revised?: number;
  status?: string;
}

export interface FmeaStatisticsBackend {
  total_items: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  average_rpn: number;
  max_rpn: number;
  by_severity: Record<number, number>;
  by_occurrence: Record<number, number>;
  by_detection: Record<number, number>;
}

export interface FmeaAnalysis {
  id: string;
  fmeaNo: string;
  fmeaName: string;
  fmeaType: string;
  productId?: string;
  productName?: string;
  processId?: string;
  processName?: string;
  version?: string;
  status: string;
  scope?: string;
  teamLeader?: string;
  teamMembers?: string[];
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFmeaAnalysisRequest {
  fmeaNo: string;
  fmeaName: string;
  fmeaType: string;
  productId?: string;
  productName?: string;
  processId?: string;
  processName?: string;
  version?: string;
  status?: string;
  scope?: string;
  teamLeader?: string;
  teamMembers?: string[];
  description?: string;
}

export interface FmeaItem {
  id: string;
  fmeaId: string;
  itemNo: string;
  functionDescription: string;
  failureMode: string;
  failureEffect: string;
  severity: number;
  failureCause: string;
  occurrence: number;
  currentControls?: string;
  detection: number;
  rpn: number;
  recommendedActions?: string;
  responsibility?: string;
  targetDate?: string;
  actionsTaken?: string;
  severityRevised?: number;
  occurrenceRevised?: number;
  detectionRevised?: number;
  rpnRevised?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FmeaStatistics {
  totalItems: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageRpn: number;
  maxRpn: number;
  bySeverity: Record<number, number>;
  byOccurrence: Record<number, number>;
  byDetection: Record<number, number>;
}

const adaptFmeaAnalysisToFrontend = (backend: FmeaAnalysisBackend): FmeaAnalysis => ({
  id: backend.id,
  fmeaNo: backend.fmea_no,
  fmeaName: backend.fmea_name,
  fmeaType: backend.fmea_type,
  productId: backend.product_id,
  productName: backend.product_name,
  processId: backend.process_id,
  processName: backend.process_name,
  version: backend.version,
  status: backend.status,
  scope: backend.scope,
  teamLeader: backend.team_leader,
  teamMembers: backend.team_members,
  description: backend.description,
  createdBy: backend.created_by,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

const adaptFmeaAnalysisToBackend = (
  frontend: CreateFmeaAnalysisRequest
): CreateFmeaAnalysisRequestBackend => ({
  fmea_no: frontend.fmeaNo,
  fmea_name: frontend.fmeaName,
  fmea_type: frontend.fmeaType,
  product_id: frontend.productId,
  product_name: frontend.productName,
  process_id: frontend.processId,
  process_name: frontend.processName,
  version: frontend.version,
  status: frontend.status,
  scope: frontend.scope,
  team_leader: frontend.teamLeader,
  team_members: frontend.teamMembers,
  description: frontend.description,
});

const adaptFmeaItemToFrontend = (backend: FmeaItemBackend): FmeaItem => ({
  id: backend.id,
  fmeaId: backend.fmea_id,
  itemNo: backend.item_no,
  functionDescription: backend.function_description,
  failureMode: backend.failure_mode,
  failureEffect: backend.failure_effect,
  severity: backend.severity,
  failureCause: backend.failure_cause,
  occurrence: backend.occurrence,
  currentControls: backend.current_controls,
  detection: backend.detection,
  rpn: backend.rpn,
  recommendedActions: backend.recommended_actions,
  responsibility: backend.responsibility,
  targetDate: backend.target_date,
  actionsTaken: backend.actions_taken,
  severityRevised: backend.severity_revised,
  occurrenceRevised: backend.occurrence_revised,
  detectionRevised: backend.detection_revised,
  rpnRevised: backend.rpn_revised,
  status: backend.status,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

const adaptFmeaItemToBackend = (
  frontend: Omit<FmeaItem, 'id' | 'rpn' | 'rpnRevised' | 'createdAt' | 'updatedAt'>
): CreateFmeaItemRequestBackend => ({
  fmea_id: frontend.fmeaId,
  item_no: frontend.itemNo,
  function_description: frontend.functionDescription,
  failure_mode: frontend.failureMode,
  failure_effect: frontend.failureEffect,
  severity: frontend.severity,
  failure_cause: frontend.failureCause,
  occurrence: frontend.occurrence,
  current_controls: frontend.currentControls,
  detection: frontend.detection,
  recommended_actions: frontend.recommendedActions,
  responsibility: frontend.responsibility,
  target_date: frontend.targetDate,
  status: frontend.status,
});

const adaptFmeaStatisticsToFrontend = (backend: FmeaStatisticsBackend): FmeaStatistics => ({
  totalItems: backend.total_items,
  highRiskCount: backend.high_risk_count,
  mediumRiskCount: backend.medium_risk_count,
  lowRiskCount: backend.low_risk_count,
  averageRpn: backend.average_rpn,
  maxRpn: backend.max_rpn,
  bySeverity: backend.by_severity,
  byOccurrence: backend.by_occurrence,
  byDetection: backend.by_detection,
});

// ============================================
// Quality Dashboard Types
// ============================================
export interface QualityOverviewBackend {
  total_standards: number;
  total_inspections: number;
  total_issues: number;
  total_actions: number;
  pass_rate: number;
  defect_rate: number;
  on_time_delivery_rate: number;
  customer_complaint_count: number;
  quality_cost_total: number;
  quality_cost_ratio: number;
  spc_chart_count: number;
  fmea_count: number;
  eightd_count: number;
  audit_plan_count: number;
  trend_data: {
    date: string;
    pass_rate: number;
    defect_count: number;
    issue_count: number;
  }[];
  top_issues: {
    category: string;
    count: number;
    percentage: number;
  }[];
  department_performance: {
    department: string;
    pass_rate: number;
    issue_count: number;
  }[];
}

export interface QualityOverview {
  totalStandards: number;
  totalInspections: number;
  totalIssues: number;
  totalActions: number;
  passRate: number;
  defectRate: number;
  onTimeDeliveryRate: number;
  customerComplaintCount: number;
  qualityCostTotal: number;
  qualityCostRatio: number;
  spcChartCount: number;
  fmeaCount: number;
  eightdCount: number;
  auditPlanCount: number;
  trendData: {
    date: string;
    passRate: number;
    defectCount: number;
    issueCount: number;
  }[];
  topIssues: {
    category: string;
    count: number;
    percentage: number;
  }[];
  departmentPerformance: {
    department: string;
    passRate: number;
    issueCount: number;
  }[];
}

const adaptQualityOverviewToFrontend = (backend: QualityOverviewBackend): QualityOverview => ({
  totalStandards: backend.total_standards,
  totalInspections: backend.total_inspections,
  totalIssues: backend.total_issues,
  totalActions: backend.total_actions,
  passRate: backend.pass_rate,
  defectRate: backend.defect_rate,
  onTimeDeliveryRate: backend.on_time_delivery_rate,
  customerComplaintCount: backend.customer_complaint_count,
  qualityCostTotal: backend.quality_cost_total,
  qualityCostRatio: backend.quality_cost_ratio,
  spcChartCount: backend.spc_chart_count,
  fmeaCount: backend.fmea_count,
  eightdCount: backend.eightd_count,
  auditPlanCount: backend.audit_plan_count,
  trendData: backend.trend_data?.map(item => ({
    date: item.date,
    passRate: item.pass_rate,
    defectCount: item.defect_count,
    issueCount: item.issue_count,
  })) || [],
  topIssues: backend.top_issues?.map(item => ({
    category: item.category,
    count: item.count,
    percentage: item.percentage,
  })) || [],
  departmentPerformance: backend.department_performance?.map(item => ({
    department: item.department,
    passRate: item.pass_rate,
    issueCount: item.issue_count,
  })) || [],
});

// ============================================
// Data Sync Types
// ============================================
export interface SyncRecordBackend {
  id: string;
  sync_type: string;
  source_system: string;
  target_system: string;
  record_id?: string;
  record_type?: string;
  status: string;
  error_message?: string;
  retry_count: number;
  synced_by?: string;
  synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncRecord {
  id: string;
  syncType: string;
  sourceSystem: string;
  targetSystem: string;
  recordId?: string;
  recordType?: string;
  status: string;
  errorMessage?: string;
  retryCount: number;
  syncedBy?: string;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const adaptSyncRecordToFrontend = (backend: SyncRecordBackend): SyncRecord => ({
  id: backend.id,
  syncType: backend.sync_type,
  sourceSystem: backend.source_system,
  targetSystem: backend.target_system,
  recordId: backend.record_id,
  recordType: backend.record_type,
  status: backend.status,
  errorMessage: backend.error_message,
  retryCount: backend.retry_count,
  syncedBy: backend.synced_by,
  syncedAt: backend.synced_at,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

// ============================================
// Corrective Action Item Types
// ============================================
export interface ActionItemBackend {
  id: string;
  action_id: string;
  item_no: string;
  description: string;
  assigned_to: string;
  status: string;
  due_date?: string;
  completed_at?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  actionId: string;
  itemNo: string;
  description: string;
  assignedTo: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

const adaptActionItemToFrontend = (backend: ActionItemBackend): ActionItem => ({
  id: backend.id,
  actionId: backend.action_id,
  itemNo: backend.item_no,
  description: backend.description,
  assignedTo: backend.assigned_to,
  status: backend.status,
  dueDate: backend.due_date,
  completedAt: backend.completed_at,
  remark: backend.remark,
  createdAt: backend.created_at,
  updatedAt: backend.updated_at,
});

// ============================================
// SPC API
// ============================================
export const spcApi = {
  listSpcCharts: async (): Promise<ApiResponse<SpcChart[]>> => {
    const response = await apiClient.qms.get<{ charts?: SpcChartBackend[] }>('/api/qms/spc/charts');
    const adaptedData = (response.data?.charts || []).map(adaptSpcChartToFrontend);
    return { ...response, data: adaptedData };
  },

  getSpcChart: async (id: string): Promise<ApiResponse<SpcChart>> => {
    const response = await apiClient.qms.get<SpcChartBackend>(`/api/qms/spc/charts/${id}`);
    return {
      ...response,
      data: response.data ? adaptSpcChartToFrontend(response.data) : undefined,
    };
  },

  createSpcChart: async (data: CreateSpcChartRequest): Promise<ApiResponse<SpcChart>> => {
    const backendData = adaptSpcChartToBackend(data);
    const response = await apiClient.qms.post<SpcChartBackend>('/api/qms/spc/charts', backendData);
    return {
      ...response,
      data: response.data ? adaptSpcChartToFrontend(response.data) : undefined,
    };
  },

  updateSpcChart: async (
    id: string,
    data: Partial<CreateSpcChartRequest>
  ): Promise<ApiResponse<SpcChart>> => {
    const backendData: UpdateSpcChartRequestBackend = {
      chart_name: data.chartName,
      chart_type: data.chartType,
      product_id: data.productId,
      product_name: data.productName,
      process_id: data.processId,
      process_name: data.processName,
      characteristic: data.characteristic,
      unit: data.unit,
      usl: data.usl,
      lsl: data.lsl,
      target: data.target,
      sample_size: data.sampleSize,
      sampling_frequency: data.samplingFrequency,
      status: data.status,
      description: data.description,
    };
    const response = await apiClient.qms.put<SpcChartBackend>(
      `/api/qms/spc/charts/${id}`,
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptSpcChartToFrontend(response.data) : undefined,
    };
  },

  deleteSpcChart: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/spc/charts/${id}`);
  },

  getSpcDataPoints: async (chartId: string): Promise<ApiResponse<SpcDataPoint[]>> => {
    const response = await apiClient.qms.get<{ data_points?: SpcDataPointBackend[] }>(
      `/api/qms/spc/charts/${chartId}/data-points`
    );
    const adaptedData = (response.data?.data_points || []).map(adaptSpcDataPointToFrontend);
    return { ...response, data: adaptedData };
  },

  addSpcDataPoint: async (
    chartId: string,
    data: Omit<SpcDataPoint, 'id' | 'chartId' | 'createdAt' | 'mean' | 'range' | 'stdDev' | 'isOutOfControl' | 'violationRules'>
  ): Promise<ApiResponse<SpcDataPoint>> => {
    const backendData: CreateSpcDataPointRequestBackend = {
      chart_id: chartId,
      sample_no: data.sampleNo,
      sample_time: data.sampleTime,
      values: data.values,
      operator: data.operator,
      remark: data.remark,
    };
    const response = await apiClient.qms.post<SpcDataPointBackend>(
      '/api/qms/spc/data-points',
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptSpcDataPointToFrontend(response.data) : undefined,
    };
  },

  calculateControlLimits: async (chartId: string): Promise<ApiResponse<ControlLimitsResult>> => {
    const response = await apiClient.qms.post<ControlLimitsResultBackend>(
      `/api/qms/spc/charts/${chartId}/calculate`,
      {}
    );
    return {
      ...response,
      data: response.data ? adaptControlLimitsToFrontend(response.data) : undefined,
    };
  },
};

// ============================================
// Quality Cost API
// ============================================
export const qualityCostApi = {
  listQualityCosts: async (): Promise<ApiResponse<QualityCost[]>> => {
    const response = await apiClient.qms.get<{ costs?: QualityCostBackend[] }>(
      '/api/qms/quality-costs'
    );
    const adaptedData = (response.data?.costs || []).map(adaptQualityCostToFrontend);
    return { ...response, data: adaptedData };
  },

  getQualityCost: async (id: string): Promise<ApiResponse<QualityCost>> => {
    const response = await apiClient.qms.get<QualityCostBackend>(`/api/qms/quality-costs/${id}`);
    return {
      ...response,
      data: response.data ? adaptQualityCostToFrontend(response.data) : undefined,
    };
  },

  createQualityCost: async (data: CreateQualityCostRequest): Promise<ApiResponse<QualityCost>> => {
    const backendData = adaptQualityCostToBackend(data);
    const response = await apiClient.qms.post<QualityCostBackend>(
      '/api/qms/quality-costs',
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptQualityCostToFrontend(response.data) : undefined,
    };
  },

  updateQualityCost: async (
    id: string,
    data: Partial<CreateQualityCostRequest>
  ): Promise<ApiResponse<QualityCost>> => {
    const backendData: UpdateQualityCostRequestBackend = {
      cost_type: data.costType,
      cost_category: data.costCategory,
      amount: data.amount,
      currency: data.currency,
      occurrence_date: data.occurrenceDate,
      department: data.department,
      related_order_no: data.relatedOrderNo,
      description: data.description,
      responsible_person: data.responsiblePerson,
      status: data.status,
    };
    const response = await apiClient.qms.put<QualityCostBackend>(
      `/api/qms/quality-costs/${id}`,
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptQualityCostToFrontend(response.data) : undefined,
    };
  },

  deleteQualityCost: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/quality-costs/${id}`);
  },

  getCostStatistics: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<CostStatistics>> => {
    const response = await apiClient.qms.get<CostStatisticsBackend>(
      '/api/qms/quality-costs/statistics',
      {
        params: {
          start_date: params?.startDate,
          end_date: params?.endDate,
        },
      }
    );
    return {
      ...response,
      data: response.data ? adaptCostStatisticsToFrontend(response.data) : undefined,
    };
  },

  getCostTrend: async (params?: {
    startDate?: string;
    endDate?: string;
    period?: string;
  }): Promise<ApiResponse<CostTrendItem[]>> => {
    const response = await apiClient.qms.get<{ trend?: CostTrendItemBackend[] }>(
      '/api/qms/quality-costs/trend',
      {
        params: {
          start_date: params?.startDate,
          end_date: params?.endDate,
          period: params?.period,
        },
      }
    );
    const adaptedData = (response.data?.trend || []).map(adaptCostTrendItemToFrontend);
    return { ...response, data: adaptedData };
  },
};

// ============================================
// 8D Problem Solving API
// ============================================
export const eightDApi = {
  listEightDReports: async (): Promise<ApiResponse<EightDReport[]>> => {
    const response = await apiClient.qms.get<{ reports?: EightDReportBackend[] }>('/api/qms/eightd');
    const adaptedData = (response.data?.reports || []).map(adaptEightDReportToFrontend);
    return { ...response, data: adaptedData };
  },

  getEightDReport: async (id: string): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.get<EightDReportBackend>(`/api/qms/eightd/${id}`);
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : undefined,
    };
  },

  createEightDReport: async (
    data: CreateEightDReportRequest
  ): Promise<ApiResponse<EightDReport>> => {
    const backendData = adaptEightDReportToBackend(data);
    const response = await apiClient.qms.post<EightDReportBackend>('/api/qms/eightd', backendData);
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : undefined,
    };
  },

  updateEightDReport: async (
    id: string,
    data: Partial<CreateEightDReportRequest>
  ): Promise<ApiResponse<EightDReport>> => {
    const backendData: UpdateEightDReportRequestBackend = {
      title: data.title,
      problem_description: data.problemDescription,
      severity: data.severity,
      source: data.source,
      product_id: data.productId,
      product_name: data.productName,
      customer: data.customer,
      due_date: data.dueDate,
    };
    const response = await apiClient.qms.put<EightDReportBackend>(
      `/api/qms/eightd/${id}`,
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : undefined,
    };
  },

  deleteEightDReport: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/eightd/${id}`);
  },

  updateD1Team: async (
    id: string,
    data: { teamLeader?: string; teamMembers?: string[]; content?: string }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.put<EightDReportBackend>(
      `/api/qms/eightd/${id}/d1-team`,
      {
        team_leader: data.teamLeader,
        team_members: data.teamMembers,
        content: data.content,
      }
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : undefined,
    };
  },

  submitD3Containment: async (
    id: string,
    data: { content: string; operator?: string }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/api/qms/eightd/${id}/d3-containment`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : undefined,
    };
  },

  submitD4RootCause: async (
    id: string,
    data: { content: string; operator?: string }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/api/qms/eightd/${id}/d4-root-cause`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : undefined,
    };
  },

  submitD5PermanentAction: async (
    id: string,
    data: { content: string; operator?: string }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/api/qms/eightd/${id}/d5-permanent-action`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : undefined,
    };
  },

  verifyD6Effectiveness: async (
    id: string,
    data: { content: string; operator?: string; isEffective: boolean }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/api/qms/eightd/${id}/d6-verify`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : undefined,
    };
  },

  submitD7Preventive: async (
    id: string,
    data: { content: string; operator?: string }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/api/qms/eightd/${id}/d7-preventive`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : undefined,
    };
  },

  closeEightDReport: async (
    id: string,
    data: { content?: string; operator?: string }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/api/qms/eightd/${id}/close`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : undefined,
    };
  },

  getEightDAuditLogs: async (id: string): Promise<ApiResponse<EightDAuditLog[]>> => {
    const response = await apiClient.qms.get<{ logs?: EightDAuditLogBackend[] }>(
      `/api/qms/eightd/${id}/audit-logs`
    );
    const adaptedData = (response.data?.logs || []).map(adaptEightDAuditLogToFrontend);
    return { ...response, data: adaptedData };
  },
};

// ============================================
// FMEA API
// ============================================
export const fmeaApi = {
  listFmeaAnalyses: async (): Promise<ApiResponse<FmeaAnalysis[]>> => {
    const response = await apiClient.qms.get<{ fmeas?: FmeaAnalysisBackend[] }>('/api/qms/fmea');
    const adaptedData = (response.data?.fmeas || []).map(adaptFmeaAnalysisToFrontend);
    return { ...response, data: adaptedData };
  },

  getFmeaAnalysis: async (id: string): Promise<ApiResponse<FmeaAnalysis>> => {
    const response = await apiClient.qms.get<FmeaAnalysisBackend>(`/api/qms/fmea/${id}`);
    return {
      ...response,
      data: response.data ? adaptFmeaAnalysisToFrontend(response.data) : undefined,
    };
  },

  createFmeaAnalysis: async (
    data: CreateFmeaAnalysisRequest
  ): Promise<ApiResponse<FmeaAnalysis>> => {
    const backendData = adaptFmeaAnalysisToBackend(data);
    const response = await apiClient.qms.post<FmeaAnalysisBackend>('/api/qms/fmea', backendData);
    return {
      ...response,
      data: response.data ? adaptFmeaAnalysisToFrontend(response.data) : undefined,
    };
  },

  updateFmeaAnalysis: async (
    id: string,
    data: Partial<CreateFmeaAnalysisRequest>
  ): Promise<ApiResponse<FmeaAnalysis>> => {
    const backendData: UpdateFmeaAnalysisRequestBackend = {
      fmea_name: data.fmeaName,
      fmea_type: data.fmeaType,
      product_id: data.productId,
      product_name: data.productName,
      process_id: data.processId,
      process_name: data.processName,
      version: data.version,
      status: data.status,
      scope: data.scope,
      team_leader: data.teamLeader,
      team_members: data.teamMembers,
      description: data.description,
    };
    const response = await apiClient.qms.put<FmeaAnalysisBackend>(
      `/api/qms/fmea/${id}`,
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptFmeaAnalysisToFrontend(response.data) : undefined,
    };
  },

  deleteFmeaAnalysis: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/fmea/${id}`);
  },

  getFmeaStatistics: async (fmeaId: string): Promise<ApiResponse<FmeaStatistics>> => {
    const response = await apiClient.qms.get<FmeaStatisticsBackend>(
      `/api/qms/fmea/${fmeaId}/statistics`
    );
    return {
      ...response,
      data: response.data ? adaptFmeaStatisticsToFrontend(response.data) : undefined,
    };
  },

  listFmeaItems: async (fmeaId: string): Promise<ApiResponse<FmeaItem[]>> => {
    const response = await apiClient.qms.get<{ items?: FmeaItemBackend[] }>(
      `/api/qms/fmea-items?fmea_id=${fmeaId}`
    );
    const adaptedData = (response.data?.items || []).map(adaptFmeaItemToFrontend);
    return { ...response, data: adaptedData };
  },

  getFmeaItem: async (id: string): Promise<ApiResponse<FmeaItem>> => {
    const response = await apiClient.qms.get<FmeaItemBackend>(`/api/qms/fmea-items/${id}`);
    return {
      ...response,
      data: response.data ? adaptFmeaItemToFrontend(response.data) : undefined,
    };
  },

  createFmeaItem: async (
    data: Omit<FmeaItem, 'id' | 'rpn' | 'rpnRevised' | 'createdAt' | 'updatedAt' | 'actionsTaken' | 'severityRevised' | 'occurrenceRevised' | 'detectionRevised'>
  ): Promise<ApiResponse<FmeaItem>> => {
    const backendData = adaptFmeaItemToBackend(data);
    const response = await apiClient.qms.post<FmeaItemBackend>('/api/qms/fmea-items', backendData);
    return {
      ...response,
      data: response.data ? adaptFmeaItemToFrontend(response.data) : undefined,
    };
  },

  updateFmeaItem: async (
    id: string,
    data: Partial<Omit<FmeaItem, 'id' | 'fmeaId' | 'createdAt' | 'updatedAt' | 'rpn' | 'rpnRevised'>>
  ): Promise<ApiResponse<FmeaItem>> => {
    const backendData: UpdateFmeaItemRequestBackend = {
      function_description: data.functionDescription,
      failure_mode: data.failureMode,
      failure_effect: data.failureEffect,
      severity: data.severity,
      failure_cause: data.failureCause,
      occurrence: data.occurrence,
      current_controls: data.currentControls,
      detection: data.detection,
      recommended_actions: data.recommendedActions,
      responsibility: data.responsibility,
      target_date: data.targetDate,
      actions_taken: data.actionsTaken,
      severity_revised: data.severityRevised,
      occurrence_revised: data.occurrenceRevised,
      detection_revised: data.detectionRevised,
      status: data.status,
    };
    const response = await apiClient.qms.put<FmeaItemBackend>(
      `/api/qms/fmea-items/${id}`,
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptFmeaItemToFrontend(response.data) : undefined,
    };
  },

  deleteFmeaItem: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/fmea-items/${id}`);
  },
};

// ============================================
// Quality Dashboard API
// ============================================
export const qualityDashboardApi = {
  getQualityOverview: async (params?: {
    startDate?: string;
    endDate?: string;
    department?: string;
  }): Promise<ApiResponse<QualityOverview>> => {
    const response = await apiClient.qms.get<QualityOverviewBackend>(
      '/api/qms/quality-dashboard/overview',
      {
        params: {
          start_date: params?.startDate,
          end_date: params?.endDate,
          department: params?.department,
        },
      }
    );
    return {
      ...response,
      data: response.data ? adaptQualityOverviewToFrontend(response.data) : undefined,
    };
  },
};

// ============================================
// Data Sync API
// ============================================
export const syncApi = {
  listSyncRecords: async (params?: {
    syncType?: string;
    status?: string;
    sourceSystem?: string;
    targetSystem?: string;
  }): Promise<ApiResponse<SyncRecord[]>> => {
    const response = await apiClient.qms.get<{ records?: SyncRecordBackend[] }>(
      '/api/qms/sync-records',
      {
        params: {
          sync_type: params?.syncType,
          status: params?.status,
          source_system: params?.sourceSystem,
          target_system: params?.targetSystem,
        },
      }
    );
    const adaptedData = (response.data?.records || []).map(adaptSyncRecordToFrontend);
    return { ...response, data: adaptedData };
  },

  getSyncRecord: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    const response = await apiClient.qms.get<SyncRecordBackend>(`/api/qms/sync-records/${id}`);
    return {
      ...response,
      data: response.data ? adaptSyncRecordToFrontend(response.data) : undefined,
    };
  },

  deleteSyncRecord: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/sync-records/${id}`);
  },

  retrySync: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    const response = await apiClient.qms.post<SyncRecordBackend>(
      `/api/qms/sync-records/${id}/retry`,
      {}
    );
    return {
      ...response,
      data: response.data ? adaptSyncRecordToFrontend(response.data) : undefined,
    };
  },

  syncInspectionToLims: async (inspectionId: string): Promise<ApiResponse<SyncRecord>> => {
    const response = await apiClient.qms.post<SyncRecordBackend>(
      '/api/qms/sync/inspection-to-lims',
      { inspection_id: inspectionId }
    );
    return {
      ...response,
      data: response.data ? adaptSyncRecordToFrontend(response.data) : undefined,
    };
  },

  syncIssueToEhs: async (issueId: string): Promise<ApiResponse<SyncRecord>> => {
    const response = await apiClient.qms.post<SyncRecordBackend>('/api/qms/sync/issue-to-ehs', {
      issue_id: issueId,
    });
    return {
      ...response,
      data: response.data ? adaptSyncRecordToFrontend(response.data) : undefined,
    };
  },
};

// ============================================
// Corrective Actions API Extensions
// ============================================
export const correctiveActionApi = {
  completeAction: async (
    id: string,
    data: { verificationResult?: string; verifiedBy?: string; remark?: string }
  ): Promise<ApiResponse<QualityImprovement>> => {
    const response = await apiClient.qms.post<CorrectiveActionBackend>(
      `/api/qms/actions/${id}/complete`,
      {
        verification_result: data.verificationResult,
        verified_by: data.verifiedBy,
        remark: data.remark,
      }
    );
    return {
      ...response,
      data: response.data ? adaptActionToFrontend(response.data) : undefined,
    };
  },

  getActionItems: async (actionId: string): Promise<ApiResponse<ActionItem[]>> => {
    const response = await apiClient.qms.get<{ items?: ActionItemBackend[] }>(
      `/api/qms/actions/${actionId}/items`
    );
    const adaptedData = (response.data?.items || []).map(adaptActionItemToFrontend);
    return { ...response, data: adaptedData };
  },
};

// ============================================
// Audit API Extensions
// ============================================
export const auditApi = {
  startAuditPlan: async (id: string, operator?: string): Promise<ApiResponse<AuditPlan>> => {
    const response = await apiClient.qms.post<AuditPlan>(`/api/qms/audit-plans/${id}/start`, {
      operator,
    });
    return response;
  },

  completeAuditPlan: async (id: string, operator?: string): Promise<ApiResponse<AuditPlan>> => {
    const response = await apiClient.qms.post<AuditPlan>(`/api/qms/audit-plans/${id}/complete`, {
      operator,
    });
    return response;
  },

  createAuditTask: async (
    planId: string,
    data: Omit<AuditTask, 'id' | 'plan_id' | 'task_no' | 'created_at' | 'updated_at' | 'findings_count'>
  ): Promise<ApiResponse<AuditTask>> => {
    const response = await apiClient.qms.post<AuditTask>('/api/qms/audit-tasks', {
      plan_id: planId,
      title: data.title,
      description: data.description,
      status: data.status,
      assigned_to: data.assigned_to,
      assignee: data.assignee,
      priority: data.priority,
      due_date: data.due_date,
    });
    return response;
  },

  createAuditFinding: async (
    taskId: string,
    data: Omit<AuditFinding, 'id' | 'task_id' | 'finding_no' | 'created_at' | 'updated_at' | 'resolved_at'>
  ): Promise<ApiResponse<AuditFinding>> => {
    const response = await apiClient.qms.post<AuditFinding>('/api/qms/audit-findings', {
      task_id: taskId,
      title: data.title,
      description: data.description,
      severity: data.severity,
      category: data.category,
      status: data.status,
      recommendation: data.recommendation,
      assigned_to: data.assigned_to,
      due_date: data.due_date,
    });
    return response;
  },

  verifyAuditFinding: async (
    findingId: string,
    data: { result: string; verifier?: string; remark?: string }
  ): Promise<ApiResponse<AuditFinding>> => {
    const response = await apiClient.qms.post<AuditFinding>(
      `/api/qms/audit-findings/${findingId}/verify`,
      data
    );
    return response;
  },
};
