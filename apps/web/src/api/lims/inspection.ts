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
  ...createCrudApi<InspectionProcess>('/processes'),

  listProcesses: (params?: ListParams) =>
    createCrudApi<InspectionProcess>('/processes').list(params),

  getProcess: (id: string) => createCrudApi<InspectionProcess>('/processes').get(id),
};

export const taskApi = {
  ...createCrudApi<InspectionTask>('/tasks'),

  listTasks: (params?: ListParams) => createCrudApi<InspectionTask>('/tasks').list(params),

  createTask: (data: CreateInspectionTaskRequest) =>
    createCrudApi<InspectionTask>('/tasks').create(data),

  getTask: (id: string) => createCrudApi<InspectionTask>('/tasks').get(id),

  updateTask: (id: string, data: Partial<CreateInspectionTaskRequest>) =>
    createCrudApi<InspectionTask>('/tasks').update(id, data),

  deleteTask: (id: string) => createCrudApi<InspectionTask>('/tasks').delete(id),

  listTasksBySample: async (sampleId: string): Promise<ApiResponse<InspectionTask[]>> => {
    return apiClient.lims.get(`/tasks/sample/${sampleId}`);
  },

  completeStep: async (
    id: string,
    data: Omit<CreateInspectionRecordRequest, 'task_id'>
  ): Promise<ApiResponse<InspectionTask>> => {
    return apiClient.lims.post(`/tasks/${id}/complete_step`, {
      ...data,
      task_id: id,
    });
  },

  submitResult: async (
    id: string,
    data: { result: string; conclusion: string; inspector: string; remarks?: string }
  ): Promise<ApiResponse<InspectionTask>> => {
    // 契约对齐：后端路由为 POST /tasks/{id}/result
    return apiClient.lims.post(`/tasks/${id}/result`, data);
  },
};

export const recordApi = {
  ...createCrudApi<InspectionRecord>('/records'),

  listRecords: (params?: ListParams) => createCrudApi<InspectionRecord>('/records').list(params),

  getRecord: (id: string) => createCrudApi<InspectionRecord>('/records').get(id),

  createRecord: (data: CreateInspectionRecordRequest) =>
    createCrudApi<InspectionRecord>('/records').create(data),

  deleteRecord: (id: string) => createCrudApi<InspectionRecord>('/records').delete(id),

  listRecordsByTask: async (taskId: string): Promise<ApiResponse<InspectionRecord[]>> => {
    return apiClient.lims.get(`/records/task/${taskId}`);
  },
};
