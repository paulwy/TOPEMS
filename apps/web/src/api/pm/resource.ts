import { apiClient } from '../client';
import type { ProjectResource, ProjectExpense } from './types';

export const resourceApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/resources`);
  },

  create: async (
    projectId: string,
    data: {
      resource_type: string;
      resource_id: string;
      resource_service?: string;
      role?: string;
      start_date?: string;
      end_date?: string;
      allocation_percent?: number;
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/projects/${projectId}/resources`, data);
  },

  get: async (projectId: string, id: string) => {
    return apiClient.pm.get(`/projects/${projectId}/resources/${id}`);
  },

  update: async (
    projectId: string,
    id: string,
    data: {
      role?: string;
      start_date?: string;
      end_date?: string;
      allocation_percent?: number;
      actual_hours?: number;
      actual_cost?: number;
      status?: string;
    }
  ) => {
    return apiClient.pm.put(`/projects/${projectId}/resources/${id}`, data);
  },

  delete: async (projectId: string, id: string) => {
    return apiClient.pm.delete(`/projects/${projectId}/resources/${id}`);
  },
};

export const expenseApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/expenses`);
  },

  create: async (
    projectId: string,
    data: {
      phase_id?: string;
      expense_type: string;
      category?: string;
      subcategory?: string;
      description?: string;
      amount: number;
      currency?: string;
      incurred_date: string;
      budgetitem_id?: string;
      resource_id?: string;
      expense_ref_id?: string;
      approval_workflow_id?: string;
      attachment_ids?: string[];
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/projects/${projectId}/expenses`, data);
  },

  get: async (projectId: string, id: string) => {
    return apiClient.pm.get(`/projects/${projectId}/expenses/${id}`);
  },

  update: async (
    projectId: string,
    id: string,
    data: {
      expense_type?: string;
      category?: string;
      subcategory?: string;
      description?: string;
      amount?: number;
      paid_date?: string;
      status?: string;
      approved_by?: string;
    }
  ) => {
    return apiClient.pm.put(`/projects/${projectId}/expenses/${id}`, data);
  },

  delete: async (projectId: string, id: string) => {
    return apiClient.pm.delete(`/projects/${projectId}/expenses/${id}`);
  },
};

export default resourceApi;
