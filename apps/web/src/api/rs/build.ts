import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Build, CreateBuildRequest } from './types';

export const buildApi = {
  listBuilds: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    build_task?: string;
  }): Promise<
    ApiResponse<{
      builds: Build[];
      total: number;
      page: number;
      page_size: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])
        )
      : '';
    const url = queryParams ? `/api/rs/builds?${queryParams}` : '/api/rs/builds';
    return apiClient.rs.get(url);
  },

  getBuild: async (id: string): Promise<ApiResponse<Build>> => {
    return apiClient.rs.get(`/api/rs/builds/${id}`);
  },

  createBuild: async (data: CreateBuildRequest): Promise<ApiResponse<Build>> => {
    return apiClient.rs.post('/api/rs/builds', data);
  },
};
