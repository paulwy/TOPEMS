import { apiClient, ApiResponse } from './client';

export interface Experiment {
  id: string;
  name: string;
  code: string;
  project_id: string;
  formula_id?: string;
  experiment_type: string;
  phase: string;
  status: string;
  objective: string;
  method: string;
  results: any;
  conclusions?: string;
  experimenter: string;
  batch_number?: string;
  scale?: number;
  scale_unit?: string;
  started_at?: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExperimentRequest {
  name: string;
  code: string;
  project_id: string;
  formula_id?: string;
  experiment_type: string;
  phase?: string;
  objective: string;
  method: string;
  experimenter: string;
  batch_number?: string;
  scale?: number;
  scale_unit?: string;
}

export interface UpdateExperimentRequest {
  name?: string;
  status?: string;
  results?: any;
  conclusions?: string;
  completed_at?: string;
  batch_number?: string;
  scale?: number;
  scale_unit?: string;
}

export interface ExperimentListResponse {
  experiments: Experiment[];
  total: number;
  page: number;
  page_size: number;
}

export interface BatchTraceItem {
  id: string;
  batch_number: string;
  experiment_id: string;
  experiment_name: string;
  phase: string;
  formula_id: string;
  formula_name: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

export interface CreateRecordRequest {
  record_type: string;
  content: string;
  attachments: string[];
  recorded_by: string;
}

export interface AdvancePhaseRequest {
  new_status?: string;
}

export const experimentApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    project_id?: string;
    experiment_type?: string;
  }): Promise<ApiResponse<ExperimentListResponse>> => {
    const response = await apiClient.get<ApiResponse<ExperimentListResponse>>(
      '/api/v1/experiments',
      { params }
    );
    return response.data;
  },

  get: async (id: string): Promise<ApiResponse<Experiment>> => {
    const response = await apiClient.get<ApiResponse<Experiment>>(
      `/api/v1/experiments/${id}`
    );
    return response.data;
  },

  create: async (data: CreateExperimentRequest): Promise<ApiResponse<Experiment>> => {
    const response = await apiClient.post<ApiResponse<Experiment>>(
      '/api/v1/experiments',
      data
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateExperimentRequest
  ): Promise<ApiResponse<Experiment>> => {
    const response = await apiClient.put<ApiResponse<Experiment>>(
      `/api/v1/experiments/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    const response = await apiClient.delete<ApiResponse<string>>(
      `/api/v1/experiments/${id}`
    );
    return response.data;
  },

  getRecords: async (id: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>(
      `/api/v1/experiments/${id}/records`
    );
    return response.data;
  },

  createRecord: async (
    id: string,
    data: CreateRecordRequest
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/experiments/${id}/records`,
      data
    );
    return response.data;
  },

  listLabExperiments: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<ApiResponse<ExperimentListResponse>> => {
    const response = await apiClient.get<ApiResponse<ExperimentListResponse>>(
      '/api/v1/experiments/phase/lab',
      { params }
    );
    return response.data;
  },

  listPilotExperiments: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<ApiResponse<ExperimentListResponse>> => {
    const response = await apiClient.get<ApiResponse<ExperimentListResponse>>(
      '/api/v1/experiments/phase/pilot',
      { params }
    );
    return response.data;
  },

  listScaleupExperiments: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<ApiResponse<ExperimentListResponse>> => {
    const response = await apiClient.get<ApiResponse<ExperimentListResponse>>(
      '/api/v1/experiments/phase/scaleup',
      { params }
    );
    return response.data;
  },

  advancePhase: async (
    id: string,
    data?: AdvancePhaseRequest
  ): Promise<ApiResponse<Experiment>> => {
    const response = await apiClient.post<ApiResponse<Experiment>>(
      `/api/v1/experiments/${id}/advance-phase`,
      data || {}
    );
    return response.data;
  },

  traceBatch: async (batchNumber: string): Promise<ApiResponse<BatchTraceItem[]>> => {
    const response = await apiClient.get<ApiResponse<BatchTraceItem[]>>(
      `/api/v1/batch-trace/${batchNumber}`
    );
    return response.data;
  },
};
