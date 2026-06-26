import { apiClient } from '../client';
import type { AcceptancePlan, AcceptanceItem, AcceptanceRecord } from './types';

export const acceptancePlanApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/api/pm/projects/${projectId}/acceptance-plans`);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/api/pm/acceptance-plans/${id}`);
  },

  create: async (
    projectId: string,
    data: {
      plan_code?: string;
      plan_name: string;
      acceptance_type: string;
      milestone_id?: string;
      phase_id?: string;
      acceptance_criteria?: string;
      expected_date?: string;
      participants?: Record<string, any>;
      documents_required?: Record<string, any>;
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/api/pm/projects/${projectId}/acceptance-plans`, data);
  },

  update: async (
    id: string,
    data: {
      plan_name?: string;
      acceptance_type?: string;
      acceptance_criteria?: string;
      expected_date?: string;
      status?: string;
      participants?: Record<string, any>;
      documents_required?: Record<string, any>;
    }
  ) => {
    return apiClient.pm.put(`/api/pm/acceptance-plans/${id}`, data);
  },
};

export const acceptanceItemApi = {
  list: async (planId: string) => {
    return apiClient.pm.get(`/api/pm/acceptance-plans/${planId}/items`);
  },

  create: async (
    planId: string,
    data: {
      item_code?: string;
      item_name: string;
      item_description?: string;
      required_standard?: string;
    }
  ) => {
    return apiClient.pm.post(`/api/pm/acceptance-plans/${planId}/items`, data);
  },

  update: async (
    id: string,
    data: {
      actual_result?: string;
      is_passed?: boolean;
      comments?: string;
    }
  ) => {
    return apiClient.pm.put(`/api/pm/acceptance-items/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.pm.delete(`/api/pm/acceptance-items/${id}`);
  },
};

export const acceptanceRecordApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/api/pm/projects/${projectId}/acceptance-records`);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/api/pm/acceptance-records/${id}`);
  },

  create: async (
    planId: string,
    data: {
      acceptance_date: string;
      status: string;
      conclusion?: string;
      score?: number;
      accepted_by?: string;
      attendees?: Record<string, any>;
      findings?: Record<string, any>;
      recommendations?: Record<string, any>;
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/api/pm/acceptance-plans/${planId}/records`, data);
  },

  update: async (
    id: string,
    data: {
      status?: string;
      conclusion?: string;
      score?: number;
      attendees?: Record<string, any>;
      findings?: Record<string, any>;
      recommendations?: Record<string, any>;
    }
  ) => {
    return apiClient.pm.put(`/api/pm/acceptance-records/${id}`, data);
  },
};

export default acceptancePlanApi;
