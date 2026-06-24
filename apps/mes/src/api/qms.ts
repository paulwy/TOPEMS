/**
 * QMS (Quality Management System) API Client
 * 质量管理系统 API 客户端
 *
 * 包含质量标准、质量检查、质量问题、改进措施、审核计划、EHS 安全检查等业务模块
 */

import { createRequest } from '@topems/shared-utils';
import type { PaginatedResponse } from '@topems/shared-types';

const qmsApi = createRequest('/api/qms');
const ehsApi = createRequest('/api/ehs');

const unwrap = <T,>(response: unknown): T => response as T;

const requestList = async <T,>(
  api: ReturnType<typeof createRequest>,
  path: string,
  params?: Record<string, unknown>
): Promise<PaginatedResponse<T>> => {
  const response = await api.get(path, { params });
  return unwrap<PaginatedResponse<T>>(response);
};

const requestItem = async <T,>(
  api: ReturnType<typeof createRequest>,
  path: string
): Promise<T> => {
  const response = await api.get(path);
  return unwrap<T>(response);
};

const requestVoid = async (
  api: ReturnType<typeof createRequest>,
  path: string
): Promise<void> => {
  await api.delete(path);
};

// ==================== QMS Types ====================

/**
 * 质量标准
 */
export interface QualityStandard {
  id: string;
  name: string;
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

export interface UpdateQualityStandardRequest {
  name?: string;
  category?: string;
  version?: string;
  description?: string;
  content?: string;
  status?: string;
}

export interface QualityStandardQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  category?: string;
}

/**
 * 质量检查
 */
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

export interface UpdateQualityCheckRequest {
  inspection_type?: string;
  product_name?: string;
  standard_id?: string;
  quantity?: number;
}

export interface QualityCheckQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  inspection_type?: string;
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

export interface SubmitInspectionResultRequest {
  qualified_quantity: number;
  unqualified_quantity: number;
  qualification_rate?: number;
  result?: string;
  memo?: string;
  inspector: string;
  results?: InspectionResult[];
}

/**
 * 质量问题
 */
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

export interface UpdateQualityIssueRequest {
  title?: string;
  description?: string;
  severity?: string;
  category?: string;
  status?: string;
  assignee?: string;
  resolution?: string;
}

export interface QualityIssueQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  severity?: string;
}

/**
 * 质量改进
 */
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

export interface UpdateQualityImprovementRequest {
  title?: string;
  description?: string;
  category?: string;
  status?: string;
  assignee?: string;
  improvement_effect?: string;
}

/**
 * QMS 统计
 */
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

// ==================== EHS Types ====================

/**
 * 安全检查
 */
export interface SafetyCheck {
  id: string;
  check_no: string;
  check_type: string;
  inspector: string;
  check_date: string | null;
  location: string | null;
  result: string;
  issues: string[];
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSafetyCheckRequest {
  check_no: string;
  check_type: string;
  inspector: string;
  check_date?: string | null;
  location?: string | null;
  result: string;
  issues: string[];
  status: string;
}

export interface UpdateSafetyCheckRequest {
  check_type?: string;
  inspector?: string;
  check_date?: string | null;
  location?: string | null;
  result?: string;
  issues?: string[];
  status?: string;
}

export interface SafetyCheckQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  check_type?: string;
}

/**
 * 检查计划
 */
