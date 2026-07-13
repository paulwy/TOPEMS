import apiClient from '../client';

import { adaptActionToFrontend, adaptActionToBackend } from './adapters';

import type { ApiResponse } from '../client';
import type {
  QualityImprovement,
  CreateQualityImprovementRequest,
  CorrectiveActionBackend,
  UpdateCorrectiveActionRequestBackend,
  PaginatedResponse,
  QmsPaginatedResponse,
} from './types';

export const improvementApi = {
  listImprovements: async (): Promise<ApiResponse<QualityImprovement[]>> => {
    const response =
      await apiClient.qms.get<QmsPaginatedResponse<CorrectiveActionBackend>>('/actions');
    const adaptedData = (response.data?.actions || []).map(adaptActionToFrontend);
    return { ...response, data: adaptedData };
  },

  getImprovement: async (id: string): Promise<ApiResponse<QualityImprovement>> => {
    const response = await apiClient.qms.get<CorrectiveActionBackend>(`/actions/${id}`);
    return {
      ...response,
      data: response.data ? adaptActionToFrontend(response.data) : ({} as QualityImprovement),
    };
  },

  createImprovement: async (
    data: CreateQualityImprovementRequest
  ): Promise<ApiResponse<QualityImprovement>> => {
    const backendData = adaptActionToBackend(data);
    const response = await apiClient.qms.post<CorrectiveActionBackend>('/actions', backendData);
    return {
      ...response,
      data: response.data ? adaptActionToFrontend(response.data) : ({} as QualityImprovement),
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
      `/actions/${id}`,
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptActionToFrontend(response.data) : ({} as QualityImprovement),
    };
  },

  deleteImprovement: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/actions/${id}`);
  },
};
