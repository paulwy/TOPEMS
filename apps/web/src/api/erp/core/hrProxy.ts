import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

// ============ Types ============

export interface HrmDashboard {
  total_employees: number;
  active_employees: number;
  departments_count: number;
  pending_approvals: number;
  recent_leave_requests: number;
}

export interface HrmEmployee {
  id: string;
  user_id?: string;
  employee_no: string;
  name: string;
  email?: string;
  phone?: string;
  department_id?: string;
  department_name?: string;
  position?: string;
  status: string;
  hire_date?: string;
  created_at: string;
  updated_at: string;
}

export interface HrmDepartment {
  id: string;
  name: string;
  parent_id?: string;
  manager_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface HrmDepartmentTreeNode extends HrmDepartment {
  children?: HrmDepartmentTreeNode[];
}

export interface HrmCompany {
  id: string;
  name: string;
  code: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface HrmPosition {
  id: string;
  name: string;
  department_id?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface HrmPayroll {
  id: string;
  employee_id: string;
  employee_name: string;
  period: string;
  basic_salary: number;
  bonus?: number;
  deductions?: number;
  net_salary: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface HrmAttendance {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: string;
  hours_worked?: number;
  created_at: string;
  updated_at: string;
}

export interface HrmEmployeeListResponse {
  items: HrmEmployee[];
  total: number;
}

export interface HrmDepartmentListResponse {
  items: HrmDepartment[];
  total: number;
}

export interface HrmCompanyListResponse {
  items: HrmCompany[];
  total: number;
}

export interface HrmPositionListResponse {
  items: HrmPosition[];
  total: number;
}

export interface HrmPayrollListResponse {
  items: HrmPayroll[];
  total: number;
}

export interface HrmAttendanceListResponse {
  items: HrmAttendance[];
  total: number;
}

// ============ Query Types ============

export interface HrmEmployeeQueryParams extends PaginationParams {
  department_id?: string;
  status?: string;
  search?: string;
}

export interface HrmPayrollQueryParams extends PaginationParams {
  period?: string;
  employee_id?: string;
  status?: string;
}

export interface HrmAttendanceQueryParams extends PaginationParams {
  employee_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

// ============ Helper ============

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps =
    (params as { pageSize?: number } | undefined)?.pageSize ??
    (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

const buildSearchParams = (params?: PaginationParams): URLSearchParams => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', params.page.toString());
  const ps = resolvePageSize(params);
  if (ps) sp.set('pagesize', ps);
  return sp;
};

// ============ API ============

export const hrProxyApi = {
  // ===== Dashboard =====
  async getDashboard(): Promise<ApiResponse<HrmDashboard>> {
    return apiClient.erp.get<HrmDashboard>('/hr/dashboard');
  },

  // ===== Employees =====
  async listEmployees(
    params?: HrmEmployeeQueryParams
  ): Promise<ApiResponse<HrmEmployeeListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.department_id) sp.set('department_id', params.department_id);
    if (params?.status) sp.set('status', params.status);
    if (params?.search) sp.set('search', params.search);
    const qs = sp.toString();
    return apiClient.erp.get<HrmEmployeeListResponse>(`/hr/employees${qs ? `?${qs}` : ''}`);
  },

  async getEmployeeByUser(userId: string): Promise<ApiResponse<HrmEmployee>> {
    return apiClient.erp.get<HrmEmployee>(`/hr/employees/by-user/${userId}`);
  },

  async getEmployee(id: string): Promise<ApiResponse<HrmEmployee>> {
    return apiClient.erp.get<HrmEmployee>(`/hr/employees/${id}`);
  },

  // ===== Departments =====
  async listDepartments(
    params?: PaginationParams
  ): Promise<ApiResponse<HrmDepartmentListResponse>> {
    const sp = buildSearchParams(params);
    const qs = sp.toString();
    return apiClient.erp.get<HrmDepartmentListResponse>(`/hr/departments${qs ? `?${qs}` : ''}`);
  },

  async getDepartmentTree(): Promise<ApiResponse<HrmDepartmentTreeNode[]>> {
    return apiClient.erp.get<HrmDepartmentTreeNode[]>('/hr/departments/tree');
  },

  async getDepartment(id: string): Promise<ApiResponse<HrmDepartment>> {
    return apiClient.erp.get<HrmDepartment>(`/hr/departments/${id}`);
  },

  // ===== Companies =====
  async listCompanies(params?: PaginationParams): Promise<ApiResponse<HrmCompanyListResponse>> {
    const sp = buildSearchParams(params);
    const qs = sp.toString();
    return apiClient.erp.get<HrmCompanyListResponse>(`/hr/companies${qs ? `?${qs}` : ''}`);
  },

  async getCompany(id: string): Promise<ApiResponse<HrmCompany>> {
    return apiClient.erp.get<HrmCompany>(`/hr/companies/${id}`);
  },

  // ===== Positions =====
  async listPositions(params?: PaginationParams): Promise<ApiResponse<HrmPositionListResponse>> {
    const sp = buildSearchParams(params);
    const qs = sp.toString();
    return apiClient.erp.get<HrmPositionListResponse>(`/hr/positions${qs ? `?${qs}` : ''}`);
  },

  async getPosition(id: string): Promise<ApiResponse<HrmPosition>> {
    return apiClient.erp.get<HrmPosition>(`/hr/positions/${id}`);
  },

  // ===== Payrolls =====
  async listPayrolls(params?: HrmPayrollQueryParams): Promise<ApiResponse<HrmPayrollListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.period) sp.set('period', params.period);
    if (params?.employee_id) sp.set('employee_id', params.employee_id);
    if (params?.status) sp.set('status', params.status);
    const qs = sp.toString();
    return apiClient.erp.get<HrmPayrollListResponse>(`/hr/payrolls${qs ? `?${qs}` : ''}`);
  },

  async getPayroll(id: string): Promise<ApiResponse<HrmPayroll>> {
    return apiClient.erp.get<HrmPayroll>(`/hr/payrolls/${id}`);
  },

  // ===== Attendances =====
  async listAttendances(
    params?: HrmAttendanceQueryParams
  ): Promise<ApiResponse<HrmAttendanceListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.employee_id) sp.set('employee_id', params.employee_id);
    if (params?.start_date) sp.set('start_date', params.start_date);
    if (params?.end_date) sp.set('end_date', params.end_date);
    if (params?.status) sp.set('status', params.status);
    const qs = sp.toString();
    return apiClient.erp.get<HrmAttendanceListResponse>(`/hr/attendances${qs ? `?${qs}` : ''}`);
  },
};
