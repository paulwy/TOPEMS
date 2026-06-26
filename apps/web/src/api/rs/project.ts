import apiClient, { downloadBlob } from '../client';
import type { ApiResponse } from '../client';
import config from '../../config/runtime';
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  BatchCreateProjectsRequest,
  BatchDeleteProjectsRequest,
  BatchOperationResult,
  ProjectDashboardResponse,
  ProjectGanttResponse,
} from './types';

export const projectApi = {
  listProjects: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<
    ApiResponse<{
      projects: Project[];
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
    const url = queryParams ? `/api/rs/projects?${queryParams}` : '/api/rs/projects';
    return apiClient.rs.get(url);
  },

  getProject: async (id: string): Promise<ApiResponse<Project>> => {
    return apiClient.rs.get(`/api/rs/projects/${id}`);
  },

  createProject: async (data: CreateProjectRequest): Promise<ApiResponse<Project>> => {
    return apiClient.rs.post('/api/rs/projects', data);
  },

  updateProject: async (id: string, data: UpdateProjectRequest): Promise<ApiResponse<Project>> => {
    return apiClient.rs.put(`/api/rs/projects/${id}`, data);
  },

  deleteProject: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.rs.delete(`/api/rs/projects/${id}`);
  },

  batchCreateProjects: async (
    data: BatchCreateProjectsRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.rs.post('/api/rs/projects/batch', data);
  },

  batchDeleteProjects: async (
    data: BatchDeleteProjectsRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.rs.delete('/api/rs/projects/batch', { data });
  },

  exportProjects: async (): Promise<Blob> => {
    const baseURL = config.services.rs;
    return downloadBlob(baseURL, '/api/rs/projects/export');
  },

  importProjects: async (file: File): Promise<ApiResponse<BatchOperationResult>> => {
    const content = await file.text();
    return apiClient.rs.post('/api/rs/projects/import', content, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  },

  getProjectDashboard: async (id: string): Promise<ApiResponse<ProjectDashboardResponse>> => {
    return apiClient.rs.get(`/api/rs/projects/${id}/dashboard`);
  },

  getProjectGantt: async (id: string): Promise<ApiResponse<ProjectGanttResponse>> => {
    return apiClient.rs.get(`/api/rs/projects/${id}/gantt`);
  },
};
