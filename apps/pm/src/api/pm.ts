/**
 * PM (Project Management) API Client
 * 项目管理 API 客户端
 */

import { createRequest } from '@topems/shared-utils';
import type { PaginatedResponse } from '@topems/shared-types';

const api = createRequest('/api/pm');

const unwrap = <T,>(response: unknown): T => response as T;

const requestList = async <T,>(path: string, params?: Record<string, unknown>): Promise<PaginatedResponse<T>> => {
  const response = await api.get(path, { params });
  return unwrap<PaginatedResponse<T>>(response);
};

const requestItem = async <T,>(path: string): Promise<T> => {
  const response = await api.get(path);
  return unwrap<T>(response);
};

const requestVoid = async (path: string): Promise<void> => {
  await api.delete(path);
};

// ==================== Types ====================

/**
 * 项目
 */
export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  project_type: string;
  status: string;
  leader?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  progress: number;
  risk_level?: string;
  priority?: number;
  tags?: string[];
  parent_id?: string;
  workspace_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  code: string;
  description?: string;
  project_type: string;
  leader?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
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
  end_date?: string;
  budget?: number;
  progress?: number;
  risk_level?: string;
  priority?: number;
  tags?: string[];
}

export interface ProjectQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  project_type?: string;
  status?: string;
}

/**
 * 任务（项目阶段/任务）
 */
export interface Task {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  sequence_number: number;
  start_date?: string;
  end_date?: string;
  progress: number;
  status: string;
  predecessor_ids?: string[];
  assignee?: string;
  priority?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskRequest {
  project_id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  predecessor_ids?: string[];
  assignee?: string;
  priority?: string;
}

export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  sequence_number?: number;
  start_date?: string;
  end_date?: string;
  progress?: number;
  status?: string;
  predecessor_ids?: string[];
  assignee?: string;
  priority?: string;
}

export interface TaskQueryParams {
  page?: number;
  pageSize?: number;
  project_id?: string;
  status?: string;
  search?: string;
}

/**
 * 里程碑
 */
export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  date: string;
  status: string;
  phase_id?: string;
  acceptance_criteria?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMilestoneRequest {
  project_id: string;
  name: string;
  description?: string;
  date: string;
  phase_id?: string;
  acceptance_criteria?: string;
}

export interface UpdateMilestoneRequest {
  name?: string;
  description?: string;
  date?: string;
  status?: string;
  phase_id?: string;
  acceptance_criteria?: string;
}

export interface MilestoneQueryParams {
  page?: number;
  pageSize?: number;
  project_id?: string;
  status?: string;
}

/**
 * 甘特图
 */
export interface GanttPhase {
  id: string;
  name: string;
  project_id: string;
  start_date?: string;
  end_date?: string;
  progress: number;
  status: string;
  predecessor_ids: string[];
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
  assignments: Record<string, unknown>[];
}

export interface ProjectGanttResponse {
  phases: GanttPhase[];
  milestones: GanttMilestone[];
  resources: GanttResource[];
}

/**
 * 风险/问题
 */
