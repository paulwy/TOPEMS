import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  ApqpProject,
  CreateApqpProjectRequest,
  UpdateApqpProjectRequest,
  ApqpPhase,
  ApqpTask,
  ApqpRisk,
  ApqpProgressStatistics,
  ApqpApproval,
} from './types';

export const apqpApi = {
  // APQP Projects
  listApqpProjects: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    product_name?: string;
  }): Promise<ApiResponse<ApqpProject[]>> => {
    const response = await apiClient.qms.get<ApqpProject[]>('/api/qms/apqp/projects', { params });
    return response;
  },

  getApqpProject: async (id: string): Promise<ApiResponse<ApqpProject>> => {
    return apiClient.qms.get<ApqpProject>(`/api/qms/apqp/projects/${id}`);
  },

  createApqpProject: async (data: CreateApqpProjectRequest): Promise<ApiResponse<ApqpProject>> => {
    return apiClient.qms.post<ApqpProject>('/api/qms/apqp/projects', data);
  },

  updateApqpProject: async (
    id: string,
    data: UpdateApqpProjectRequest
  ): Promise<ApiResponse<ApqpProject>> => {
    return apiClient.qms.put<ApqpProject>(`/api/qms/apqp/projects/${id}`, data);
  },

  deleteApqpProject: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/apqp/projects/${id}`);
  },

  transitionApqpStatus: async (
    id: string,
    data: { target_status: string; operator: string; comment?: string }
  ): Promise<ApiResponse<ApqpProject>> => {
    return apiClient.qms.post<ApqpProject>(`/api/qms/apqp/projects/${id}/transition`, data);
  },

  getApqpProgress: async (id: string): Promise<ApiResponse<ApqpProgressStatistics>> => {
    return apiClient.qms.get<ApqpProgressStatistics>(`/api/qms/apqp/projects/${id}/progress`);
  },

  // APQP Phases
  listApqpPhases: async (projectId?: string): Promise<ApiResponse<ApqpPhase[]>> => {
    const url = projectId ? `/api/qms/apqp/phases?project_id=${projectId}` : '/api/qms/apqp/phases';
    return apiClient.qms.get<ApqpPhase[]>(url);
  },

  getApqpPhase: async (id: string): Promise<ApiResponse<ApqpPhase>> => {
    return apiClient.qms.get<ApqpPhase>(`/api/qms/apqp/phases/${id}`);
  },

  createApqpPhase: async (data: {
    project_id: string;
    phase_code: string;
    phase_name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    sort_order?: number;
  }): Promise<ApiResponse<ApqpPhase>> => {
    return apiClient.qms.post<ApqpPhase>('/api/qms/apqp/phases', data);
  },

  updateApqpPhase: async (
    id: string,
    data: Partial<ApqpPhase>
  ): Promise<ApiResponse<ApqpPhase>> => {
    return apiClient.qms.put<ApqpPhase>(`/api/qms/apqp/phases/${id}`, data);
  },

  deleteApqpPhase: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/apqp/phases/${id}`);
  },

  // APQP Tasks
  listApqpTasks: async (params?: {
    project_id?: string;
    phase_id?: string;
    status?: string;
    assignee?: string;
  }): Promise<ApiResponse<ApqpTask[]>> => {
    return apiClient.qms.get<ApqpTask[]>('/api/qms/apqp/tasks', { params });
  },

  getApqpTask: async (id: string): Promise<ApiResponse<ApqpTask>> => {
    return apiClient.qms.get<ApqpTask>(`/api/qms/apqp/tasks/${id}`);
  },

  createApqpTask: async (data: {
    project_id: string;
    phase_id: string;
    task_name: string;
    description?: string;
    task_type?: string;
    deliverable?: string;
    assignee?: string;
    due_date?: string;
    sort_order?: number;
  }): Promise<ApiResponse<ApqpTask>> => {
    return apiClient.qms.post<ApqpTask>('/api/qms/apqp/tasks', data);
  },

  updateApqpTask: async (id: string, data: Partial<ApqpTask>): Promise<ApiResponse<ApqpTask>> => {
    return apiClient.qms.put<ApqpTask>(`/api/qms/apqp/tasks/${id}`, data);
  },

  deleteApqpTask: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/apqp/tasks/${id}`);
  },

  // APQP Risks
  listApqpRisks: async (params?: {
    project_id?: string;
    status?: string;
    min_rpn?: number;
  }): Promise<ApiResponse<ApqpRisk[]>> => {
    return apiClient.qms.get<ApqpRisk[]>('/api/qms/apqp/risks', { params });
  },

  getApqpRisk: async (id: string): Promise<ApiResponse<ApqpRisk>> => {
    return apiClient.qms.get<ApqpRisk>(`/api/qms/apqp/risks/${id}`);
  },

  createApqpRisk: async (data: {
    project_id: string;
    risk_name: string;
    description?: string;
    risk_category?: string;
    severity: number;
    occurrence: number;
    detection: number;
    mitigation_plan?: string;
    responsible?: string;
    target_date?: string;
  }): Promise<ApiResponse<ApqpRisk>> => {
    return apiClient.qms.post<ApqpRisk>('/api/qms/apqp/risks', data);
  },

  updateApqpRisk: async (id: string, data: Partial<ApqpRisk>): Promise<ApiResponse<ApqpRisk>> => {
    return apiClient.qms.put<ApqpRisk>(`/api/qms/apqp/risks/${id}`, data);
  },

  deleteApqpRisk: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/apqp/risks/${id}`);
  },

  // APQP Approvals
  listApqpApprovals: async (projectId?: string): Promise<ApiResponse<ApqpApproval[]>> => {
    const url = projectId
      ? `/api/qms/apqp/approvals?project_id=${projectId}`
      : '/api/qms/apqp/approvals';
    return apiClient.qms.get<ApqpApproval[]>(url);
  },

  createApqpApproval: async (data: {
    project_id: string;
    approval_type: string;
    applicant?: string;
    comment?: string;
  }): Promise<ApiResponse<ApqpApproval>> => {
    return apiClient.qms.post<ApqpApproval>('/api/qms/apqp/approvals', data);
  },

  processApqpApproval: async (
    id: string,
    data: { approver: string; approved: boolean; comment?: string }
  ): Promise<ApiResponse<ApqpApproval>> => {
    return apiClient.qms.post<ApqpApproval>(`/api/qms/apqp/approvals/${id}/process`, data);
  },
};
