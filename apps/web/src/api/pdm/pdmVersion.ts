import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface PdmVersion {
  id: string;
  version_no: string;
  version: string;
  change_summary?: string;
  is_current?: boolean;
  release_date?: string;
  status?: 'released' | 'beta' | 'alpha' | 'archived';
  created_at: string;
  updated_at?: string;
}

export interface CreatePdmVersionRequest {
  version_no: string;
  version: string;
  change_summary?: string;
  release_date?: string;
  status?: string;
}

export const pdmVersionApi = {
  list: (): Promise<ApiResponse<PdmVersion[]>> => {
    return apiClient.pdm.get('/versions');
  },

  get: (id: string): Promise<ApiResponse<PdmVersion>> => {
    return apiClient.pdm.get(`/versions/${id}`);
  },

  create: (data: CreatePdmVersionRequest): Promise<ApiResponse<PdmVersion>> => {
    return apiClient.pdm.post('/versions', data);
  },

  update: (
    id: string,
    data: Partial<CreatePdmVersionRequest>
  ): Promise<ApiResponse<PdmVersion>> => {
    return apiClient.pdm.put(`/versions/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/versions/${id}`);
  },

  getStatisticsById: (id: string): Promise<ApiResponse<import('./index').ProductionStatistics>> => {
    return apiClient.pdm.get<import('./index').ProductionStatistics>(`/statistics/${id}`);
  },
};

export default pdmVersionApi;
