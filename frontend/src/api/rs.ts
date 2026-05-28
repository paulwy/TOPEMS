import apiClient from './client';
import type { ApiResponse } from './client';

export interface Project {
  id: string;
  name: string;
  code?: string;
  description: string;
  project_type?: string;
  status: string;
  leader?: string;
  team_members?: any;
  start_date?: string;
  end_date?: string;
  budget?: number;
  progress?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  code?: string;
  description: string;
  project_type?: string;
  status: string;
  leader?: string;
  team_members?: string[];
  start_date?: string;
  end_date?: string;
  budget?: number;
}

export interface ExperimentRecord {
  id: string;
  name: string;
  code?: string;
  project_id: string;
  formula_id?: string;
  title?: string;
  description: string;
  experiment_type: string;
  objective?: string;
  method?: string;
  result: string;
  conclusions?: string;
  status: string;
  experimenter: string;
  started_at?: string;
  completed_at?: string;
  experiment_date?: string;
  conclusion?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExperimentRequest {
  project_id: string;
  title: string;
  description: string;
  experiment_type: string;
  result: string;
  status: string;
  experimenter: string;
}

export interface UpdateExperimentRequest {
  title?: string;
  description?: string;
  experiment_type?: string;
  result?: string;
  status?: string;
  experimenter?: string;
  conclusion?: string;
}

export interface BatchCreateProjectsRequest {
  projects: CreateProjectRequest[];
}

export interface BatchDeleteProjectsRequest {
  ids: string[];
}

export interface BatchOperationResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export const rsApi = {
  listProjects: async (): Promise<ApiResponse<Project[]>> => {
    return apiClient.rs.get<Project[]>('/api/v1/projects');
  },

  getProject: async (id: string): Promise<ApiResponse<Project>> => {
    return apiClient.rs.get<Project>(`/api/v1/projects/${id}`);
  },

  createProject: async (data: CreateProjectRequest): Promise<ApiResponse<Project>> => {
    return apiClient.rs.post<Project>('/api/v1/projects', data);
  },

  updateProject: async (id: string, data: CreateProjectRequest): Promise<ApiResponse<Project>> => {
    return apiClient.rs.put<Project>(`/api/v1/projects/${id}`, data);
  },

  deleteProject: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.rs.delete<boolean>(`/api/v1/projects/${id}`);
  },

  batchCreateProjects: async (data: BatchCreateProjectsRequest): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.rs.post<BatchOperationResult>('/api/v1/projects/batch', data);
  },

  batchDeleteProjects: async (data: BatchDeleteProjectsRequest): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.rs.delete<BatchOperationResult>('/api/v1/projects/batch', { data });
  },

  exportProjects: async (): Promise<Blob> => {
    return apiClient.rs.get('/api/v1/projects/export', {
      responseType: 'blob',
    });
  },

  importProjects: async (file: File): Promise<ApiResponse<BatchOperationResult>> => {
    const content = await file.text();
    return apiClient.rs.post('/api/v1/projects/import', content, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  },

  listExperiments: async (): Promise<ApiResponse<ExperimentRecord[]>> => {
    return apiClient.rs.get<ExperimentRecord[]>('/api/v1/experiments');
  },

  getExperiment: async (id: string): Promise<ApiResponse<ExperimentRecord>> => {
    return apiClient.rs.get<ExperimentRecord>(`/api/v1/experiments/${id}`);
  },

  createExperiment: async (data: CreateExperimentRequest): Promise<ApiResponse<ExperimentRecord>> => {
    return apiClient.rs.post<ExperimentRecord>('/api/v1/experiments', data);
  },

  updateExperiment: async (id: string, data: UpdateExperimentRequest): Promise<ApiResponse<ExperimentRecord>> => {
    return apiClient.rs.put<ExperimentRecord>(`/api/v1/experiments/${id}`, data);
  },

  deleteExperiment: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.rs.delete<boolean>(`/api/v1/experiments/${id}`);
  },

  listExperimentsByProject: async (projectId: string): Promise<ApiResponse<ExperimentRecord[]>> => {
    return apiClient.rs.get<ExperimentRecord[]>(`/api/v1/experiments/project/${projectId}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.rs.get<string>('/health');
  },
};

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_ids?: string[] | null;
  user_id?: string;
  user_name?: string;
  request_details?: any;
  response_details?: any;
  status: 'success' | 'partial' | 'error';
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditLogQueryParams {
  action?: string;
  entity_type?: string;
  user_id?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export const auditRsApi = {
  listAuditLogs: async (params?: AuditLogQueryParams): Promise<ApiResponse<{ audit_logs: AuditLog[], total: number }>> => {
    let url = '/api/v1/audit-logs';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return apiClient.rs.get(url);
  },

  getAuditLog: async (id: string): Promise<ApiResponse<AuditLog>> => {
    return apiClient.rs.get(`/api/v1/audit-logs/${id}`);
  },
};