export interface InspectionPlan {
  id: string;
  plan_no: string;
  title: string;
  description: string | null;
  inspection_type: string;
  frequency: string;
  start_date: string | null;
  end_date: string | null;
  inspector: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateInspectionPlanRequest {
  title: string;
  description?: string | null;
  inspection_type: string;
  frequency: string;
  start_date?: string | null;
  end_date?: string | null;
  inspector?: string | null;
}

export interface InspectionPlanQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

/**
 * 检查记录
 */
export interface InspectionRecord {
  id: string;
  record_no: string;
  plan_id: string | null;
  title: string;
  inspection_type: string;
  location: string | null;
  inspector: string | null;
  inspected_at: string | null;
  result: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface EhsInspectionRecordQueryParams {
  page?: number;
  pageSize?: number;
  plan_id?: string;
  check_id?: string;
  status?: string;
}

/**
 * EHS 统计
 */
export interface EhsStatistics {
  total_checks: number;
  pending_checks: number;
  completed_checks: number;
  failed_checks: number;
  total_plans: number;
  active_plans: number;
  total_records: number;
  total_issues: number;
  open_issues: number;
  closed_issues: number;
  high_risk_issues: number;
}

// ==================== Quality Standard API ====================

const qualityStandardApi = {
  list: (params?: QualityStandardQueryParams) =>
    requestList<QualityStandard>(qmsApi, '/standards', params as Record<string, unknown>),
  get: (id: string) => requestItem<QualityStandard>(qmsApi, `/standards/${id}`),
  create: async (data: CreateQualityStandardRequest): Promise<QualityStandard> => {
    const response = await qmsApi.post('/standards', data);
    return unwrap<QualityStandard>(response);
  },
  update: async (
    id: string,
    data: UpdateQualityStandardRequest
  ): Promise<QualityStandard> => {
    const response = await qmsApi.put(`/standards/${id}`, data);
    return unwrap<QualityStandard>(response);
  },
  delete: (id: string) => requestVoid(qmsApi, `/standards/${id}`),
};

// ==================== Quality Check API ====================

const qualityCheckApi = {
  list: (params?: QualityCheckQueryParams) =>
    requestList<QualityCheck>(qmsApi, '/checks', params as Record<string, unknown>),
  get: (id: string) => requestItem<QualityCheck>(qmsApi, `/checks/${id}`),
  create: async (data: CreateQualityCheckRequest): Promise<QualityCheck> => {
    const response = await qmsApi.post('/checks', data);
    return unwrap<QualityCheck>(response);
  },
  update: async (id: string, data: UpdateQualityCheckRequest): Promise<QualityCheck> => {
    const response = await qmsApi.put(`/checks/${id}`, data);
    return unwrap<QualityCheck>(response);
  },
  delete: (id: string) => requestVoid(qmsApi, `/checks/${id}`),
  submitResult: async (
    id: string,
    data: SubmitInspectionResultRequest
  ): Promise<QualityCheck> => {
    const response = await qmsApi.post(`/checks/${id}/submit`, data);
    return unwrap<QualityCheck>(response);
  },
  getResults: async (id: string): Promise<InspectionResult[]> => {
    const response = await qmsApi.get(`/checks/${id}/results`);
    const data = unwrap<{ results?: InspectionResult[] }>(response);
    return data.results || [];
  },
};

// ==================== Quality Issue API ====================

const qualityIssueApi = {
  list: (params?: QualityIssueQueryParams) =>
    requestList<QualityIssue>(qmsApi, '/issues', params as Record<string, unknown>),
  get: (id: string) => requestItem<QualityIssue>(qmsApi, `/issues/${id}`),
  create: async (data: CreateQualityIssueRequest): Promise<QualityIssue> => {
    const response = await qmsApi.post('/issues', data);
    return unwrap<QualityIssue>(response);
  },
  update: async (id: string, data: UpdateQualityIssueRequest): Promise<QualityIssue> => {
    const response = await qmsApi.put(`/issues/${id}`, data);
    return unwrap<QualityIssue>(response);
  },
  delete: (id: string) => requestVoid(qmsApi, `/issues/${id}`),
};

// ==================== Quality Improvement API ====================

const qualityImprovementApi = {
  list: (params?: { page?: number; pageSize?: number; search?: string }) =>
    requestList<QualityImprovement>(
      qmsApi,
      '/improvements',
      params as Record<string, unknown>
    ),
  get: (id: string) => requestItem<QualityImprovement>(qmsApi, `/improvements/${id}`),
  create: async (
    data: CreateQualityImprovementRequest
  ): Promise<QualityImprovement> => {
    const response = await qmsApi.post('/improvements', data);
    return unwrap<QualityImprovement>(response);
  },
  update: async (
    id: string,
    data: UpdateQualityImprovementRequest
  ): Promise<QualityImprovement> => {
    const response = await qmsApi.put(`/improvements/${id}`, data);
    return unwrap<QualityImprovement>(response);
  },
  delete: (id: string) => requestVoid(qmsApi, `/improvements/${id}`),
};

// ==================== EHS Safety Check API ====================

const safetyCheckApi = {
  list: (params?: SafetyCheckQueryParams) =>
    requestList<SafetyCheck>(ehsApi, '/checks', params as Record<string, unknown>),
  get: (id: string) => requestItem<SafetyCheck>(ehsApi, `/checks/${id}`),
  create: async (data: CreateSafetyCheckRequest): Promise<SafetyCheck> => {
    const response = await ehsApi.post('/checks', data);
    return unwrap<SafetyCheck>(response);
  },
  update: async (id: string, data: UpdateSafetyCheckRequest): Promise<SafetyCheck> => {
    const response = await ehsApi.put(`/checks/${id}`, data);
    return unwrap<SafetyCheck>(response);
  },
  delete: (id: string) => requestVoid(ehsApi, `/checks/${id}`),
};

// ==================== EHS Inspection Plan API ====================

const inspectionPlanApi = {
  list: (params?: InspectionPlanQueryParams) =>
    requestList<InspectionPlan>(ehsApi, '/checks/plans', params as Record<string, unknown>),
  get: (id: string) => requestItem<InspectionPlan>(ehsApi, `/checks/plans/${id}`),
  create: async (data: CreateInspectionPlanRequest): Promise<InspectionPlan> => {
    const response = await ehsApi.post('/checks/plans', data);
    return unwrap<InspectionPlan>(response);
  },
  update: async (
    id: string,
    data: Partial<CreateInspectionPlanRequest>
  ): Promise<InspectionPlan> => {
    const response = await ehsApi.put(`/checks/plans/${id}`, data);
    return unwrap<InspectionPlan>(response);
  },
  delete: (id: string) => requestVoid(ehsApi, `/checks/plans/${id}`),
};

// ==================== EHS Inspection Record API ====================

const ehsInspectionRecordApi = {
  list: (params?: EhsInspectionRecordQueryParams) =>
    requestList<InspectionRecord>(ehsApi, '/checks/records', params as Record<string, unknown>),
  get: (id: string) => requestItem<InspectionRecord>(ehsApi, `/checks/records/${id}`),
};

// ==================== Dashboard API ====================

const dashboardApi = {
  getQmsStatistics: () => requestItem<QmsStatistics>(qmsApi, '/statistics'),
  getEhsStatistics: () => requestItem<EhsStatistics>(ehsApi, '/statistics'),
};

// ==================== QMS API Export ====================

/**
 * QMS API 统一导出
 */
export const qmsApiClient = {
  standards: qualityStandardApi,
  checks: qualityCheckApi,
  issues: qualityIssueApi,
  improvements: qualityImprovementApi,
  dashboard: dashboardApi,

  /**
   * 健康检查
   */
  health: async (): Promise<string> => {
    const response = await qmsApi.get('/health');
    return unwrap<string>(response);
  },
};

// 导出独立的 QMS API 对象
export {
  qualityStandardApi,
  qualityCheckApi,
  qualityIssueApi,
  qualityImprovementApi,
  dashboardApi as qmsDashboardApi,
};

/**
 * EHS API 统一导出
 */
export const ehsApiClient = {
  safetyChecks: safetyCheckApi,
  inspectionPlans: inspectionPlanApi,
  inspectionRecords: ehsInspectionRecordApi,

  /**
   * 健康检查
   */
  health: async (): Promise<string> => {
    const response = await ehsApi.get('/health');
    return unwrap<string>(response);
  },
};

// 导出独立的 EHS API 对象
export {
  safetyCheckApi,
  inspectionPlanApi,
  ehsInspectionRecordApi,
};
