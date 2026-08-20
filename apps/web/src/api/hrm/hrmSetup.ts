import { apiClient } from '../client';
import type { ApiResponse } from '../client';

interface StepStatusInfo {
  name: string;
  order: number;
  status: string;
  is_current: boolean;
}

interface InitProgressResponse {
  is_completed: boolean;
  current_step: number;
  steps: StepStatusInfo[];
  org_id?: string | null;
}

interface CompanyInfoRequest {
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

interface CompanyInfoResponse {
  org_id: string;
  name: string;
}

interface DepartmentBatchItem {
  name: string;
  code?: string;
  parent_id?: string;
  manager_id?: string;
  description?: string;
}

interface DepartmentsBatchRequest {
  departments: DepartmentBatchItem[];
}

interface DepartmentResult {
  id: string;
  name: string;
  code?: string;
}

interface DepartmentsBatchResponse {
  created_count: number;
  departments: DepartmentResult[];
}

interface PositionBatchItem {
  name: string;
  code?: string;
  department_id?: string;
  level?: number;
  description?: string;
}

interface PositionsBatchRequest {
  positions: PositionBatchItem[];
}

interface PositionResult {
  id: string;
  name: string;
  code?: string;
}

interface PositionsBatchResponse {
  created_count: number;
  positions: PositionResult[];
}

interface AdminUserRequest {
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

interface AdminUserResponse {
  employee_id: string;
  employee_number: string;
  name: string;
  message: string;
}

interface CompleteInitRequest {
  confirm: boolean;
}

interface CompleteInitResponse {
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
