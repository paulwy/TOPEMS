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

  batchCreateSamples: async (data: BatchCreateSamplesRequest): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.lims.post<BatchOperationResult>('/api/v1/samples/batch', data);
  },

  batchDeleteSamples: async (data: BatchDeleteSamplesRequest): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.lims.delete<BatchOperationResult>('/api/v1/samples/batch', { data });
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
