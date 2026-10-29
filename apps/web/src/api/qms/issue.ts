import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  QualityIssue,
  CreateQualityIssueRequest,
  QualityIssueBackend,
  UpdateQualityIssueRequestBackend,
  QmsPaginatedResponse,
} from './types';
import { adaptIssueToFrontend, adaptIssueToBackend } from './adapters';

export const issueApi = {
  listIssues: async (): Promise<ApiResponse<QualityIssue[]>> => {
    const response = await apiClient.qms.get<QmsPaginatedResponse<QualityIssueBackend>>('/issues');
    const raw = response.data;
    const rawIssues = Array.isArray(raw) ? raw : raw?.issues || raw?.list || raw?.items || [];
    const adaptedData = rawIssues.map(adaptIssueToFrontend);
    return { ...response, data: adaptedData };
  },

  getIssue: async (id: string): Promise<ApiResponse<QualityIssue | undefined>> => {
    const response = await apiClient.qms.get<QualityIssueBackend>(`/issues/${id}`);
    return {
      ...response,
      data: response.data ? adaptIssueToFrontend(response.data) : ({} as QualityIssue),
    };
  },

  createIssue: async (
    data: CreateQualityIssueRequest
  ): Promise<ApiResponse<QualityIssue | undefined>> => {
    const backendData = adaptIssueToBackend(data);
    const response = await apiClient.qms.post<QualityIssueBackend>('/issues', backendData);
    return {
      ...response,
      data: response.data ? adaptIssueToFrontend(response.data) : ({} as QualityIssue),
    };
  },

  updateIssue: async (
    id: string,
    data: CreateQualityIssueRequest
  ): Promise<ApiResponse<QualityIssue | undefined>> => {
    const backendData: UpdateQualityIssueRequestBackend = {
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: data.status,
      assigned_to: data.assignee,
    };
    const response = await apiClient.qms.put<QualityIssueBackend>(`/issues/${id}`, backendData);
    return {
      ...response,
      data: response.data ? adaptIssueToFrontend(response.data) : ({} as QualityIssue),
    };
  },

  deleteIssue: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/issues/${id}`);
  },

  // ── v74 to_bind 补绑（2026-10-29）──
  resolveIssue: async (id: string): Promise<ApiResponse<QualityIssue>> => {
    return apiClient.qms.post<QualityIssue>(`/issues/${id}/resolve`);
  },

  approveIssue: async (id: string): Promise<ApiResponse<QualityIssue>> => {
    return apiClient.qms.post<QualityIssue>(`/issues/${id}/approve`);
  },

  rejectIssue: async (id: string): Promise<ApiResponse<QualityIssue>> => {
    return apiClient.qms.post<QualityIssue>(`/issues/${id}/reject`);
  },

  cancelIssue: async (id: string): Promise<ApiResponse<QualityIssue>> => {
    return apiClient.qms.post<QualityIssue>(`/issues/${id}/cancel`);
  },
};
