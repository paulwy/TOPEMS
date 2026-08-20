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

interface AddProjectMemberRequest {
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

interface CreateProjectPhaseRequest {
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
    return apiClient.pdm.get<PdmProject[]>('/projects');
  },
  get: async (id: string): Promise<ApiResponse<PdmProject>> => {
    return apiClient.pdm.get<PdmProject>(`/projects/${id}`);
  },
  create: async (data: CreatePdmProjectRequest): Promise<ApiResponse<PdmProject>> => {
    return apiClient.pdm.post<PdmProject>('/projects', data);
  },
  update: async (
    id: string,
    data: Partial<CreatePdmProjectRequest>
  ): Promise<ApiResponse<PdmProject>> => {
    return apiClient.pdm.put<PdmProject>(`/projects/${id}`, data);
  },
  delete: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/projects/${id}`);
  },
  updateStatus: async (id: string, status: string): Promise<ApiResponse<PdmProject>> => {
    return apiClient.pdm.put<PdmProject>(`/projects/${id}/status`, { status });
  },
  updatePhase: async (id: string, phase: string): Promise<ApiResponse<PdmProject>> => {
    return apiClient.pdm.put<PdmProject>(`/projects/${id}/phase`, { phase });
  },

  // Project Members
  listMembers: async (projectId: string): Promise<ApiResponse<ProjectMember[]>> => {
    return apiClient.pdm.get<ProjectMember[]>(`/projects/${projectId}/members`);
  },
  addMember: async (data: AddProjectMemberRequest): Promise<ApiResponse<ProjectMember>> => {
    const projectId = data.project_id;
    return apiClient.pdm.post<ProjectMember>(`/projects/${projectId}/members`, {
      user_id: data.user_id,
      role: data.role,
    });
  },
  removeMember: async (projectId: string, userId: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/projects/${projectId}/members/${userId}`);
  },
  updateMemberRole: async (
    projectId: string,
    userId: string,
    role: string
  ): Promise<ApiResponse<ProjectMember>> => {
    return apiClient.pdm.put<ProjectMember>(`/projects/${projectId}/members/${userId}`, {
      role,
    });
  },

  // Project Phases
  listPhases: async (projectId: string): Promise<ApiResponse<ProjectPhase[]>> => {
    return apiClient.pdm.get<ProjectPhase[]>(`/projects/${projectId}/phases`);
  },
  createPhase: async (data: CreateProjectPhaseRequest): Promise<ApiResponse<ProjectPhase>> => {
    const projectId = data.project_id;
    return apiClient.pdm.post<ProjectPhase>(`/projects/${projectId}/phases`, data);
  },
  updatePhaseById: async (
    projectId: string,
    phaseId: string,
    data: Partial<CreateProjectPhaseRequest>
  ): Promise<ApiResponse<ProjectPhase>> => {
    return apiClient.pdm.put<ProjectPhase>(`/projects/${projectId}/phases/${phaseId}`, data);
  },
  deletePhase: async (projectId: string, phaseId: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/projects/${projectId}/phases/${phaseId}`);
  },
};
