import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  EightDReport,
  CreateEightDReportRequest,
  EightDReportBackend,
  UpdateEightDReportRequestBackend,
  EightDAuditLog,
  EightDAuditLogBackend,
} from './types';
import {
  adaptEightDReportToFrontend,
  adaptEightDReportToBackend,
  adaptEightDAuditLogToFrontend,
} from './adapters';

export const eightDApi = {
  listEightDReports: async (): Promise<ApiResponse<EightDReport[]>> => {
    const response = await apiClient.qms.get<{ reports?: EightDReportBackend[] }>('/eightd');
    const adaptedData = (response.data?.reports || []).map(adaptEightDReportToFrontend);
    return { ...response, data: adaptedData };
  },

  getEightDReport: async (id: string): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.get<EightDReportBackend>(`/eightd/${id}`);
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  createEightDReport: async (
    data: CreateEightDReportRequest
  ): Promise<ApiResponse<EightDReport>> => {
    const backendData = adaptEightDReportToBackend(data);
    const response = await apiClient.qms.post<EightDReportBackend>('/eightd', backendData);
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
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
    const response = await apiClient.qms.put<EightDReportBackend>(`/eightd/${id}`, backendData);
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  deleteEightDReport: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/eightd/${id}`);
  },

  updateD1Team: async (
    id: string,
    data: { teamLeader?: string; teamMembers?: string[]; content?: string }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.put<EightDReportBackend>(`/eightd/${id}/d1-team`, {
      team_leader: data.teamLeader,
      team_members: data.teamMembers,
      content: data.content,
    });
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  submitD3Containment: async (
    id: string,
    data: { content: string; operator?: string }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/eightd/${id}/d3-containment`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  submitD4RootCause: async (
    id: string,
    data: { content: string; operator?: string }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/eightd/${id}/d4-root-cause`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  submitD5PermanentAction: async (
    id: string,
    data: { content: string; operator?: string }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/eightd/${id}/d5-permanent-action`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  verifyD6Effectiveness: async (
    id: string,
    data: { content: string; operator?: string; isEffective: boolean }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(`/eightd/${id}/d6-verify`, data);
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  submitD7Preventive: async (
    id: string,
    data: { content: string; operator?: string }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/eightd/${id}/d7-preventive`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  closeEightDReport: async (
    id: string,
    data: { content?: string; operator?: string }
  ): Promise<ApiResponse<EightDReport>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(`/eightd/${id}/close`, data);
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  getEightDAuditLogs: async (id: string): Promise<ApiResponse<EightDAuditLog[]>> => {
    const response = await apiClient.qms.get<{ logs?: EightDAuditLogBackend[] }>(
      `/eightd/${id}/audit-logs`
    );
    const adaptedData = (response.data?.logs || []).map(adaptEightDAuditLogToFrontend);
    return { ...response, data: adaptedData };
  },
};
