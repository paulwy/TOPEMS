import apiClient from './client';
import type { ApiResponse } from './client';

// Backend returns data structures
export interface QualityStandardBackend {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  version?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityStandardRequestBackend {
  code: string;
  name: string;
  description?: string;
  category?: string;
  version?: string;
}

export interface UpdateQualityStandardRequestBackend {
  name?: string;
  description?: string;
  category?: string;
  version?: string;
  status?: string;
}

export interface QualityInspectionBackend {
  id: string;
  title: string;
  description?: string;
  inspection_type: string;
  standard_id?: string;
  inspector: string;
  status: string;
  result?: string;
  findings?: string;
  inspected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityInspectionRequestBackend {
  title: string;
  description?: string;
  inspection_type: string;
  standard_id?: string;
  inspector: string;
}

export interface UpdateQualityInspectionRequestBackend {
  title?: string;
  description?: string;
  status?: string;
  result?: string;
  findings?: string;
  inspected_at?: string;
}

export interface QualityIssueBackend {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  source?: string;
  related_inspection_id?: string;
  assigned_to?: string;
  priority?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityIssueRequestBackend {
  title: string;
  description: string;
  severity: string;
  source?: string;
  related_inspection_id?: string;
  assigned_to?: string;
  priority?: string;
  due_date?: string;
}

export interface UpdateQualityIssueRequestBackend {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  assigned_to?: string;
  priority?: string;
  due_date?: string;
}

export interface CorrectiveActionBackend {
  id: string;
  issue_id: string;
  title: string;
  description?: string;
  assigned_to: string;
  status: string;
  implementation_date?: string;
  verification_result?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCorrectiveActionRequestBackend {
  issue_id: string;
  title: string;
  description?: string;
  assigned_to: string;
}

export interface UpdateCorrectiveActionRequestBackend {
  title?: string;
  description?: string;
  assigned_to?: string;
  status?: string;
  implementation_date?: string;
  verification_result?: string;
  verified_by?: string;
  verified_at?: string;
}

// Frontend types
export interface QualityStandard {
  id: string;
  name: string;
  code: string;
  category: string;
  version: string;
  description: string;
  content: string;
  status: string;
  effective_date: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityStandardRequest {
  name: string;
  code: string;
  category: string;
  version: string;
  description: string;
  content: string;
  status: string;
}

export interface QualityCheck {
  id: string;
  check_no: string;
  check_type: string;
  inspector: string;
  check_date: string;
  location: string;
  result: string;
  conclusion: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityCheckRequest {
  check_no: string;
  check_type: string;
  inspector: string;
  check_date: string;
  location: string;
  result: string;
  conclusion: string;
  status: string;
}

export interface QualityIssue {
  id: string;
  issue_no: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  assignee: string;
  due_date?: string;
  resolution?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityIssueRequest {
  issue_no: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  assignee: string;
}

export interface QualityImprovement {
  id: string;
  improvement_no: string;
  title: string;
  description: string;
  category: string;
  status: string;
  proposer: string;
  assignee: string;
  improvement_effect?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityImprovementRequest {
  improvement_no: string;
  title: string;
  description: string;
  category: string;
  status: string;
  proposer: string;
  assignee: string;
  improvement_effect?: string;
}

// Pagination wrapper
interface PaginatedResponse<T> {
  standards?: T[];
  inspections?: T[];
  issues?: T[];
  actions?: T[];
  total: number;
  page: number;
  page_size: number;
}

// Adapter functions
const adaptStandardToFrontend = (backend: QualityStandardBackend): QualityStandard => ({
  id: backend.id,
  name: backend.name,
  code: backend.code,
  category: backend.category || '',
  version: backend.version || '',
  description: backend.description || '',
  content: backend.description || '',
  status: backend.status,
  effective_date: backend.created_at,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

const adaptStandardToBackend = (frontend: CreateQualityStandardRequest): CreateQualityStandardRequestBackend => ({
  code: frontend.code,
  name: frontend.name,
  description: frontend.description,
  category: frontend.category,
  version: frontend.version,
});

const adaptInspectionToFrontend = (backend: QualityInspectionBackend): QualityCheck => ({
  id: backend.id,
  check_no: backend.title,
  check_type: backend.inspection_type,
  inspector: backend.inspector,
  check_date: backend.inspected_at || backend.created_at,
  location: '',
  result: backend.result || '',
  conclusion: backend.findings || '',
  status: backend.status,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

const adaptInspectionToBackend = (frontend: CreateQualityCheckRequest): CreateQualityInspectionRequestBackend => ({
  title: frontend.check_no,
  description: frontend.conclusion,
  inspection_type: frontend.check_type,
  inspector: frontend.inspector,
});

const adaptIssueToFrontend = (backend: QualityIssueBackend): QualityIssue => ({
  id: backend.id,
  issue_no: backend.title.substring(0, 20) + (backend.title.length > 20 ? '...' : ''),
  title: backend.title,
  description: backend.description,
  severity: backend.severity,
  category: backend.source || '',
  status: backend.status,
  assignee: backend.assigned_to || '',
  due_date: backend.due_date,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

const adaptIssueToBackend = (frontend: CreateQualityIssueRequest): CreateQualityIssueRequestBackend => ({
  title: frontend.title,
  description: frontend.description,
  severity: frontend.severity,
  source: frontend.category,
  assigned_to: frontend.assignee,
});

const adaptActionToFrontend = (backend: CorrectiveActionBackend): QualityImprovement => ({
  id: backend.id,
  improvement_no: backend.title.substring(0, 20) + (backend.title.length > 20 ? '...' : ''),
  title: backend.title,
  description: backend.description || '',
  category: '',
  status: backend.status,
  proposer: backend.verified_by || '',
  assignee: backend.assigned_to,
  improvement_effect: backend.verification_result,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
});

const adaptActionToBackend = (frontend: CreateQualityImprovementRequest): CreateCorrectiveActionRequestBackend => ({
  issue_id: '00000000-0000-0000-0000-000000000000',
  title: frontend.title,
  description: frontend.description,
  assigned_to: frontend.assignee,
});

export const qmsApi = {
  // Quality Standards
  listStandards: async (): Promise<ApiResponse<QualityStandard[]>> => {
    const response = await apiClient.qms.get<PaginatedResponse<QualityStandardBackend>>('/api/v1/standards');
    const adaptedData = (response.data?.standards || []).map(adaptStandardToFrontend);
    return { ...response, data: adaptedData };
  },
  getStandard: async (id: string): Promise<ApiResponse<QualityStandard>> => {
    const response = await apiClient.qms.get<QualityStandardBackend>(`/api/v1/standards/${id}`);
    return { ...response, data: response.data ? adaptStandardToFrontend(response.data) : undefined };
  },
  createStandard: async (data: CreateQualityStandardRequest): Promise<ApiResponse<QualityStandard>> => {
    const backendData = adaptStandardToBackend(data);
    const response = await apiClient.qms.post<QualityStandardBackend>('/api/v1/standards', backendData);
    return { ...response, data: response.data ? adaptStandardToFrontend(response.data) : undefined };
  },
  updateStandard: async (id: string, data: CreateQualityStandardRequest): Promise<ApiResponse<QualityStandard>> => {
    const backendData: UpdateQualityStandardRequestBackend = {
      name: data.name,
      description: data.description,
      category: data.category,
      version: data.version,
      status: data.status,
    };
    const response = await apiClient.qms.put<QualityStandardBackend>(`/api/v1/standards/${id}`, backendData);
    return { ...response, data: response.data ? adaptStandardToFrontend(response.data) : undefined };
  },
  deleteStandard: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/v1/standards/${id}`);
  },

  // Quality Checks
  listChecks: async (): Promise<ApiResponse<QualityCheck[]>> => {
    const response = await apiClient.qms.get<PaginatedResponse<QualityInspectionBackend>>('/api/v1/checks');
    const adaptedData = (response.data?.inspections || []).map(adaptInspectionToFrontend);
    return { ...response, data: adaptedData };
  },
  getCheck: async (id: string): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.get<QualityInspectionBackend>(`/api/v1/checks/${id}`);
    return { ...response, data: response.data ? adaptInspectionToFrontend(response.data) : undefined };
  },
  createCheck: async (data: CreateQualityCheckRequest): Promise<ApiResponse<QualityCheck>> => {
    const backendData = adaptInspectionToBackend(data);
    const response = await apiClient.qms.post<QualityInspectionBackend>('/api/v1/checks', backendData);
    return { ...response, data: response.data ? adaptInspectionToFrontend(response.data) : undefined };
  },
  updateCheck: async (id: string, data: CreateQualityCheckRequest): Promise<ApiResponse<QualityCheck>> => {
    const backendData: UpdateQualityInspectionRequestBackend = {
      title: data.check_no,
      description: data.conclusion,
      status: data.status,
      result: data.result,
      findings: data.conclusion,
    };
    const response = await apiClient.qms.put<QualityInspectionBackend>(`/api/v1/checks/${id}`, backendData);
    return { ...response, data: response.data ? adaptInspectionToFrontend(response.data) : undefined };
  },
  deleteCheck: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/v1/checks/${id}`);
  },

  // Quality Issues
  listIssues: async (): Promise<ApiResponse<QualityIssue[]>> => {
    const response = await apiClient.qms.get<PaginatedResponse<QualityIssueBackend>>('/api/v1/issues');
    const adaptedData = (response.data?.issues || []).map(adaptIssueToFrontend);
    return { ...response, data: adaptedData };
  },
  getIssue: async (id: string): Promise<ApiResponse<QualityIssue>> => {
    const response = await apiClient.qms.get<QualityIssueBackend>(`/api/v1/issues/${id}`);
    return { ...response, data: response.data ? adaptIssueToFrontend(response.data) : undefined };
  },
  createIssue: async (data: CreateQualityIssueRequest): Promise<ApiResponse<QualityIssue>> => {
    const backendData = adaptIssueToBackend(data);
    const response = await apiClient.qms.post<QualityIssueBackend>('/api/v1/issues', backendData);
    return { ...response, data: response.data ? adaptIssueToFrontend(response.data) : undefined };
  },
  updateIssue: async (id: string, data: CreateQualityIssueRequest): Promise<ApiResponse<QualityIssue>> => {
    const backendData: UpdateQualityIssueRequestBackend = {
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: data.status,
      assigned_to: data.assignee,
    };
    const response = await apiClient.qms.put<QualityIssueBackend>(`/api/v1/issues/${id}`, backendData);
    return { ...response, data: response.data ? adaptIssueToFrontend(response.data) : undefined };
  },
  deleteIssue: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/v1/issues/${id}`);
  },

  // Quality Improvements
  listImprovements: async (): Promise<ApiResponse<QualityImprovement[]>> => {
    const response = await apiClient.qms.get<PaginatedResponse<CorrectiveActionBackend>>('/api/v1/improvements');
    const adaptedData = (response.data?.actions || []).map(adaptActionToFrontend);
    return { ...response, data: adaptedData };
  },
  getImprovement: async (id: string): Promise<ApiResponse<QualityImprovement>> => {
    const response = await apiClient.qms.get<CorrectiveActionBackend>(`/api/v1/improvements/${id}`);
    return { ...response, data: response.data ? adaptActionToFrontend(response.data) : undefined };
  },
  createImprovement: async (data: CreateQualityImprovementRequest): Promise<ApiResponse<QualityImprovement>> => {
    const backendData = adaptActionToBackend(data);
    const response = await apiClient.qms.post<CorrectiveActionBackend>('/api/v1/improvements', backendData);
    return { ...response, data: response.data ? adaptActionToFrontend(response.data) : undefined };
  },
  updateImprovement: async (
    id: string,
    data: CreateQualityImprovementRequest
  ): Promise<ApiResponse<QualityImprovement>> => {
    const backendData: UpdateCorrectiveActionRequestBackend = {
      title: data.title,
      description: data.description,
      assigned_to: data.assignee,
      status: data.status,
      verified_by: data.proposer,
      verification_result: data.improvement_effect,
    };
    const response = await apiClient.qms.put<CorrectiveActionBackend>(`/api/v1/improvements/${id}`, backendData);
    return { ...response, data: response.data ? adaptActionToFrontend(response.data) : undefined };
  },
  deleteImprovement: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/api/v1/improvements/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.qms.get<string>('/health');
  },
};
