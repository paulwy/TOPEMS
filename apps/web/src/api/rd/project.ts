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
    pagesize?: number;
    search?: string;
    status?: string;
  }): Promise<
    ApiResponse<{
      projects: Project[];
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
    const url = queryParams ? `/projects?${queryParams}` : '/projects';
    return apiClient.rd.get(url);
  },

  getProject: async (id: string): Promise<ApiResponse<Project>> => {
    return apiClient.rd.get(`/projects/${id}`);
  },

  createProject: async (data: CreateProjectRequest): Promise<ApiResponse<Project>> => {
    return apiClient.rd.post('/projects', data);
  },

  updateProject: async (id: string, data: UpdateProjectRequest): Promise<ApiResponse<Project>> => {
    return apiClient.rd.put(`/projects/${id}`, data);
  },

  deleteProject: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.rd.delete(`/projects/${id}`);
  },

  batchCreateProjects: async (
    data: BatchCreateProjectsRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.rd.post('/projects/batch', data);
  },

  batchDeleteProjects: async (
    data: BatchDeleteProjectsRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.rd.delete('/projects/batch', { data });
  },

  exportProjects: async (): Promise<Blob> => {
    const baseURL = config.services.rd;
    return downloadBlob(baseURL, '/projects/export');
  },

  importProjects: async (file: File): Promise<ApiResponse<BatchOperationResult>> => {
    const content = await file.text();
    return apiClient.rd.post('/projects/import', content, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  },

  getProjectDashboard: async (id: string): Promise<ApiResponse<ProjectDashboardResponse>> => {
    return apiClient.rd.get(`/projects/${id}/dashboard`);
  },

  getProjectGantt: async (id: string): Promise<ApiResponse<ProjectGanttResponse>> => {
    return apiClient.rd.get(`/projects/${id}/gantt`);
  },
};