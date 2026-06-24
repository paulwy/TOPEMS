import apiClient, { downloadBlob } from './client';
import type { ApiResponse } from './client';
import config from '../config/runtime';

// ========== 类型定义 ==========

export interface Sample {
  id: string;
  sample_no?: string;
  name: string;
  description: string;
  status: string;
  project_id?: string;
  location?: string;
  responsible_person?: string;
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
  task_no?: string;
  sample_id: string;
  sample_name?: string;
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

// ========== 仪器管理类型定义 ==========

export interface Instrument {
  id: string;
  name: string;
  code: string;
  type: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  location?: string;
  status: string;
  purchase_date?: string;
  calibration_date?: string;
  next_calibration_date?: string;
  responsible_person?: string;
  description?: string;
  maintenance_records?: MaintenanceRecord[];
  created_at: string;
  updated_at: string;
}

export interface CreateInstrumentRequest {
  name: string;
  code: string;
  type: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  location?: string;
  status?: string;
  purchase_date?: string;
  calibration_date?: string;
  next_calibration_date?: string;
  responsible_person?: string;
  description?: string;
}

export interface MaintenanceRecord {
  id: string;
  instrument_id: string;
  maintenance_type: string;
  description: string;
  performed_by: string;
  performed_at: string;
  next_maintenance_date?: string;
  cost?: number;
  notes?: string;
  created_at: string;
}

export interface CreateMaintenanceRecordRequest {
  instrument_id: string;
  maintenance_type: string;
  description: string;
  performed_by: string;
  performed_at: string;
  next_maintenance_date?: string;
  cost?: number;
  notes?: string;
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
      return apiClient.lims.get(endpoint, { params });
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

export const instrumentApi = {
  ...createCrudApi<Instrument>('/api/lims/instruments'),

  listInstruments: (params?: ListParams) =>
    createCrudApi<Instrument>('/api/lims/instruments').list(params),

  getInstrument: (id: string) => createCrudApi<Instrument>('/api/lims/instruments').get(id),

  createInstrument: (data: CreateInstrumentRequest) =>
    createCrudApi<Instrument>('/api/lims/instruments').create(data),

  updateInstrument: (id: string, data: CreateInstrumentRequest) =>
    createCrudApi<Instrument>('/api/lims/instruments').update(id, data),

  deleteInstrument: (id: string) => createCrudApi<Instrument>('/api/lims/instruments').delete(id),
};

export const maintenanceApi = {
  listByInstrument: async (instrumentId: string): Promise<ApiResponse<MaintenanceRecord[]>> => {
    return apiClient.lims.get(`/api/lims/instruments/${instrumentId}/maintenance`);
  },

  create: async (data: CreateMaintenanceRecordRequest): Promise<ApiResponse<MaintenanceRecord>> => {
    return apiClient.lims.post('/api/lims/maintenance', data);
  },

  update: async (
    id: string,
    data: Partial<CreateMaintenanceRecordRequest>
  ): Promise<ApiResponse<MaintenanceRecord>> => {
    return apiClient.lims.put(`/api/lims/maintenance/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.delete(`/api/lims/maintenance/${id}`);
  },
};

// ========== LIMS API 模块 ==========

export const sampleApi = {
  ...createCrudApi<Sample>('/api/lims/samples'),

  listSamples: (params?: ListParams) => createCrudApi<Sample>('/api/lims/samples').list(params),

  getSample: (id: string) => createCrudApi<Sample>('/api/lims/samples').get(id),

  createSample: (data: CreateSampleRequest) =>
    createCrudApi<Sample>('/api/lims/samples').create(data),

  updateSample: (id: string, data: CreateSampleRequest) =>
    createCrudApi<Sample>('/api/lims/samples').update(id, data),

  deleteSample: (id: string) => createCrudApi<Sample>('/api/lims/samples').delete(id),

  batchCreateSamples: async (
    data: BatchCreateSamplesRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.lims.post('/api/lims/samples/batch', data);
  },

  batchDeleteSamples: async (
    data: BatchDeleteSamplesRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.lims.delete('/api/lims/samples/batch', { data });
  },

  exportSamples: async (): Promise<Blob> => {
    const baseURL = (apiClient.lims as any).defaults?.baseURL || config.services.lims;
    return downloadBlob(baseURL, '/api/lims/samples/export');
  },

  importSamples: async (file: File): Promise<ApiResponse<BatchOperationResult>> => {
    const content = await file.text();
    return apiClient.lims.post('/api/lims/samples/import', content, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  },
};

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

  updateTask: (id: string, data: CreateInspectionTaskRequest) =>
    createCrudApi<InspectionTask>('/api/lims/tasks').update(id, data),

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
};

export const recordApi = {
  ...createCrudApi<InspectionRecord>('/api/lims/records'),

  listRecords: (params?: ListParams) =>
    createCrudApi<InspectionRecord>('/api/lims/records').list(params),

  createRecord: (data: CreateInspectionRecordRequest) =>
    createCrudApi<InspectionRecord>('/api/lims/records').create(data),

  listRecordsByTask: async (taskId: string): Promise<ApiResponse<InspectionRecord[]>> => {
    return apiClient.lims.get(`/api/lims/records/task/${taskId}`);
  },
};

export interface LimsStatistics {
  total_samples: number;
  pending_samples: number;
  testing_samples: number;
  completed_samples: number;
  cancelled_samples: number;

  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;

  total_processes: number;

  total_instruments: number;
  normal_instruments: number;
  calibration_instruments: number;
  maintenance_instruments: number;
  disabled_instruments: number;
}

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
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export const auditLimsApi = {
  listAuditLogs: async (
    params?: AuditLogQueryParams
  ): Promise<ApiResponse<{ audit_logs: AuditLog[]; total: number }>> => {
    let url = '/api/lims/audit-logs';
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
    return apiClient.lims.get(`/api/lims/audit-logs/${id}`);
  },

  exportAuditLogs: async (
    params?: Omit<AuditLogQueryParams, 'page' | 'page_size'>
  ): Promise<Blob> => {
    let url = '/api/lims/audit-logs/export';
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
    const baseURL = (apiClient.lims as any).defaults?.baseURL || config.services.lims;
    return downloadBlob(baseURL, url);
  },
};

// ========== 统一导出 ==========

export const limsApi = {
  samples: sampleApi,
  processes: processApi,
  tasks: taskApi,
  records: recordApi,
  instruments: instrumentApi,
  maintenance: maintenanceApi,
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
  listTasksBySample: taskApi.listTasksBySample,

  listRecords: recordApi.listRecords,
  createRecord: recordApi.createRecord,
  listRecordsByTask: recordApi.listRecordsByTask,

  listInstruments: instrumentApi.listInstruments,
  getInstrument: instrumentApi.getInstrument,
  createInstrument: instrumentApi.createInstrument,
  updateInstrument: instrumentApi.updateInstrument,
  deleteInstrument: instrumentApi.deleteInstrument,

  listMaintenanceByInstrument: maintenanceApi.listByInstrument,
  createMaintenance: maintenanceApi.create,
  updateMaintenance: maintenanceApi.update,
  deleteMaintenance: maintenanceApi.delete,

  getStatistics: async (): Promise<ApiResponse<LimsStatistics>> => {
    return apiClient.lims.get('/api/lims/statistics');
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.lims.get('/health');
  },
};

export default limsApi;
