import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateRectificationRequest,
  CreateSafetyIssueRequest,
  CreateVerificationRequest,
  ListQueryParams,
  PaginatedResponse,
  Rectification,
  SafetyIssue,
  SafetyIssueDetail,
  UpdateRectificationRequest,
  Verification,
} from './types';

export const safetyIssueApi = {
  listSafetyIssues: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SafetyIssue>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<SafetyIssue>>(`/issues?${queryParams.toString()}`);
  },

  getSafetyIssue: async (id: string): Promise<ApiResponse<SafetyIssueDetail>> => {
    return apiClient.ehs.get<SafetyIssueDetail>(`/issues/${id}`);
  },

  createSafetyIssue: async (data: CreateSafetyIssueRequest): Promise<ApiResponse<SafetyIssue>> => {
    return apiClient.ehs.post<SafetyIssue>('/issues', data);
  },

  updateSafetyIssue: async (
    id: string,
    data: Partial<CreateSafetyIssueRequest>
  ): Promise<ApiResponse<SafetyIssue>> => {
    return apiClient.ehs.put<SafetyIssue>(`/issues/${id}`, data);
  },

  deleteSafetyIssue: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/issues/${id}`);
  },

  startRectification: async (
    issueId: string,
    data: CreateRectificationRequest
  ): Promise<ApiResponse<Rectification>> => {
    return apiClient.ehs.post<Rectification>(`/issues/${issueId}/rectification`, data);
  },

  updateRectification: async (
    issueId: string,
    data: UpdateRectificationRequest
  ): Promise<ApiResponse<Rectification>> => {
    return apiClient.ehs.put<Rectification>(`/issues/${issueId}/rectification`, data);
  },

  submitRectification: async (issueId: string): Promise<ApiResponse<Rectification>> => {
    return apiClient.ehs.post<Rectification>(`/issues/${issueId}/rectification/submit`, {});
  },

  verifySafetyIssue: async (
    issueId: string,
    data: CreateVerificationRequest
  ): Promise<ApiResponse<Verification>> => {
    return apiClient.ehs.post<Verification>(`/issues/${issueId}/verification`, data);
  },

  closeSafetyIssue: async (id: string): Promise<ApiResponse<SafetyIssue>> => {
    return apiClient.ehs.post<SafetyIssue>(`/issues/${id}/close`, {});
  },
};

export default safetyIssueApi;
