import { apiClient } from '../client';
import type { ProjectMember } from './types';

export const memberApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/api/pm/projects/${projectId}/members`);
  },

  create: async (
    projectId: string,
    data: {
      user_id: string;
      role: string;
      responsibilities?: string;
      start_date?: string;
      end_date?: string;
    }
  ) => {
    return apiClient.pm.post(`/api/pm/projects/${projectId}/members`, data);
  },

  get: async (projectId: string, id: string) => {
    return apiClient.pm.get(`/api/pm/projects/${projectId}/members/${id}`);
  },

  update: async (
    projectId: string,
    id: string,
    data: {
      role?: string;
      responsibilities?: string;
      start_date?: string;
      end_date?: string;
    }
  ) => {
    return apiClient.pm.put(`/api/pm/projects/${projectId}/members/${id}`, data);
  },

  delete: async (projectId: string, id: string) => {
    return apiClient.pm.delete(`/api/pm/projects/${projectId}/members/${id}`);
  },
};

export default memberApi;
