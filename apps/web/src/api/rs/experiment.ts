import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  Experiment,
  CreateExperimentRequest,
  UpdateExperimentRequest,
  ExperimentRecord,
  CreateExperimentRecordRequest,
  BatchTraceItem,
} from './types';

export const experimentApi = {
  listExperiments: async (params?: {
    page?: number;
    pagesize?: number;
    search?: string;
    status?: string;
    project_id?: string;
    experiment_type?: string;
  }): Promise<
    ApiResponse<{
      experiments: Experiment[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])
        )
      : '';
    const url = queryParams ? `/experiments?${queryParams}` : '/experiments';
    return apiClient.rs.get(url);
  },

  getExperiment: async (id: string): Promise<ApiResponse<Experiment>> => {
    return apiClient.rs.get(`/experiments/${id}`);
  },

  createExperiment: async (data: CreateExperimentRequest): Promise<ApiResponse<Experiment>> => {
    return apiClient.rs.post('/experiments', data);
  },

  updateExperiment: async (
    id: string,
    data: UpdateExperimentRequest
  ): Promise<ApiResponse<Experiment>> => {
    return apiClient.rs.put(`/experiments/${id}`, data);
  },

  deleteExperiment: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.rs.delete(`/experiments/${id}`);
  },

  listExperimentsByProject: async (projectId: string): Promise<ApiResponse<Experiment[]>> => {
    return apiClient.rs.get(`/experiments/project/${projectId}`);
  },

  listLabExperiments: async (params?: {
    page?: number;
    pagesize?: number;
    search?: string;
    status?: string;
  }): Promise<
    ApiResponse<{
      experiments: Experiment[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])
        )
      : '';
    const url = queryParams ? `/experiments/phase/lab?${queryParams}` : '/experiments/phase/lab';
    return apiClient.rs.get(url);
  },

  listPilotExperiments: async (params?: {
    page?: number;
    pagesize?: number;
    search?: string;
    status?: string;
  }): Promise<
    ApiResponse<{
      experiments: Experiment[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])
        )
      : '';
    const url = queryParams
      ? `/experiments/phase/pilot?${queryParams}`
      : '/experiments/phase/pilot';
    return apiClient.rs.get(url);
  },

  listScaleupExperiments: async (params?: {
    page?: number;
    pagesize?: number;
    search?: string;
    status?: string;
  }): Promise<
    ApiResponse<{
      experiments: Experiment[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])
        )
      : '';
    const url = queryParams
      ? `/experiments/phase/scaleup?${queryParams}`
      : '/experiments/phase/scaleup';
    return apiClient.rs.get(url);
  },

  advancePhase: async (
    id: string,
    data?: { new_status?: string }
  ): Promise<ApiResponse<Experiment>> => {
    return apiClient.rs.post(`/experiments/${id}/advance-phase`, data || {});
  },

  traceBatch: async (batchNumber: string): Promise<ApiResponse<BatchTraceItem[]>> => {
    return apiClient.rs.get(`/batch-trace/${batchNumber}`);
  },

  getExperimentRecords: async (experimentId: string): Promise<ApiResponse<ExperimentRecord[]>> => {
    return apiClient.rs.get(`/experiments/${experimentId}/records`);
  },

  createExperimentRecord: async (
    experimentId: string,
    data: CreateExperimentRecordRequest
  ): Promise<ApiResponse<{ id: string; recorded_at: string }>> => {
    return apiClient.rs.post(`/experiments/${experimentId}/records`, data);
  },
};
