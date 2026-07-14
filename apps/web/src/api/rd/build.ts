import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Build, CreateBuildRequest } from './types';

export const buildApi = {
  listBuilds: async (params?: {
    page?: number;
    pagesize?: number;
    search?: string;
    status?: string;
    build_task?: string;
  }): Promise<
    ApiResponse<{
      builds: Build[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])
        )
      : '';
    const url = queryParams ? `/builds?${queryParams}` : '/builds';
    return apiClient.rd.get(url);
  },

  getBuild: async (id: string): Promise<ApiResponse<Build>> => {
    return apiClient.rd.get(`/builds/${id}`);
  },

  createBuild: async (data: CreateBuildRequest): Promise<ApiResponse<Build>> => {
    return apiClient.rd.post('/builds', data);
  },
};
