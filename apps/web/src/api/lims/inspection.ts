import apiClient from '../client';
import type { ApiResponse } from '../client';
import { createCrudApi } from './utils';
import type {
  InspectionProcess,
  InspectionTask,
  CreateInspectionTaskRequest,
  InspectionRecord,
  CreateInspectionRecordRequest,
  ListParams,
} from './types';

export const processApi = {
  ...createCrudApi<InspectionProcess>('/api/lims/processes'),

  listProcesses: (params?: ListParams) =>
    createCrudApi<InspectionProcess>('/api/lims/processes').list(params),

  getProcess: (id: string) => createCrudApi<InspectionProcess>('/api/lims/processes').get(id),
};

export const taskApi = {
  ...createCrudApi<InspectionTask>('/api/lims/tasks'),

  listTasks: (params?: ListParams) => createCrudApi<InspectionTask>('/api/lims/tasks').list(params),

  createTask: (data: CreateInspectionTaskRequest) =>
    createCrudApi<InspectionTask>('/api/lims/tasks').create(data),

  getTask: (id: string) => createCrudApi<InspectionTask>('/api/lims/tasks').get(id),

  updateTask: (id: string, data: Partial<CreateInspectionTaskRequest>) =>
    createCrudApi<InspectionTask>('/api/lims/tasks').update(id, data),

  deleteTask: (id: string) => createCrudApi<InspectionTask>('/api/lims/tasks').delete(id),

  listTasksBySample: async (sampleId: string): Promise<ApiResponse<InspectionTask[]>> => {
    return apiClient.lims.get(`/api/lims/tasks/sample/${sampleId}`);
  },

  completeStep: async (
    id: string,
    data: Omit<CreateInspectionRecordRequest, 'task_id'>
  ): Promise<ApiResponse<InspectionTask>> => {
    return apiClient.lims.post(`/api/lims/tasks/${id}/complete_step`, {
      ...data,
      task_id: id,
    });
  },

  submitResult: async (
    id: string,
    data: { result: string; conclusion: string; inspector: string; remarks?: string }
  ): Promise<ApiResponse<InspectionTask>> => {
    return apiClient.lims.post(`/api/lims/tasks/${id}/submit-result`, data);
  },
};

export const recordApi = {
  ...createCrudApi<InspectionRecord>('/api/lims/records'),

  listRecords: (params?: ListParams) =>
    createCrudApi<InspectionRecord>('/api/lims/records').list(params),

  getRecord: (id: string) => createCrudApi<InspectionRecord>('/api/lims/records').get(id),

  createRecord: (data: CreateInspectionRecordRequest) =>
    createCrudApi<InspectionRecord>('/api/lims/records').create(data),

  deleteRecord: (id: string) => createCrudApi<InspectionRecord>('/api/lims/records').delete(id),

  listRecordsByTask: async (taskId: string): Promise<ApiResponse<InspectionRecord[]>> => {
    return apiClient.lims.get(`/api/lims/records/task/${taskId}`);
  },
};
