import { apiClient } from '../client';
import type { QualityCheck, Defect } from './types';

export const qualityCheckApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/quality-checks`);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/quality-checks/${id}`);
  },

  create: async (
    projectId: string,
    data: {
      check_code?: string;
      check_name: string;
      check_type?: string;
      phase_id?: string;
      milestone_id?: string;
      check_criteria?: string;
      acceptance_standard?: string;
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/projects/${projectId}/quality-checks`, data);
  },

  update: async (
    id: string,
    data: {
      check_name?: string;
      check_type?: string;
      check_criteria?: string;
      acceptance_standard?: string;
      status?: string;
      check_date?: string;
      checked_by?: string;
      result_details?: Record<string, unknown>;
      nonconformities?: Record<string, unknown>;
      corrective_actions?: Record<string, unknown>;
      follow_up_date?: string;
    }
  ) => {
    return apiClient.pm.put(`/quality-checks/${id}`, data);
  },
};

export const defectApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/defects`);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/defects/${id}`);
  },

  create: async (
    projectId: string,
    data: {
      defect_code?: string;
      defect_name: string;
      defect_description?: string;
      severity: string;
      priority: string;
      check_id?: string;
      assignee?: string;
      due_date?: string;
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/projects/${projectId}/defects`, data);
  },

  update: async (
    id: string,
    data: {
      defect_name?: string;
      defect_description?: string;
      severity?: string;
      priority?: string;
      status?: string;
      assignee?: string;
      due_date?: string;
      resolution?: string;
    }
  ) => {
    return apiClient.pm.put(`/defects/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.pm.delete(`/defects/${id}`);
  },
};

export default qualityCheckApi;
