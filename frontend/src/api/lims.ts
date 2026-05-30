import apiClient from './client';
import type { ApiResponse } from './client';

// ========== 类型定义 ==========

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
  project_id?: string;
  received_date?: string;
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

export interface BatchCreateSamplesRequest {
  samples: CreateSampleRequest[];
}

export interface BatchDeleteSamplesRequest {
  ids: string[];
}

export interface BatchOperationResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  project_id?: string;
  [key: string]: string | number | undefined;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ========== 通用工具函数 ==========

function buildQueryString(params?: ListParams): string {
  if (!params) return '';
  
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

interface CrudOperations<T> {
  list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<T>>>;
  get: (id: string) => Promise<ApiResponse<T>>;
  create: (data: Partial<T>) => Promise<ApiResponse<T>>;
  update: (id: string, data: Partial<T>) => Promise<ApiResponse<T>>;
  delete: (id: string) => Promise<ApiResponse<string>>;
}

function createCrudApi<T>(endpoint: string): CrudOperations<T> {
  return {
    list: (params?: ListParams) => {
      const queryString = buildQueryString(params);
      return apiClient.lims.get(`${endpoint}${queryString}`);
    },

    get: (id: string) => {
      return apiClient.lims.get(`${endpoint}/${id}`);
    },

    create: (data: Partial<T>) => {
      return apiClient.lims.post(endpoint, data);
    },

    update: (id: string, data: Partial<T>) => {
      return apiClient.lims.put(`${endpoint}/${id}`, data);
    },

    delete: (id: string) => {
      return apiClient.lims.delete(`${endpoint}/${id}`);
    },
  };
}

// ========== LIMS API 模块 ==========

export const sampleApi = {
  ...createCrudApi<Sample>('/api/v1/samples'),

  listSamples: (params?: ListParams) => 
    createCrudApi<Sample>('/api/v1/samples').list(params),

  getSample: (id: string) => 
    createCrudApi<Sample>('/api/v1/samples').get(id),

  createSample: (data: CreateSampleRequest) => 
    createCrudApi<Sample>('/api/v1/samples').create(data),

  updateSample: (id: string, data: CreateSampleRequest) => 
    createCrudApi<Sample>('/api/v1/samples').update(id, data),

  deleteSample: (id: string) => 
    createCrudApi<Sample>('/api/v1/samples').delete(id),

  batchCreateSamples: async (data: BatchCreateSamplesRequest): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.lims.post('/api/v1/samples/batch', data);
  },

  batchDeleteSamples: async (data: BatchDeleteSamplesRequest): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.lims.delete('/api/v1/samples/batch', { data });
  },

  exportSamples: async (): Promise<Blob> => {
    return apiClient.lims.get('/api/v1/samples/export', {
      responseType: 'blob',
    });
  },

  importSamples: async (file: File): Promise<ApiResponse<BatchOperationResult>> => {
    const content = await file.text();
    return apiClient.lims.post('/api/v1/samples/import', content, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  },
};

export const processApi = {
  ...createCrudApi<InspectionProcess>('/api/v1/processes'),

  listProcesses: (params?: ListParams) => 
    createCrudApi<InspectionProcess>('/api/v1/processes').list(params),

  getProcess: (id: string) => 
    createCrudApi<InspectionProcess>('/api/v1/processes').get(id),
};

export const taskApi = {
  ...createCrudApi<InspectionTask>('/api/v1/tasks'),

  listTasks: (params?: ListParams) => 
    createCrudApi<InspectionTask>('/api/v1/tasks').list(params),

  createTask: (data: CreateInspectionTaskRequest) => 
    createCrudApi<InspectionTask>('/api/v1/tasks').create(data),

  getTask: (id: string) => 
    createCrudApi<InspectionTask>('/api/v1/tasks').get(id),

  updateTask: (id: string, data: CreateInspectionTaskRequest) => 
    createCrudApi<InspectionTask>('/api/v1/tasks').update(id, data),

  completeStep: async (id: string, data: CreateInspectionRecordRequest): Promise<ApiResponse<InspectionTask>> => {
    return apiClient.lims.post(`/api/v1/tasks/${id}/complete_step`, data);
  },
};

export const recordApi = {
  ...createCrudApi<InspectionRecord>('/api/v1/records'),

  listRecords: (params?: ListParams) => 
    createCrudApi<InspectionRecord>('/api/v1/records').list(params),

  createRecord: (data: CreateInspectionRecordRequest) => 
    createCrudApi<InspectionRecord>('/api/v1/records').create(data),

  listRecordsByTask: async (taskId: string): Promise<ApiResponse<InspectionRecord[]>> => {
    return apiClient.lims.get(`/api/v1/records/task/${taskId}`);
  },
};

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_ids?: string[] | null;
  user_id?: string;
  user_name?: string;
  request_details?: any;
  response_details?: any;
  status: 'success' | 'partial' | 'error';
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditLogQueryParams {
  action?: string;
  entity_type?: string;
  user_id?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export const auditLimsApi = {
  listAuditLogs: async (params?: AuditLogQueryParams): Promise<ApiResponse<{ audit_logs: AuditLog[], total: number }>> => {
    let url = '/api/v1/audit-logs';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return apiClient.lims.get(url);
  },

  getAuditLog: async (id: string): Promise<ApiResponse<AuditLog>> => {
    return apiClient.lims.get(`/api/v1/audit-logs/${id}`);
  },
};

// ========== 统一导出 ==========

export const limsApi = {
  samples: sampleApi,
  processes: processApi,
  tasks: taskApi,
  records: recordApi,
  audit: auditLimsApi,

  listSamples: sampleApi.listSamples,
  getSample: sampleApi.getSample,
  createSample: sampleApi.createSample,
  updateSample: sampleApi.updateSample,
  deleteSample: sampleApi.deleteSample,
  batchCreateSamples: sampleApi.batchCreateSamples,
  batchDeleteSamples: sampleApi.batchDeleteSamples,
  exportSamples: sampleApi.exportSamples,
  importSamples: sampleApi.importSamples,
  
  listProcesses: processApi.listProcesses,
  getProcess: processApi.getProcess,
  
  listTasks: taskApi.listTasks,
  createTask: taskApi.createTask,
  getTask: taskApi.getTask,
  updateTask: taskApi.updateTask,
  completeStep: taskApi.completeStep,
  
  listRecords: recordApi.listRecords,
  createRecord: recordApi.createRecord,
  listRecordsByTask: recordApi.listRecordsByTask,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.lims.get('/health');
  },
};

export default limsApi;
