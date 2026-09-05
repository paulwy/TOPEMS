import { apiClient } from '../client';

export const riskApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/risks`);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/risks/${id}`);
  },

  create: async (
    projectId: string,
    data: {
      risk_code?: string;
      risk_name: string;
      risk_description?: string;
      risk_category?: string;
      risk_subcategory?: string;
      likelihood: string;
      impact: string;
      risk_score: number;
      mitigation_strategy?: string;
      contingency_plan?: string;
      trigger_condition?: string;
      warning_threshold?: number;
      owner?: string;
      response_due_date?: string;
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/projects/${projectId}/risks`, data);
  },

  update: async (
    id: string,
    data: {
      risk_name?: string;
      risk_description?: string;
      risk_category?: string;
      risk_subcategory?: string;
      likelihood?: string;
      impact?: string;
      risk_score?: number;
      status?: string;
      mitigation_strategy?: string;
      contingency_plan?: string;
      trigger_condition?: string;
      warning_threshold?: number;
      owner?: string;
      response_due_date?: string;
    }
  ) => {
    return apiClient.pm.put(`/risks/${id}`, data);
  },
};

export const riskEventApi = {
  list: async (riskId: string) => {
    return apiClient.pm.get(`/risks/${riskId}/events`);
  },

  create: async (
    riskId: string,
    data: {
      event_type: string;
      event_description?: string;
      reported_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/risks/${riskId}/events`, data);
  },
};

export default riskApi;
