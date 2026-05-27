import apiClient from './client';
import type { ApiResponse } from './client';

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
}

export const qmsApi = {
  // Quality Standards
  listStandards: async (): Promise<ApiResponse<QualityStandard[]>> => {
    return apiClient.qms.get<QualityStandard[]>('/api/v1/standards');
  },
  getStandard: async (id: string): Promise<ApiResponse<QualityStandard>> => {
    return apiClient.qms.get<QualityStandard>(`/api/v1/standards/${id}`);
  },
  createStandard: async (data: CreateQualityStandardRequest): Promise<ApiResponse<QualityStandard>> => {
    return apiClient.qms.post<QualityStandard>('/api/v1/standards', data);
  },
  updateStandard: async (id: string, data: CreateQualityStandardRequest): Promise<ApiResponse<QualityStandard>> => {
    return apiClient.qms.put<QualityStandard>(`/api/v1/standards/${id}`, data);
  },
  deleteStandard: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/v1/standards/${id}`);
  },

  // Quality Checks
  listChecks: async (): Promise<ApiResponse<QualityCheck[]>> => {
    return apiClient.qms.get<QualityCheck[]>('/api/v1/checks');
  },
  getCheck: async (id: string): Promise<ApiResponse<QualityCheck>> => {
    return apiClient.qms.get<QualityCheck>(`/api/v1/checks/${id}`);
  },
  createCheck: async (data: CreateQualityCheckRequest): Promise<ApiResponse<QualityCheck>> => {
    return apiClient.qms.post<QualityCheck>('/api/v1/checks', data);
  },
  updateCheck: async (id: string, data: CreateQualityCheckRequest): Promise<ApiResponse<QualityCheck>> => {
    return apiClient.qms.put<QualityCheck>(`/api/v1/checks/${id}`, data);
  },
  deleteCheck: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/v1/checks/${id}`);
  },

  // Quality Issues
  listIssues: async (): Promise<ApiResponse<QualityIssue[]>> => {
    return apiClient.qms.get<QualityIssue[]>('/api/v1/issues');
  },
  getIssue: async (id: string): Promise<ApiResponse<QualityIssue>> => {
    return apiClient.qms.get<QualityIssue>(`/api/v1/issues/${id}`);
  },
  createIssue: async (data: CreateQualityIssueRequest): Promise<ApiResponse<QualityIssue>> => {
    return apiClient.qms.post<QualityIssue>('/api/v1/issues', data);
  },
  updateIssue: async (id: string, data: CreateQualityIssueRequest): Promise<ApiResponse<QualityIssue>> => {
    return apiClient.qms.put<QualityIssue>(`/api/v1/issues/${id}`, data);
  },
  deleteIssue: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/v1/issues/${id}`);
  },

  // Quality Improvements
  listImprovements: async (): Promise<ApiResponse<QualityImprovement[]>> => {
    return apiClient.qms.get<QualityImprovement[]>('/api/v1/improvements');
  },
  getImprovement: async (id: string): Promise<ApiResponse<QualityImprovement>> => {
    return apiClient.qms.get<QualityImprovement>(`/api/v1/improvements/${id}`);
  },
  createImprovement: async (data: CreateQualityImprovementRequest): Promise<ApiResponse<QualityImprovement>> => {
    return apiClient.qms.post<QualityImprovement>('/api/v1/improvements', data);
  },
  updateImprovement: async (id: string, data: CreateQualityImprovementRequest): Promise<ApiResponse<QualityImprovement>> => {
    return apiClient.qms.put<QualityImprovement>(`/api/v1/improvements/${id}`, data);
  },
  deleteImprovement: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/v1/improvements/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.qms.get<string>('/health');
  },
};
