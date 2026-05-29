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
  days: number;
  reason?: string;
  status: string;
  approver_id?: string;
  approved_at?: string;
  rejection_reason?: string;
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
  work_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  name: string;
  code?: string;
  department_id?: string;
  level?: string;
  min_salary?: number;
  max_salary?: number;
  description?: string;
  requirements?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface JobOpening {
  id: string;
  title: string;
  code?: string;
  department_id?: string;
  position_id?: string;
  employment_type?: string;
  location?: string;
  description?: string;
  requirements?: string;
  salary_min?: number;
  salary_max?: number;
  status: string;
  publish_date?: string;
  close_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position_id?: string;
  job_opening_id?: string;
  resume_path?: string;
  source?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: string;
  candidate_id: string;
  interviewer_id?: string;
  round: number;
  scheduled_at?: string;
  actual_at?: string;
  duration_minutes: number;
  status: string;
  result?: string;
  notes?: string;
  score?: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollRun {
  id: string;
  pay_period: string;
  status: string;
  total_amount: number;
  employee_count: number;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  gross_amount: number;
  net_amount: number;
  deductions: number;
  taxes: number;
  status: string;
  bank_account?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  review_period: string;
  reviewer_id?: string;
  status: string;
  overall_rating?: number;
  self_rating?: number;
  manager_rating?: number;
  final_rating?: number;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceGoal {
  id: string;
  employee_id: string;
  title: string;
  description?: string;
  target?: string;
  weight: number;
  achieved?: number;
  status: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  employee_id?: string;
  department_id?: string;
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
    if (params?.employee_id) searchParams.set('employee_id', params.employee_id);
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
  
  async reject(id: string, approver_id: string, reason: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.put(`/api/v1/leaves/${id}/reject`, { approver_id, reason });
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

export const positionApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Position>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.department_id) searchParams.set('department_id', params.department_id);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/positions${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<Position>> {
    return apiClient.hrm.get(`/api/v1/positions/${id}`);
  },
  
  async create(data: Partial<Position>): Promise<ApiResponse<Position>> {
    return apiClient.hrm.post('/api/v1/positions', data);
  },
  
  async update(id: string, data: Partial<Position>): Promise<ApiResponse<Position>> {
    return apiClient.hrm.put(`/api/v1/positions/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/v1/positions/${id}`);
  },
};

export const jobOpeningApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<JobOpening>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.department_id) searchParams.set('department_id', params.department_id);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/job-openings${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.get(`/api/v1/job-openings/${id}`);
  },
  
  async create(data: Partial<JobOpening>): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.post('/api/v1/job-openings', data);
  },
  
  async update(id: string, data: Partial<JobOpening>): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.put(`/api/v1/job-openings/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/v1/job-openings/${id}`);
  },
  
  async publish(id: string): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.put(`/api/v1/job-openings/${id}/publish`);
  },
  
  async close(id: string): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.put(`/api/v1/job-openings/${id}/close`);
  },
};

export const candidateApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Candidate>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/candidates${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<Candidate>> {
    return apiClient.hrm.get(`/api/v1/candidates/${id}`);
  },
  
  async create(data: Partial<Candidate>): Promise<ApiResponse<Candidate>> {
    return apiClient.hrm.post('/api/v1/candidates', data);
  },
  
  async update(id: string, data: Partial<Candidate>): Promise<ApiResponse<Candidate>> {
    return apiClient.hrm.put(`/api/v1/candidates/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/v1/candidates/${id}`);
  },
};

export const interviewApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Interview>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.employee_id) searchParams.set('candidate_id', params.employee_id);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/interviews${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<Interview>> {
    return apiClient.hrm.get(`/api/v1/interviews/${id}`);
  },
  
  async create(data: Partial<Interview>): Promise<ApiResponse<Interview>> {
    return apiClient.hrm.post('/api/v1/interviews', data);
  },
  
  async update(id: string, data: Partial<Interview>): Promise<ApiResponse<Interview>> {
    return apiClient.hrm.put(`/api/v1/interviews/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/v1/interviews/${id}`);
  },
  
  async complete(id: string, data: Partial<Interview>): Promise<ApiResponse<Interview>> {
    return apiClient.hrm.put(`/api/v1/interviews/${id}/complete`, data);
  },
};

