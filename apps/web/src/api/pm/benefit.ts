import { apiClient } from '../client';
import type { ProjectBenefit, BenefitAnalysis } from './types';

export const benefitApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/benefits`);
  },

  analysis: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/benefits/analysis`);
  },

  calculate: async (
    projectId: string,
    data: {
      period_type: string;
      period_date: string;
      planned_cost: number;
      actual_cost: number;
      planned_progress: number;
      actual_progress: number;
      planned_value: number;
      earned_value: number;
      actual_cost_eva: number;
      notes?: string;
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/projects/${projectId}/benefits`, data);
  },
};

export default benefitApi;