export interface Risk {
  id: string;
  project_id: string;
  risk_code?: string;
  risk_name: string;
  risk_description?: string;
  risk_category?: string;
  risk_subcategory?: string;
  likelihood: string;
  impact: string;
  level?: string;
  risk_score: number;
  status?: string;
  mitigation_strategy?: string;
  contingency_plan?: string;
  trigger_condition?: string;
  warning_threshold: number;
  owner?: string;
  response_due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  project_id: string;
  issue_code?: string;
  title: string;
  description?: string;
  severity: string;
  priority: string;
  status: string;
  assignee?: string;
  reported_by?: string;
  due_date?: string;
  resolution?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRiskRequest {
  project_id: string;
  risk_code?: string;
  risk_name: string;
  risk_description?: string;
  risk_category?: string;
  risk_subcategory?: string;
  likelihood: string;
  impact: string;
  risk_score: number;
  mitigation_strategy?: string;
  contingency_plan?: string;
  trigger_condition?: string;
  warning_threshold?: number;
  owner?: string;
  response_due_date?: string;
}

export interface UpdateRiskRequest {
  risk_name?: string;
  risk_description?: string;
  risk_category?: string;
  likelihood?: string;
  impact?: string;
  risk_score?: number;
  status?: string;
  mitigation_strategy?: string;
  contingency_plan?: string;
  owner?: string;
  response_due_date?: string;
}

export interface RiskQueryParams {
  page?: number;
  pageSize?: number;
  project_id?: string;
  status?: string;
  severity?: string;
}

/**
 * 合同
 */
export interface Contract {
  id: string;
  project_id?: string;
  contract_code: string;
  contract_name: string;
  contract_type: string;
  contract_category?: string;
  party_a_name?: string;
  party_a_id?: string;
  party_b_name?: string;
  party_b_id?: string;
  amount: number;
  currency?: string;
  tax_rate?: number;
  signing_date?: string;
  effective_date?: string;
  end_date?: string;
  status?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContractRequest {
  project_id?: string;
  contract_code: string;
  contract_name: string;
  contract_type: string;
  contract_category?: string;
  party_a_name?: string;
  party_a_id?: string;
  party_b_name?: string;
  party_b_id?: string;
  amount: number;
  currency?: string;
  tax_rate?: number;
  signing_date?: string;
  effective_date?: string;
  end_date?: string;
  description?: string;
}

export interface UpdateContractRequest {
  contract_name?: string;
  contract_category?: string;
  party_a_name?: string;
  party_b_name?: string;
  amount?: number;
  currency?: string;
  signing_date?: string;
  effective_date?: string;
  end_date?: string;
  status?: string;
  description?: string;
}

export interface ContractQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  project_id?: string;
  contract_type?: string;
  status?: string;
}

/**
 * 报表
 */
export interface ProjectReport {
  id: string;
  project_id: string;
  report_code?: string;
  report_name: string;
  report_type: string;
  report_period?: string;
  status?: string;
  generated_at?: string;
  data?: Record<string, unknown>;
  summary?: string;
  generated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReportRequest {
  project_id: string;
  report_code?: string;
  report_name: string;
  report_type: string;
  report_period?: string;
  generated_by?: string;
}

export interface UpdateReportRequest {
  report_name?: string;
  report_type?: string;
  report_period?: string;
  status?: string;
  summary?: string;
}

export interface ReportQueryParams {
  page?: number;
  pageSize?: number;
  project_id?: string;
  report_type?: string;
  status?: string;
}

/**
 * 仪表盘汇总
 */
export interface PmDashboardSummary {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  pending_projects: number;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  total_contracts: number;
  active_contracts: number;
  total_risks: number;
  high_risks: number;
  total_milestones: number;
  upcoming_milestones: number;
  total_budget: number;
  spent_budget: number;
}

// ==================== Project API ====================

const projectApi = {
  list: (params?: ProjectQueryParams) =>
    requestList<Project>('/projects', params as Record<string, unknown>),
  get: (id: string) => requestItem<Project>(`/projects/${id}`),
  create: async (data: CreateProjectRequest): Promise<Project> => {
    const response = await api.post('/projects', data);
    return unwrap<Project>(response);
  },
  update: async (id: string, data: UpdateProjectRequest): Promise<Project> => {
    const response = await api.put(`/projects/${id}`, data);
    return unwrap<Project>(response);
  },
  delete: (id: string) => requestVoid(`/projects/${id}`),
  batchDelete: async (ids: string[]): Promise<void> => {
    await api.post('/projects/batch-delete', { ids });
  },
};

// ==================== Task API ====================

const taskApi = {
  list: (params?: TaskQueryParams) => requestList<Task>('/tasks', params as Record<string, unknown>),
  get: (id: string) => requestItem<Task>(`/tasks/${id}`),
  create: async (data: CreateTaskRequest): Promise<Task> => {
    const response = await api.post('/tasks', data);
    return unwrap<Task>(response);
  },
  update: async (id: string, data: UpdateTaskRequest): Promise<Task> => {
    const response = await api.put(`/tasks/${id}`, data);
    return unwrap<Task>(response);
  },
  delete: (id: string) => requestVoid(`/tasks/${id}`),
  batchDelete: async (ids: string[]): Promise<void> => {
    await api.post('/tasks/batch-delete', { ids });
  },
};

// ==================== Milestone API ====================

const milestoneApi = {
  list: (params?: MilestoneQueryParams) =>
    requestList<Milestone>('/milestones', params as Record<string, unknown>),
  get: (id: string) => requestItem<Milestone>(`/milestones/${id}`),
  create: async (data: CreateMilestoneRequest): Promise<Milestone> => {
    const response = await api.post('/milestones', data);
    return unwrap<Milestone>(response);
  },
  update: async (id: string, data: UpdateMilestoneRequest): Promise<Milestone> => {
    const response = await api.put(`/milestones/${id}`, data);
    return unwrap<Milestone>(response);
  },
  delete: (id: string) => requestVoid(`/milestones/${id}`),
};

// ==================== Gantt API ====================

const ganttApi = {
  /**
   * 获取项目甘特图
   */
  getProjectGantt: (projectId: string) =>
    requestItem<ProjectGanttResponse>(`/projects/${projectId}/gantt`),
  /**
   * 更新甘特图任务（阶段）
   */
  updatePhase: async (
    projectId: string,
    phaseId: string,
    data: UpdateTaskRequest
  ): Promise<Task> => {
    const response = await api.put(`/projects/${projectId}/phases/${phaseId}`, data);
    return unwrap<Task>(response);
  },
};

// ==================== Risk/Issue API ====================

const riskApi = {
  list: (params?: RiskQueryParams) => requestList<Risk>('/risks', params as Record<string, unknown>),
  get: (id: string) => requestItem<Risk>(`/risks/${id}`),
  create: async (data: CreateRiskRequest): Promise<Risk> => {
    const response = await api.post('/risks', data);
    return unwrap<Risk>(response);
  },
  update: async (id: string, data: UpdateRiskRequest): Promise<Risk> => {
    const response = await api.put(`/risks/${id}`, data);
    return unwrap<Risk>(response);
  },
  delete: (id: string) => requestVoid(`/risks/${id}`),
  listIssues: (projectId: string) =>
    requestList<Issue>(`/projects/${projectId}/issues`),
  createIssue: async (projectId: string, data: Partial<Issue>): Promise<Issue> => {
    const response = await api.post(`/projects/${projectId}/issues`, data);
    return unwrap<Issue>(response);
  },
  updateIssue: async (id: string, data: Partial<Issue>): Promise<Issue> => {
    const response = await api.put(`/issues/${id}`, data);
    return unwrap<Issue>(response);
  },
};

// ==================== Contract API ====================

const contractApi = {
  list: (params?: ContractQueryParams) =>
    requestList<Contract>('/contracts', params as Record<string, unknown>),
  get: (id: string) => requestItem<Contract>(`/contracts/${id}`),
  create: async (data: CreateContractRequest): Promise<Contract> => {
    const response = await api.post('/contracts', data);
    return unwrap<Contract>(response);
  },
  update: async (id: string, data: UpdateContractRequest): Promise<Contract> => {
    const response = await api.put(`/contracts/${id}`, data);
    return unwrap<Contract>(response);
  },
  delete: (id: string) => requestVoid(`/contracts/${id}`),
  submit: async (id: string): Promise<Contract> => {
    const response = await api.post(`/contracts/${id}/submit`);
    return unwrap<Contract>(response);
  },
  approve: async (id: string): Promise<Contract> => {
    const response = await api.post(`/contracts/${id}/approve`);
    return unwrap<Contract>(response);
  },
};

// ==================== Report API ====================

const reportApi = {
  list: (params?: ReportQueryParams) =>
    requestList<ProjectReport>('/reports', params as Record<string, unknown>),
  get: (id: string) => requestItem<ProjectReport>(`/reports/${id}`),
  create: async (data: CreateReportRequest): Promise<ProjectReport> => {
    const response = await api.post('/reports', data);
    return unwrap<ProjectReport>(response);
  },
  update: async (id: string, data: UpdateReportRequest): Promise<ProjectReport> => {
    const response = await api.put(`/reports/${id}`, data);
    return unwrap<ProjectReport>(response);
  },
  delete: (id: string) => requestVoid(`/reports/${id}`),
  generate: async (data: CreateReportRequest): Promise<ProjectReport> => {
    const response = await api.post('/reports/generate', data);
    return unwrap<ProjectReport>(response);
  },
};

// ==================== Dashboard API ====================

const dashboardApi = {
  summary: () => requestItem<PmDashboardSummary>('/dashboard/summary'),
  statistics: () => requestItem<PmDashboardSummary>('/statistics'),
};

// ==================== PM API Export ====================

/**
 * PM API 统一导出
 */
export const pmApi = {
  projects: projectApi,
  tasks: taskApi,
  milestones: milestoneApi,
  gantt: ganttApi,
  risks: riskApi,
  contracts: contractApi,
  reports: reportApi,
  dashboard: dashboardApi,

  /**
   * 健康检查
   */
  health: async (): Promise<string> => {
    const response = await api.get('/health');
    return unwrap<string>(response);
  },
};

// 导出独立的 API 对象供直接使用
export {
  projectApi,
  taskApi,
  milestoneApi,
  ganttApi,
  riskApi,
  contractApi,
  reportApi,
  dashboardApi,
};
