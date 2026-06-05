import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8011';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  gender?: string;
  birthDate?: string;
  hireDate?: string;
  departmentId?: string;
  position?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  employeeNumber: string;
  name: string;
  gender?: string;
  birthDate?: string;
  hireDate?: string;
  departmentId?: string;
  position?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  parentId?: string;
  managerId?: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentRequest {
  name: string;
  code?: string;
  parentId?: string;
  managerId?: string;
  description?: string;
}

export interface Contract {
  id: string;
  employeeId: string;
  contractType: string;
  startDate: string;
  endDate?: string;
  salary?: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractRequest {
  employeeId: string;
  contractType: string;
  startDate: string;
  endDate?: string;
  salary?: number;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  workHours?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceRequest {
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  workHours?: number;
  notes?: string;
}

export interface ApiResponse<T> {
  code: number;
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
}

export const employeeApi = {
  getEmployees: (params?: { page?: number; pageSize?: number; search?: string; status?: string; departmentId?: string }) =>
    api.get<ApiResponse<any>>('/api/v1/employees', { params }),
  createEmployee: (data: CreateEmployeeRequest) =>
    api.post<ApiResponse<Employee>>('/api/v1/employees', data),
  getEmployee: (id: string) =>
    api.get<ApiResponse<Employee>>(`/api/v1/employees/${id}`),
  updateEmployee: (id: string, data: Partial<CreateEmployeeRequest> & { status?: string }) =>
    api.put<ApiResponse<Employee>>(`/api/v1/employees/${id}`, data),
  deleteEmployee: (id: string) =>
    api.delete<ApiResponse<string>>(`/api/v1/employees/${id}`),
};

export const departmentApi = {
  getDepartments: (params?: { page?: number; pageSize?: number; search?: string; status?: string }) =>
    api.get<ApiResponse<any>>('/api/v1/departments', { params }),
  createDepartment: (data: CreateDepartmentRequest) =>
    api.post<ApiResponse<Department>>('/api/v1/departments', data),
  getDepartment: (id: string) =>
    api.get<ApiResponse<Department>>(`/api/v1/departments/${id}`),
  updateDepartment: (id: string, data: Partial<CreateDepartmentRequest> & { status?: string }) =>
    api.put<ApiResponse<Department>>(`/api/v1/departments/${id}`, data),
  deleteDepartment: (id: string) =>
    api.delete<ApiResponse<string>>(`/api/v1/departments/${id}`),
};

export const contractApi = {
  getContracts: (params?: { page?: number; pageSize?: number; employeeId?: string; status?: string }) =>
    api.get<ApiResponse<any>>('/api/v1/contracts', { params }),
  createContract: (data: CreateContractRequest) =>
    api.post<ApiResponse<Contract>>('/api/v1/contracts', data),
  getContract: (id: string) =>
    api.get<ApiResponse<Contract>>(`/api/v1/contracts/${id}`),
  updateContract: (id: string, data: any) =>
    api.put<ApiResponse<Contract>>(`/api/v1/contracts/${id}`, data),
  deleteContract: (id: string) =>
    api.delete<ApiResponse<string>>(`/api/v1/contracts/${id}`),
};

export const attendanceApi = {
  getAttendance: (params?: { page?: number; pageSize?: number; employeeId?: string }) =>
    api.get<ApiResponse<any>>('/api/v1/attendance', { params }),
  createAttendance: (data: CreateAttendanceRequest) =>
    api.post<ApiResponse<AttendanceRecord>>('/api/v1/attendance', data),
  getAttendanceRecord: (id: string) =>
    api.get<ApiResponse<AttendanceRecord>>(`/api/v1/attendance/${id}`),
  updateAttendance: (id: string, data: any) =>
    api.put<ApiResponse<AttendanceRecord>>(`/api/v1/attendance/${id}`, data),
  deleteAttendance: (id: string) =>
    api.delete<ApiResponse<string>>(`/api/v1/attendance/${id}`),
};

export default api;
