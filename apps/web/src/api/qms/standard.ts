import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  QualityStandard,
  CreateQualityStandardRequest,
  QualityStandardBackend,
  UpdateQualityStandardRequestBackend,
  StandardRevision,
  PaginatedResponse,
  QmsPaginatedResponse,
} from './types';
import { adaptStandardToFrontend, adaptStandardToBackend } from './adapters';

export const standardApi = {
  listStandards: async (): Promise<ApiResponse<QualityStandard[]>> => {
    const response =
      await apiClient.qms.get<QmsPaginatedResponse<QualityStandardBackend>>('/standards');
    const adaptedData = (response.data?.standards || []).map(adaptStandardToFrontend);
    return { ...response, data: adaptedData };
  },

  getStandard: async (id: string): Promise<ApiResponse<QualityStandard>> => {
    const response = await apiClient.qms.get<QualityStandardBackend>(`/standards/${id}`);
    return {
      ...response,
      data: response.data ? adaptStandardToFrontend(response.data) : undefined,
    };
  },

  createStandard: async (
    data: CreateQualityStandardRequest
  ): Promise<ApiResponse<QualityStandard>> => {
    const backendData = adaptStandardToBackend(data);
    const response = await apiClient.qms.post<QualityStandardBackend>('/standards', backendData);
    return {
      ...response,
      data: response.data ? adaptStandardToFrontend(response.data) : undefined,
    };
  },

  updateStandard: async (
    id: string,
    data: CreateQualityStandardRequest
  ): Promise<ApiResponse<QualityStandard>> => {
    const backendData: UpdateQualityStandardRequestBackend = {
      name: data.name,
      description: data.description,
      category: data.category,
      version: data.version,
      status: data.status,
    };
    const response = await apiClient.qms.put<QualityStandardBackend>(
      `/standards/${id}`,
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptStandardToFrontend(response.data) : undefined,
    };
  },

  deleteStandard: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/standards/${id}`);
  },

  listRevisions: async (standardId: string): Promise<ApiResponse<StandardRevision[]>> => {
    const response = await apiClient.qms.get<{
      revisions?: StandardRevision[];
    }>(`/standards/${standardId}/revisions`);
    return { ...response, data: response.data?.revisions || [] };
  },
};
