/**
 * LIMS (Laboratory Information Management System) API Client
 * 实验室信息管理系统 API 客户端
 *
 * 包含样品管理、检验流程、检验任务、检验记录、仪器管理、维护记录等业务模块
 */

import { createRequest } from '@topems/shared-utils';
import type { PaginatedResponse } from '@topems/shared-types';

const api = createRequest('/api/lims');

const unwrap = <T,>(response: unknown): T => response as T;

const requestList = async <T,>(
  path: string,
  params?: Record<string, unknown>
): Promise<PaginatedResponse<T>> => {
  const response = await api.get(path, { params });
  return unwrap<PaginatedResponse<T>>(response);
};

const requestItem = async <T,>(path: string): Promise<T> => {
  const response = await api.get(path);
  return unwrap<T>(response);
};

const requestVoid = async (path: string): Promise<void> => {
  await api.delete(path);
};

// ==================== Types ====================

/**
 * 样品
 */
export interface LimsSample {
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

export interface UpdateSampleRequest {
  name?: string;
  description?: string;
  status?: string;
  project_id?: string;
  location?: string;
  responsible_person?: string;
}

export interface SampleQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  project_id?: string;
}

/**
 * 检验步骤
 */
export interface InspectionStep {
  id: string;
  name: string;
  description: string;
  order: number;
  required: boolean;
}

/**
 * 检验流程
 */
export interface InspectionProcess {
  id: string;
  name: string;
  description: string;
  steps: InspectionStep[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProcessRequest {
  name: string;
  description: string;
  steps: InspectionStep[];
  status: string;
}

export interface ProcessQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

/**
 * 检验任务
 */
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

export interface UpdateInspectionTaskRequest {
  current_step?: number;
  status?: string;
  inspector?: string;
}

export interface InspectionTaskQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sample_id?: string;
}

/**
 * 检验记录
 */
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

export interface LimsInspectionRecordQueryParams {
  page?: number;
  pageSize?: number;
  task_id?: string;
  result?: string;
}

/**
 * 仪器
 */
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

export interface UpdateInstrumentRequest {
  name?: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  status?: string;
  responsible_person?: string;
  description?: string;
}

export interface InstrumentQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  type?: string;
}

/**
 * 维护记录
 */
