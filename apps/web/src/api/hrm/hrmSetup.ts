import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export interface StepStatusInfo {
  name: string;
  order: number;
  status: string;
  is_current: boolean;
}

export interface InitProgressResponse {
  is_completed: boolean;
  current_step: number;
  steps: StepStatusInfo[];
  org_id?: string | null;
}

export interface CompanyInfoRequest {
  name: string;
  short_name?: string;
  registration_number?: string;
  tax_number?: string;
  address?: string;
  contact_phone?: string;
  email?: string;
  website?: string;
  description?: string;
}

export interface CompanyInfoResponse {
  org_id: string;
  name: string;
}

export interface DepartmentBatchItem {
  name: string;
  code?: string;
  parent_id?: string;
  manager_id?: string;
  description?: string;
}

export interface DepartmentsBatchRequest {
  departments: DepartmentBatchItem[];
}

export interface DepartmentResult {
  id: string;
  name: string;
  code?: string;
}

export interface DepartmentsBatchResponse {
  created_count: number;
  departments: DepartmentResult[];
}

export interface PositionBatchItem {
  name: string;
  code?: string;
  department_id?: string;
  level?: number;
  description?: string;
}

export interface PositionsBatchRequest {
  positions: PositionBatchItem[];
}

export interface PositionResult {
  id: string;
  name: string;
  code?: string;
}

export interface PositionsBatchResponse {
  created_count: number;
  positions: PositionResult[];
}

export interface AdminUserRequest {
  name: string;
  employee_number: string;
  gender?: string;
  birth_date?: string;
  id_card_number?: string;
  hire_date?: string;
  department_id?: string;
  position_id?: string;
  email?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  password: string;
}

export interface AdminUserResponse {
  employee_id: string;
  employee_number: string;
  name: string;
  message: string;
}

export interface CompleteInitRequest {
  confirm: boolean;
}

export interface CompleteInitResponse {
  is_completed: boolean;
  completed_at: string;
}

export const hrmSetupApi = {
  async getInitProgress(): Promise<ApiResponse<InitProgressResponse>> {
    return apiClient.hrm.get<InitProgressResponse>('/setup/progress');
  },

  async setupCompanyInfo(data: CompanyInfoRequest): Promise<ApiResponse<CompanyInfoResponse>> {
    return apiClient.hrm.post<CompanyInfoResponse>('/setup/company', data);
  },

  async setupDepartments(
    data: DepartmentsBatchRequest
  ): Promise<ApiResponse<DepartmentsBatchResponse>> {
    return apiClient.hrm.post<DepartmentsBatchResponse>('/setup/departments', data);
  },

  async setupPositions(data: PositionsBatchRequest): Promise<ApiResponse<PositionsBatchResponse>> {
    return apiClient.hrm.post<PositionsBatchResponse>('/setup/positions', data);
  },

  async setupAdminUser(data: AdminUserRequest): Promise<ApiResponse<AdminUserResponse>> {
    return apiClient.hrm.post<AdminUserResponse>('/setup/admin', data);
  },

  async completeInitialization(
    data: CompleteInitRequest
  ): Promise<ApiResponse<CompleteInitResponse>> {
    return apiClient.hrm.post<CompleteInitResponse>('/setup/complete', data);
  },
};
