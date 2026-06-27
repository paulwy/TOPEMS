import apiClient from '../client';

import { adaptActionToFrontend, adaptActionToBackend } from './adapters';

import type { ApiResponse } from '../client';
import type {
  QualityImprovement,
  CreateQualityImprovementRequest,
  CorrectiveActionBackend,
  UpdateCorrectiveActionRequestBackend,
  PaginatedResponse,
} from './types';

export const improvementApi = {
  listImprovements: async (): Promise<ApiResponse<QualityImprovement[]>> => {
    const response =
      await apiClient.qms.get<PaginatedResponse<CorrectiveActionBackend>>('/api/qms/actions');
    const adaptedData = (response.data?.actions || []).map(adaptActionToFrontend);
    return { ...response, data: adaptedData };
  },

  getImprovement: async (id: string): Promise<ApiResponse<QualityImprovement>> => {
    const response = await apiClient.qms.get<CorrectiveActionBackend>(`/api/qms/actions/${id}`);
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
      '/api/qms/actions',
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
      `/api/qms/actions/${id}`,
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptActionToFrontend(response.data) : undefined,
    };
  },

  deleteImprovement: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/qms/actions/${id}`);
  },
};
