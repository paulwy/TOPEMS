import { apiClient } from '../client';
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectPhase,
  ProjectMilestone,
  ProjectApproval,
  ApprovalRequest,
} from './types';

export const projectApi = {
  list: async (params?: {
    project_type?: string;
    status?: string;
    page?: number;
    pagesize?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.project_type) query.set('project_type', params.project_type);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pagesize) query.set('pagesize', params.pagesize.toString());
    return apiClient.pm.get(`/projects?${query.toString()}`);
  },

  create: async (data: CreateProjectRequest) => {
    return apiClient.pm.post('/projects', data);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/projects/${id}`);
  },

  update: async (id: string, data: UpdateProjectRequest) => {
    return apiClient.pm.put(`/projects/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.pm.delete(`/projects/${id}`);
  },

  dashboard: async (id: string) => {
    return apiClient.pm.get(`/projects/${id}/dashboard`);
  },

  gantt: async (id: string) => {
    return apiClient.pm.get(`/projects/${id}/gantt`);
  },

  listProjects: async (params?: {
    project_type?: string;
    status?: string;
    page?: number;
    pagesize?: number;
  }) => {
    return projectApi.list(params);
  },

  getKanbanBoard: async () => {
    return apiClient.pm.get('/projects/kanban-board');
  },
};

export const phaseApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/phases`);
  },

  create: async (
    projectId: string,
    data: {
      name: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      predecessor_ids?: string[];
    }
  ) => {
    return apiClient.pm.post(`/projects/${projectId}/phases`, data);
  },

  get: async (projectId: string, id: string) => {
    return apiClient.pm.get(`/projects/${projectId}/phases/${id}`);
  },

  update: async (
    projectId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      sequence_number?: number;
      start_date?: string;
      end_date?: string;
      progress?: number;
      status?: string;
      predecessor_ids?: string[];
    }
  ) => {
    return apiClient.pm.put(`/projects/${projectId}/phases/${id}`, data);
  },

  delete: async (projectId: string, id: string) => {
    return apiClient.pm.delete(`/projects/${projectId}/phases/${id}`);
  },
};

export const milestoneApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/milestones`);
  },

  create: async (
    projectId: string,
    data: {
      name: string;
      description?: string;
      date: string;
      phase_id?: string;
      acceptance_criteria?: string;
    }
  ) => {
    return apiClient.pm.post(`/projects/${projectId}/milestones`, data);
  },

  get: async (projectId: string, id: string) => {
    return apiClient.pm.get(`/projects/${projectId}/milestones/${id}`);
  },

  update: async (
    projectId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      date?: string;
      status?: string;
      phase_id?: string;
      acceptance_criteria?: string;
    }
  ) => {
    return apiClient.pm.put(`/projects/${projectId}/milestones/${id}`, data);
  },

  delete: async (projectId: string, id: string) => {
    return apiClient.pm.delete(`/projects/${projectId}/milestones/${id}`);
  },

  getTimeline: async () => {
    return apiClient.pm.get('/projects/milestones/timeline');
  },
};

export const approvalApi = {
  get: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/approval`);
  },

  submit: async (
    projectId: string,
    data: {
      comment?: string;
      approver_id: string;
    }
  ) => {
    return apiClient.pm.post(`/projects/${projectId}/approval`, data);
  },

  action: async (projectId: string, data: ApprovalRequest) => {
    return apiClient.pm.post(`/projects/${projectId}/approval/action`, data);
  },
};

export default projectApi;
