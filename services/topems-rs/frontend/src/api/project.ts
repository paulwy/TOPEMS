import { apiClient, ApiResponse } from './client';

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  project_type: string;
  status: string;
  leader: string;
  team_members: string[];
  start_date: string;
  end_date?: string;
  budget?: number;
  progress: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  code: string;
  description?: string;
  project_type: string;
  leader: string;
  team_members?: string[];
  start_date: string;
  end_date?: string;
  budget?: number;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: string;
  leader?: string;
  team_members?: string[];
  end_date?: string;
  budget?: number;
  progress?: number;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  page_size: number;
}

export const projectApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<ApiResponse<ProjectListResponse>> => {
    const response = await apiClient.get<ApiResponse<ProjectListResponse>>(
      '/api/v1/projects',
      { params }
    );
    return response.data;
  },

  get: async (id: string): Promise<ApiResponse<Project>> => {
    const response = await apiClient.get<ApiResponse<Project>>(
      `/api/v1/projects/${id}`
    );
    return response.data;
  },

  create: async (data: CreateProjectRequest): Promise<ApiResponse<Project>> => {
    const response = await apiClient.post<ApiResponse<Project>>(
      '/api/v1/projects',
      data
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateProjectRequest
  ): Promise<ApiResponse<Project>> => {
    const response = await apiClient.put<ApiResponse<Project>>(
      `/api/v1/projects/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    const response = await apiClient.delete<ApiResponse<string>>(
      `/api/v1/projects/${id}`
    );
    return response.data;
  },
};
