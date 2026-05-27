import apiClient from './client';
import type { ApiResponse } from './client';

export interface Sample {
  id: string;
  name: string;
  description: string;
  status: string;
  project_id?: string;
  received_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSampleRequest {
  name: string;
  description: string;
  status: string;
}

export interface InspectionStep {
  id: string;
  name: string;
  description: string;
  order: number;
  required: boolean;
}

export interface InspectionProcess {
  id: string;
  name: string;
  description: string;
  steps: InspectionStep[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionTask {
  id: string;
  sample_id: string;
  process_id: string;
  current_step: number;
  status: string;
  inspector: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInspectionTaskRequest {
  sample_id: string;
  process_id: string;
  inspector: string;
}

export interface InspectionRecord {
  id: string;
  task_id: string;
  step_id: string;
  step_name: string;
  result: string;
  conclusion: string;
  inspector: string;
  recorded_at: string;
  created_at: string;
}

export interface CreateInspectionRecordRequest {
  task_id: string;
  step_id: string;
  step_name: string;
  result: string;
  conclusion: string;
  inspector: string;
}

export const limsApi = {
  listSamples: async (): Promise<ApiResponse<Sample[]>> => {
    return apiClient.lims.get<Sample[]>('/api/v1/samples');
  },

  getSample: async (id: string): Promise<ApiResponse<Sample>> => {
    return apiClient.lims.get<Sample>(`/api/v1/samples/${id}`);
  },

  createSample: async (data: CreateSampleRequest): Promise<ApiResponse<Sample>> => {
    return apiClient.lims.post<Sample>('/api/v1/samples', data);
  },

  updateSample: async (id: string, data: CreateSampleRequest): Promise<ApiResponse<Sample>> => {
    return apiClient.lims.put<Sample>(`/api/v1/samples/${id}`, data);
  },

  deleteSample: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.delete<boolean>(`/api/v1/samples/${id}`);
  },

  listProcesses: async (): Promise<ApiResponse<InspectionProcess[]>> => {
    return apiClient.lims.get<InspectionProcess[]>('/api/v1/processes');
  },

  getProcess: async (id: string): Promise<ApiResponse<InspectionProcess>> => {
    return apiClient.lims.get<InspectionProcess>(`/api/v1/processes/${id}`);
  },

  listTasks: async (): Promise<ApiResponse<InspectionTask[]>> => {
    return apiClient.lims.get<InspectionTask[]>('/api/v1/tasks');
  },

  createTask: async (data: CreateInspectionTaskRequest): Promise<ApiResponse<InspectionTask>> => {
    return apiClient.lims.post<InspectionTask>('/api/v1/tasks', data);
  },

  getTask: async (id: string): Promise<ApiResponse<InspectionTask>> => {
    return apiClient.lims.get<InspectionTask>(`/api/v1/tasks/${id}`);
  },

  updateTask: async (id: string, data: CreateInspectionTaskRequest): Promise<ApiResponse<InspectionTask>> => {
    return apiClient.lims.put<InspectionTask>(`/api/v1/tasks/${id}`, data);
  },

  completeStep: async (id: string, data: CreateInspectionRecordRequest): Promise<ApiResponse<InspectionTask>> => {
    return apiClient.lims.post<InspectionTask>(`/api/v1/tasks/${id}/complete_step`, data);
  },

  listRecords: async (): Promise<ApiResponse<InspectionRecord[]>> => {
    return apiClient.lims.get<InspectionRecord[]>('/api/v1/records');
  },

  createRecord: async (data: CreateInspectionRecordRequest): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.lims.post<InspectionRecord>('/api/v1/records', data);
  },

  listRecordsByTask: async (taskId: string): Promise<ApiResponse<InspectionRecord[]>> => {
    return apiClient.lims.get<InspectionRecord[]>(`/api/v1/records/task/${taskId}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.lims.get<string>('/health');
  },
};
