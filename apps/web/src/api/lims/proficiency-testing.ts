import apiClient from '../client';
import type { ApiResponse } from '../client';
import { createCrudApi } from './utils';
import type {
  PtPlan,
  CreatePtPlanRequest,
  UpdatePtPlanRequest,
  PtSample,
  PtSampleReceiveRequest,
  PtResult,
  CreatePtResultRequest,
  PtEvaluation,
  PtEvaluateRequest,
  PtCorrectiveAction,
  CreatePtCorrectiveActionRequest,
  UpdatePtCorrectiveActionRequest,
  ListParams,
} from './types';

export const ptPlanApi = {
  ...createCrudApi<PtPlan>('/api/lims/pt-plans'),

  listPtPlans: (params?: ListParams) => createCrudApi<PtPlan>('/api/lims/pt-plans').list(params),

  getPtPlan: (id: string) => createCrudApi<PtPlan>('/api/lims/pt-plans').get(id),

  createPtPlan: (data: CreatePtPlanRequest) =>
    createCrudApi<PtPlan>('/api/lims/pt-plans').create(data),

  updatePtPlan: (id: string, data: UpdatePtPlanRequest) =>
    createCrudApi<PtPlan>('/api/lims/pt-plans').update(id, data),

  deletePtPlan: (id: string) => createCrudApi<PtPlan>('/api/lims/pt-plans').delete(id),

  listPlanSamples: async (planId: string): Promise<ApiResponse<PtSample[]>> => {
    return apiClient.lims.get(`/api/lims/pt-plans/${planId}/samples`);
  },

  listPlanResults: async (planId: string): Promise<ApiResponse<PtResult[]>> => {
    return apiClient.lims.get(`/api/lims/pt-plans/${planId}/results`);
  },

  listPlanEvaluations: async (planId: string): Promise<ApiResponse<PtEvaluation[]>> => {
    return apiClient.lims.get(`/api/lims/pt-plans/${planId}/evaluations`);
  },

  listPlanCorrectiveActions: async (planId: string): Promise<ApiResponse<PtCorrectiveAction[]>> => {
    return apiClient.lims.get(`/api/lims/pt-plans/${planId}/corrective-actions`);
  },
};

export const ptSampleApi = {
  receivePtSample: async (data: PtSampleReceiveRequest): Promise<ApiResponse<PtSample>> => {
    return apiClient.lims.post('/api/lims/pt-samples/receive', data);
  },
};

export const ptResultApi = {
  submitPtResult: async (data: CreatePtResultRequest): Promise<ApiResponse<PtResult>> => {
    return apiClient.lims.post('/api/lims/pt-results', data);
  },
};

export const ptEvaluationApi = {
  evaluatePtResult: async (data: PtEvaluateRequest): Promise<ApiResponse<PtEvaluation>> => {
    return apiClient.lims.post('/api/lims/pt-evaluations', data);
  },
};

export const ptCorrectiveActionApi = {
  createPtCorrectiveAction: async (
    data: CreatePtCorrectiveActionRequest
  ): Promise<ApiResponse<PtCorrectiveAction>> => {
    return apiClient.lims.post('/api/lims/pt-corrective-actions', data);
  },

  updatePtCorrectiveAction: async (
    id: string,
    data: UpdatePtCorrectiveActionRequest
  ): Promise<ApiResponse<PtCorrectiveAction>> => {
    return apiClient.lims.put(`/api/lims/pt-corrective-actions/${id}`, data);
  },
};