export interface InstrumentMaintenance {
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

/**
 * LIMS 统计
 */
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

// ==================== Sample API ====================

const sampleApi = {
  list: (params?: SampleQueryParams) =>
    requestList<LimsSample>('/samples', params as Record<string, unknown>),
  get: (id: string) => requestItem<LimsSample>(`/samples/${id}`),
  create: async (data: CreateSampleRequest): Promise<LimsSample> => {
    const response = await api.post('/samples', data);
    return unwrap<LimsSample>(response);
  },
  update: async (id: string, data: UpdateSampleRequest): Promise<LimsSample> => {
    const response = await api.put(`/samples/${id}`, data);
    return unwrap<LimsSample>(response);
  },
  delete: (id: string) => requestVoid(`/samples/${id}`),
  batchDelete: async (ids: string[]): Promise<void> => {
    await api.post('/samples/batch-delete', { ids });
  },
};

// ==================== Process API ====================

const processApi = {
  list: (params?: ProcessQueryParams) =>
    requestList<InspectionProcess>('/processes', params as Record<string, unknown>),
  get: (id: string) => requestItem<InspectionProcess>(`/processes/${id}`),
  create: async (data: CreateProcessRequest): Promise<InspectionProcess> => {
    const response = await api.post('/processes', data);
    return unwrap<InspectionProcess>(response);
  },
  update: async (id: string, data: Partial<CreateProcessRequest>): Promise<InspectionProcess> => {
    const response = await api.put(`/processes/${id}`, data);
    return unwrap<InspectionProcess>(response);
  },
  delete: (id: string) => requestVoid(`/processes/${id}`),
};

// ==================== Task API ====================

const taskApi = {
  list: (params?: InspectionTaskQueryParams) =>
    requestList<InspectionTask>('/tasks', params as Record<string, unknown>),
  get: (id: string) => requestItem<InspectionTask>(`/tasks/${id}`),
  create: async (data: CreateInspectionTaskRequest): Promise<InspectionTask> => {
    const response = await api.post('/tasks', data);
    return unwrap<InspectionTask>(response);
  },
  update: async (
    id: string,
    data: UpdateInspectionTaskRequest
  ): Promise<InspectionTask> => {
    const response = await api.put(`/tasks/${id}`, data);
    return unwrap<InspectionTask>(response);
  },
  completeStep: async (
    id: string,
    data: Omit<CreateInspectionRecordRequest, 'task_id'>
  ): Promise<InspectionTask> => {
    const response = await api.post(`/tasks/${id}/complete_step`, {
      ...data,
      task_id: id,
    });
    return unwrap<InspectionTask>(response);
  },
};

// ==================== Record API ====================

const recordApi = {
  list: (params?: LimsInspectionRecordQueryParams) =>
    requestList<InspectionRecord>('/records', params as Record<string, unknown>),
  get: (id: string) => requestItem<InspectionRecord>(`/records/${id}`),
  create: async (data: CreateInspectionRecordRequest): Promise<InspectionRecord> => {
    const response = await api.post('/records', data);
    return unwrap<InspectionRecord>(response);
  },
};

// ==================== Instrument API ====================

const instrumentApi = {
  list: (params?: InstrumentQueryParams) =>
    requestList<Instrument>('/instruments', params as Record<string, unknown>),
  get: (id: string) => requestItem<Instrument>(`/instruments/${id}`),
  create: async (data: CreateInstrumentRequest): Promise<Instrument> => {
    const response = await api.post('/instruments', data);
    return unwrap<Instrument>(response);
  },
  update: async (id: string, data: UpdateInstrumentRequest): Promise<Instrument> => {
    const response = await api.put(`/instruments/${id}`, data);
    return unwrap<Instrument>(response);
  },
  delete: (id: string) => requestVoid(`/instruments/${id}`),
};

// ==================== Instrument Maintenance API ====================

const instrumentMaintenanceApi = {
  listByInstrument: async (instrumentId: string): Promise<InstrumentMaintenance[]> => {
    const response = await api.get(`/instruments/${instrumentId}/maintenance`);
    return unwrap<InstrumentMaintenance[]>(response);
  },
  create: async (data: CreateMaintenanceRecordRequest): Promise<InstrumentMaintenance> => {
    const response = await api.post('/maintenance', data);
    return unwrap<InstrumentMaintenance>(response);
  },
  update: async (
    id: string,
    data: Partial<CreateMaintenanceRecordRequest>
  ): Promise<InstrumentMaintenance> => {
    const response = await api.put(`/maintenance/${id}`, data);
    return unwrap<InstrumentMaintenance>(response);
  },
  delete: (id: string) => requestVoid(`/maintenance/${id}`),
};

// ==================== Dashboard API ====================

const dashboardApi = {
  getStatistics: () => requestItem<LimsStatistics>('/statistics'),
};

// ==================== LIMS API Export ====================

/**
 * LIMS API 统一导出
 */
export const limsApi = {
  samples: sampleApi,
  processes: processApi,
  tasks: taskApi,
  records: recordApi,
  instruments: instrumentApi,
  maintenance: instrumentMaintenanceApi,
  dashboard: dashboardApi,

  /**
   * 健康检查
   */
  health: async (): Promise<string> => {
    const response = await api.get('/health');
    return unwrap<string>(response);
  },
};

// 导出独立的 API 对象供直接使用
export {
  sampleApi,
  processApi,
  taskApi,
  recordApi,
  instrumentApi,
  instrumentMaintenanceApi,
  dashboardApi as limsDashboardApi,
};
