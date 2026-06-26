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
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
  
    return apiClient.ehs.get<PaginatedResponse<SafetyIssue>>(
      `/api/ehs/issues?${queryParams.toString()}`
    );
  },

  getSafetyIssue: async (id: string): Promise<ApiResponse<SafetyIssueDetail>> => {
    return apiClient.ehs.get<SafetyIssueDetail>(`/api/ehs/issues/${id}`);
  },

  createSafetyIssue: async (data: CreateSafetyIssueRequest): Promise<ApiResponse<SafetyIssue>> => {
    return apiClient.ehs.post<SafetyIssue>('/api/ehs/issues', data);
  },

  updateSafetyIssue: async (
    id: string,
    data: Partial<CreateSafetyIssueRequest>
  ): Promise<ApiResponse<SafetyIssue>> => {
    return apiClient.ehs.put<SafetyIssue>(`/api/ehs/issues/${id}`, data);
  },

  deleteSafetyIssue: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/issues/${id}`);
  },

  startRectification: async (
    issueId: string,
    data: CreateRectificationRequest
  ): Promise<ApiResponse<Rectification>> => {
    return apiClient.ehs.post<Rectification>(`/api/ehs/issues/${issueId}/rectification`, data);
  },

  updateRectification: async (
    issueId: string,
    data: UpdateRectificationRequest
  ): Promise<ApiResponse<Rectification>> => {
    return apiClient.ehs.put<Rectification>(`/api/ehs/issues/${issueId}/rectification`, data);
  },

  submitRectification: async (issueId: string): Promise<ApiResponse<Rectification>> => {
    return apiClient.ehs.post<Rectification>(`/api/ehs/issues/${issueId}/rectification/submit`, {});
  },

  verifySafetyIssue: async (
    issueId: string,
    data: CreateVerificationRequest
  ): Promise<ApiResponse<Verification>> => {
    return apiClient.ehs.post<Verification>(`/api/ehs/issues/${issueId}/verification`, data);
  },

  closeSafetyIssue: async (id: string): Promise<ApiResponse<SafetyIssue>> => {
    return apiClient.ehs.post<SafetyIssue>(`/api/ehs/issues/${id}/close`, {});
  },
};

export default safetyIssueApi;
