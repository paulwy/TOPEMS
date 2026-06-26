import { apiClient } from '../client';
import type { Budget, BudgetItem } from './types';

export const budgetApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/api/pm/projects/${projectId}/budgets`);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/api/pm/budgets/${id}`);
  },

  create: async (
    projectId: string,
    data: {
      budget_code: string;
      budget_name: string;
      budget_type?: string;
      total_amount: number;
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/api/pm/projects/${projectId}/budgets`, data);
  },

  update: async (
    id: string,
    data: {
      budget_name?: string;
      budget_type?: string;
      total_amount?: number;
      status?: string;
    }
  ) => {
    return apiClient.pm.put(`/api/pm/budgets/${id}`, data);
  },

  submit: async (id: string) => {
    return apiClient.pm.post(`/api/pm/budgets/${id}/submit`);
  },

  approve: async (id: string) => {
    return apiClient.pm.post(`/api/pm/budgets/${id}/approve`);
  },
};

export const budgetItemApi = {
  list: async (budgetId: string) => {
    return apiClient.pm.get(`/api/pm/budgets/${budgetId}/items`);
  },

  create: async (
    budgetId: string,
    data: {
      item_code?: string;
      item_name: string;
      category?: string;
      subcategory?: string;
      budget_amount: number;
      description?: string;
    }
  ) => {
    return apiClient.pm.post(`/api/pm/budgets/${budgetId}/items`, data);
  },

  update: async (
    budgetId: string,
    itemId: string,
    data: {
      item_name?: string;
      category?: string;
      subcategory?: string;
      budget_amount?: number;
      description?: string;
    }
  ) => {
    return apiClient.pm.put(`/api/pm/budgets/${budgetId}/items/${itemId}`, data);
  },

  delete: async (budgetId: string, itemId: string) => {
    return apiClient.pm.delete(`/api/pm/budgets/${budgetId}/items/${itemId}`);
  },
};

export default budgetApi;
