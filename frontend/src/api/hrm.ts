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

export interface ListParams {
  page?: number;
  page_size?: number;
  [key: string]: string | number | undefined;
}

function buildQueryString(params?: ListParams): string {
  if (!params) return '';
  
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, value.toString());
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
    list: async (params?: ListParams) => {
      const queryString = buildQueryString(params);
      return await apiClient.hrm.get(`${endpoint}${queryString}`);
    },
    
    get: (id: string) => {
      return apiClient.hrm.get(`${endpoint}/${id}`);
    },
    
    create: (data: Partial<T>) => {
      return apiClient.hrm.post(endpoint, data);
    },
    
    update: (id: string, data: Partial<T>) => {
      return apiClient.hrm.put(`${endpoint}/${id}`, data);
    },
    
    delete: (id: string) => {
      return apiClient.hrm.delete(`${endpoint}/${id}`);
    },
  };
}

export const departmentApi: CrudOperations<Department> = createCrudApi<Department>('/api/v1/departments');

export const employeeApi: CrudOperations<Employee> = createCrudApi<Employee>('/api/v1/employees');

export const roleApi: CrudOperations<Role> = createCrudApi<Role>('/api/v1/roles');

export const positionApi: CrudOperations<Position> = createCrudApi<Position>('/api/v1/positions');

export const candidateApi: CrudOperations<Candidate> = createCrudApi<Candidate>('/api/v1/candidates');

export const leaveApi = {
  ...createCrudApi<LeaveRequest>('/api/v1/leaves'),
  
  approve(id: string, approver_id: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.put(`/api/v1/leaves/${id}/approve`, { approver_id });
  },
  
  reject(id: string, approver_id: string, reason: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.put(`/api/v1/leaves/${id}/reject`, { approver_id, reason });
  },
};

export const attendanceApi = {
  ...createCrudApi<AttendanceRecord>('/api/v1/attendance'),
  
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<AttendanceRecord>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/v1/attendance${queryString}`);
  },
  
  checkIn(employee_id: string): Promise<ApiResponse<AttendanceRecord>> {
    return apiClient.hrm.post('/api/v1/attendance/check-in', { employee_id });
  },
  
  checkOut(employee_id: string): Promise<ApiResponse<AttendanceRecord>> {
    return apiClient.hrm.post('/api/v1/attendance/check-out', { employee_id });
  },
};

export const jobOpeningApi = {
  ...createCrudApi<JobOpening>('/api/v1/job-openings'),
  
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<JobOpening>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/v1/job-openings${queryString}`);
  },
  
  publish(id: string): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.put(`/api/v1/job-openings/${id}/publish`);
  },
  
  close(id: string): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.put(`/api/v1/job-openings/${id}/close`);
  },
};

export const interviewApi = {
  ...createCrudApi<Interview>('/api/v1/interviews'),
  
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<Interview>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/v1/interviews${queryString}`);
  },
  
  complete(id: string, data: Partial<Interview>): Promise<ApiResponse<Interview>> {
    return apiClient.hrm.put(`/api/v1/interviews/${id}/complete`, data);
  },
};

export const payrollApi = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PayrollRun>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/v1/payroll-runs${queryString}`);
  },
  
  get(id: string): Promise<ApiResponse<{ run: PayrollRun; items: PayrollItem[] }>> {
    return apiClient.hrm.get(`/api/v1/payroll-runs/${id}`);
  },
  
  create(data: { pay_period: string }): Promise<ApiResponse<PayrollRun>> {
    return apiClient.hrm.post('/api/v1/payroll-runs', data);
  },
  
  delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/v1/payroll-runs/${id}`);
  },
  
  calculate(id: string): Promise<ApiResponse<PayrollRun>> {
    return apiClient.hrm.put(`/api/v1/payroll-runs/${id}/calculate`);
  },
  
  pay(id: string): Promise<ApiResponse<PayrollRun>> {
    return apiClient.hrm.put(`/api/v1/payroll-runs/${id}/pay`);
  },
};

export const payrollItemApi = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PayrollItem>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/v1/payroll-items${queryString}`);
  },
  
  get(id: string): Promise<ApiResponse<{ item: PayrollItem; details: any[] }>> {
    return apiClient.hrm.get(`/api/v1/payroll-items/${id}`);
  },
};

export const performanceReviewApi = {
  ...createCrudApi<PerformanceReview>('/api/v1/performance-reviews'),
  
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PerformanceReview>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/v1/performance-reviews${queryString}`);
  },
  
  submit(id: string): Promise<ApiResponse<PerformanceReview>> {
    return apiClient.hrm.put(`/api/v1/performance-reviews/${id}/submit`);
  },
  
  approve(id: string): Promise<ApiResponse<PerformanceReview>> {
    return apiClient.hrm.put(`/api/v1/performance-reviews/${id}/approve`);
  },
};

export const performanceGoalApi: CrudOperations<PerformanceGoal> = createCrudApi<PerformanceGoal>('/api/v1/performance-goals');

export const employeePerformanceApi = {
  getReviews(employee_id: string): Promise<ApiResponse<{ items: PerformanceReview[]; total: number }>> {
    return apiClient.hrm.get(`/api/v1/employees/${employee_id}/performance-reviews`);
  },
  
  getGoals(employee_id: string): Promise<ApiResponse<{ items: PerformanceGoal[]; total: number }>> {
    return apiClient.hrm.get(`/api/v1/employees/${employee_id}/performance-goals`);
  },
};

export interface SalaryAdjustment {
  id: string;
  employee_id: string;
  employee_name?: string;
  department?: string;
  adjustment_type: 'promotion' | 'demotion' | 'bonus' | 'deduction';
  old_salary: number;
  new_salary: number;
  adjustment_amount: number;
  reason: string;
  effective_date: string;
  status: 'pending' | 'approved' | 'rejected';
  applicant: string;
  applied_at: string;
  approved_by?: string;
  approved_at?: string;
}

export const salaryAdjustmentApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<SalaryAdjustment>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/v1/salary-adjustments${queryString}`);
  },
  get: async (id: string): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.get(`/api/v1/salary-adjustments/${id}`);
  },
  create: async (data: Partial<SalaryAdjustment>): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.post('/api/v1/salary-adjustments', data);
  },
  update: async (id: string, data: Partial<SalaryAdjustment>): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.put(`/api/v1/salary-adjustments/${id}`, data);
  },
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/api/v1/salary-adjustments/${id}`);
  },
  approve: async (id: string, approverId: string): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.put(`/api/v1/salary-adjustments/${id}/approve`, { approver_id: approverId });
  },
  reject: async (id: string, approverId: string, reason: string): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.put(`/api/v1/salary-adjustments/${id}/reject`, { approver_id: approverId, reason });
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
  salaryAdjustments: salaryAdjustmentApi,
  performanceReviews: performanceReviewApi,
  performanceGoals: performanceGoalApi,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.hrm.get('/health');
  },
};
