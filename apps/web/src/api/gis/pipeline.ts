import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Pipeline, CreatePipelineRequest, ListQueryParams, PaginatedResponse } from './types';
import { adaptResponse } from './utils';

export const pipelineApi = {
  listPipelines: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Pipeline>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.gis.get<any>(`/pipelines?${queryParams.toString()}`);
    if (response.success && response.data) {
      response.data = adaptResponse<Pipeline>(response.data, 'pipelines');
    }
    return response as ApiResponse<PaginatedResponse<Pipeline>>;
  },

  getPipeline: async (id: string): Promise<ApiResponse<Pipeline>> => {
    return apiClient.gis.get<Pipeline>(`/pipelines/${id}`);
  },

  listPipelinesByMap: async (
    mapId: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Pipeline>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());

    return apiClient.gis.get<PaginatedResponse<Pipeline>>(
      `/pipelines/map/${mapId}?${queryParams.toString()}`
    );
  },

  createPipeline: async (data: CreatePipelineRequest): Promise<ApiResponse<Pipeline>> => {
    return apiClient.gis.post<Pipeline>('/pipelines', data);
  },

  updatePipeline: async (
    id: string,
    data: Partial<CreatePipelineRequest>
  ): Promise<ApiResponse<Pipeline>> => {
    return apiClient.gis.put<Pipeline>(`/pipelines/${id}`, data);
  },

  deletePipeline: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.gis.delete<void>(`/pipelines/${id}`);
  },
};
