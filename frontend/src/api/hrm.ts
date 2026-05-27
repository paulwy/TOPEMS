import apiClient from './client';
import type { ApiResponse } from './client';

export interface Department {
  id: string;
  name: string;
  code?: string;
  parent_id?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_number: string;
  name: string;
  gender?: string;
  birth_date?: string;
  hire_date?: string;
  department_id?: string;
  position?: string;
  email?: string;
  phone?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  code?: string;
  description?: string;
  permissions?: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: string;
  approver_id?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const departmentApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Department>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/departments${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<Department>> {
    return apiClient.hrm.get(`/api/v1/departments/${id}`);
  },
  
  async create(data: Partial<Department>): Promise<ApiResponse<Department>> {
    return apiClient.hrm.post('/api/v1/departments', data);
  },
  
  async update(id: string, data: Partial<Department>): Promise<ApiResponse<Department>> {
    return apiClient.hrm.put(`/api/v1/departments/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/v1/departments/${id}`);
  },
};

export const employeeApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Employee>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/employees${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<Employee>> {
    return apiClient.hrm.get(`/api/v1/employees/${id}`);
  },
  
  async create(data: Partial<Employee>): Promise<ApiResponse<Employee>> {
    return apiClient.hrm.post('/api/v1/employees', data);
  },
  
  async update(id: string, data: Partial<Employee>): Promise<ApiResponse<Employee>> {
    return apiClient.hrm.put(`/api/v1/employees/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/v1/employees/${id}`);
  },
};

export const roleApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Role>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/roles${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<Role>> {
    return apiClient.hrm.get(`/api/v1/roles/${id}`);
  },
  
  async create(data: Partial<Role>): Promise<ApiResponse<Role>> {
    return apiClient.hrm.post('/api/v1/roles', data);
  },
  
  async update(id: string, data: Partial<Role>): Promise<ApiResponse<Role>> {
    return apiClient.hrm.put(`/api/v1/roles/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/v1/roles/${id}`);
  },
};

export const leaveApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<LeaveRequest>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/leaves${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.get(`/api/v1/leaves/${id}`);
  },
  
  async create(data: Partial<LeaveRequest>): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.post('/api/v1/leaves', data);
  },
  
  async update(id: string, data: Partial<LeaveRequest>): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.put(`/api/v1/leaves/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/v1/leaves/${id}`);
  },
  
  async approve(id: string, approver_id: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.put(`/api/v1/leaves/${id}/approve`, { approver_id });
  },
  
  async reject(id: string, reason: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.put(`/api/v1/leaves/${id}/reject`, { reason });
  },
};

export const attendanceApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<AttendanceRecord>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/attendance${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<AttendanceRecord>> {
    return apiClient.hrm.get(`/api/v1/attendance/${id}`);
  },
  
  async create(data: Partial<AttendanceRecord>): Promise<ApiResponse<AttendanceRecord>> {
    return apiClient.hrm.post('/api/v1/attendance', data);
  },
  
  async update(id: string, data: Partial<AttendanceRecord>): Promise<ApiResponse<AttendanceRecord>> {
    return apiClient.hrm.put(`/api/v1/attendance/${id}`, data);
  },
  
  async checkIn(employee_id: string): Promise<ApiResponse<AttendanceRecord>> {
    return apiClient.hrm.post('/api/v1/attendance/check-in', { employee_id });
  },
  
  async checkOut(employee_id: string): Promise<ApiResponse<AttendanceRecord>> {
    return apiClient.hrm.post('/api/v1/attendance/check-out', { employee_id });
  },
};
