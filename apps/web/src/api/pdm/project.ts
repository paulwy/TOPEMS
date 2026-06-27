import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface PdmProject {
  id: string;
  project_no: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  phase: 'initiation' | 'planning' | 'execution' | 'monitoring' | 'closing';
  start_date?: string;
  end_date?: string;
  manager_id?: string;
  manager_name?: string;
  budget?: number;
  progress?: number;
  member_count?: number;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreatePdmProjectRequest {
  project_no: string;
  name: string;
  description?: string;
  status?: string;
  phase?: string;
  start_date?: string;
  end_date?: string;
  manager_id?: string;
  budget?: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  role: 'manager' | 'developer' | 'reviewer' | 'viewer';
  joined_at: string;
}

export interface AddProjectMemberRequest {
  project_id: string;
  user_id: string;
  role: 'manager' | 'developer' | 'reviewer' | 'viewer';
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  phase: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  deliverables?: string[];
  created_at: string;
}

export interface CreateProjectPhaseRequest {
  project_id: string;
  phase: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  deliverables?: string[];
}

export const projectApi = {
  // Projects
  list: async (): Promise<ApiResponse<PdmProject[]>> => {
    return apiClient.pdm.get<PdmProject[]>('/api/pdm/projects');
  },
  get: async (id: string): Promise<ApiResponse<PdmProject>> => {
    return apiClient.pdm.get<PdmProject>(`/api/pdm/projects/${id}`);
  },
  create: async (data: CreatePdmProjectRequest): Promise<ApiResponse<PdmProject>> => {
    return apiClient.pdm.post<PdmProject>('/api/pdm/projects', data);
  },
  update: async (
    id: string,
    data: Partial<CreatePdmProjectRequest>
  ): Promise<ApiResponse<PdmProject>> => {
    return apiClient.pdm.put<PdmProject>(`/api/pdm/projects/${id}`, data);
  },
  delete: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/pdm/projects/${id}`);
  },
  updateStatus: async (id: string, status: string): Promise<ApiResponse<PdmProject>> => {
    return apiClient.pdm.put<PdmProject>(`/api/pdm/projects/${id}/status`, { status });
  },
  updatePhase: async (id: string, phase: string): Promise<ApiResponse<PdmProject>> => {
    return apiClient.pdm.put<PdmProject>(`/api/pdm/projects/${id}/phase`, { phase });
  },

  // Project Members
  listMembers: async (projectId: string): Promise<ApiResponse<ProjectMember[]>> => {
    return apiClient.pdm.get<ProjectMember[]>(`/api/pdm/projects/${projectId}/members`);
  },
  addMember: async (data: AddProjectMemberRequest): Promise<ApiResponse<ProjectMember>> => {
    return apiClient.pdm.post<ProjectMember>(`/api/pdm/projects/${data.project_id}/members`, {
      user_id: data.user_id,
      role: data.role,
    });
  },
  removeMember: async (projectId: string, userId: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/pdm/projects/${projectId}/members/${userId}`);
  },
  updateMemberRole: async (
    projectId: string,
    userId: string,
    role: string
  ): Promise<ApiResponse<ProjectMember>> => {
    return apiClient.pdm.put<ProjectMember>(`/api/pdm/projects/${projectId}/members/${userId}`, {
      role,
    });
  },

  // Project Phases
  listPhases: async (projectId: string): Promise<ApiResponse<ProjectPhase[]>> => {
    return apiClient.pdm.get<ProjectPhase[]>(`/api/pdm/projects/${projectId}/phases`);
  },
  createPhase: async (data: CreateProjectPhaseRequest): Promise<ApiResponse<ProjectPhase>> => {
    return apiClient.pdm.post<ProjectPhase>(`/api/pdm/projects/${data.project_id}/phases`, data);
  },
  updatePhaseById: async (
    projectId: string,
    phaseId: string,
    data: Partial<CreateProjectPhaseRequest>
  ): Promise<ApiResponse<ProjectPhase>> => {
    return apiClient.pdm.put<ProjectPhase>(
      `/api/pdm/projects/${projectId}/phases/${phaseId}`,
      data
    );
  },
  deletePhase: async (projectId: string, phaseId: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/api/pdm/projects/${projectId}/phases/${phaseId}`);
  },
};
