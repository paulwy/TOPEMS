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
    const adaptedData = (response.data?.issues || []).map(adaptIssueToFrontend);
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
};