export const payrollApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<PayrollRun>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('pay_period', params.search);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/payroll-runs${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<{ run: PayrollRun; items: PayrollItem[] }>> {
    return apiClient.hrm.get(`/api/v1/payroll-runs/${id}`);
  },
  
  async create(data: { pay_period: string }): Promise<ApiResponse<PayrollRun>> {
    return apiClient.hrm.post('/api/v1/payroll-runs', data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/v1/payroll-runs/${id}`);
  },
  
  async calculate(id: string): Promise<ApiResponse<PayrollRun>> {
    return apiClient.hrm.put(`/api/v1/payroll-runs/${id}/calculate`);
  },
  
  async pay(id: string): Promise<ApiResponse<PayrollRun>> {
    return apiClient.hrm.put(`/api/v1/payroll-runs/${id}/pay`);
  },
};

export const payrollItemApi = {
  async list(params?: { page?: number; page_size?: number; payroll_run_id?: string; employee_id?: string; status?: string }): Promise<ApiResponse<PaginatedResult<PayrollItem>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.payroll_run_id) searchParams.set('payroll_run_id', params.payroll_run_id);
    if (params?.employee_id) searchParams.set('employee_id', params.employee_id);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/payroll-items${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<{ item: PayrollItem; details: any[] }>> {
    return apiClient.hrm.get(`/api/v1/payroll-items/${id}`);
  },
};

export const performanceReviewApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<PerformanceReview>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.employee_id) searchParams.set('employee_id', params.employee_id);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/performance-reviews${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<PerformanceReview>> {
    return apiClient.hrm.get(`/api/v1/performance-reviews/${id}`);
  },
  
  async create(data: Partial<PerformanceReview>): Promise<ApiResponse<PerformanceReview>> {
    return apiClient.hrm.post('/api/v1/performance-reviews', data);
  },
  
  async update(id: string, data: Partial<PerformanceReview>): Promise<ApiResponse<PerformanceReview>> {
    return apiClient.hrm.put(`/api/v1/performance-reviews/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/v1/performance-reviews/${id}`);
  },
  
  async submit(id: string): Promise<ApiResponse<PerformanceReview>> {
    return apiClient.hrm.put(`/api/v1/performance-reviews/${id}/submit`);
  },
  
  async approve(id: string): Promise<ApiResponse<PerformanceReview>> {
    return apiClient.hrm.put(`/api/v1/performance-reviews/${id}/approve`);
  },
};

export const performanceGoalApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<PerformanceGoal>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.employee_id) searchParams.set('employee_id', params.employee_id);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.hrm.get(`/api/v1/performance-goals${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<PerformanceGoal>> {
    return apiClient.hrm.get(`/api/v1/performance-goals/${id}`);
  },
  
  async create(data: Partial<PerformanceGoal>): Promise<ApiResponse<PerformanceGoal>> {
    return apiClient.hrm.post('/api/v1/performance-goals', data);
  },
  
  async update(id: string, data: Partial<PerformanceGoal>): Promise<ApiResponse<PerformanceGoal>> {
    return apiClient.hrm.put(`/api/v1/performance-goals/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/v1/performance-goals/${id}`);
  },
};

export const employeePerformanceApi = {
  async getReviews(employee_id: string): Promise<ApiResponse<{ items: PerformanceReview[]; total: number }>> {
    return apiClient.hrm.get(`/api/v1/employees/${employee_id}/performance-reviews`);
  },
  
  async getGoals(employee_id: string): Promise<ApiResponse<{ items: PerformanceGoal[]; total: number }>> {
    return apiClient.hrm.get(`/api/v1/employees/${employee_id}/performance-goals`);
  },
};

export const hrmApi = {
  departments: departmentApi,
  employees: employeeApi,
  positions: positionApi,
  leave: leaveApi,
  attendance: attendanceApi,
  jobOpenings: jobOpeningApi,
  candidates: candidateApi,
  interviews: interviewApi,
  payroll: payrollApi,
  performanceReviews: performanceReviewApi,
  performanceGoals: performanceGoalApi,
};