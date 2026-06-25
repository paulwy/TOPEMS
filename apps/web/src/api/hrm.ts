import apiClient from './client';
import type { ApiResponse } from './client';

export interface Company {
  id: string;
  organization_id: string;
  name: string;
  short_name?: string;
  registration_number?: string;
  tax_number?: string;
  address?: string;
  contact_phone?: string;
  email?: string;
  website?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  parent_id?: string;
  company_id?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_no: string;
  name: string;
  gender?: string;
  birth_date?: string;
  hire_date?: string;
  department_id?: string;
  position?: string;
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  status: string;
  user_id?: string;
  company_id?: string;
  position_id?: string;
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
  employee_name?: string;
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
  employee_name?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  check_in_time?: string;
  check_out_time?: string;
  status: string;
  attendance_status?: string;
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
  employee_count?: number;
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

export interface PayrollDetail {
  id: string;
  payroll_item_id: string;
  item_type: string;
  item_name: string;
  amount: number;
  is_deduction?: boolean;
  is_tax?: boolean;
  description?: string;
  created_at: string;
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

export interface Contract {
  id: string;
  employee_id: string;
  contract_no?: string;
  contract_type: string;
  party_a_name?: string;
  party_a_contact?: string;
  party_b_name?: string;
  party_b_contact?: string;
  start_date: string;
  end_date?: string;
  salary?: number;
  probation_period_days?: number;
  contract_file_path?: string;
  reminder_days?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractRenewal {
  id: string;
  contract_id: string;
  previous_contract_id?: string;
  renewal_type: string;
  renewal_reason?: string;
  new_start_date: string;
  new_end_date?: string;
  new_salary?: number;
  status: string;
  approver_id?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingPlan {
  id: string;
  name: string;
  code?: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  budget?: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingCourse {
  id: string;
  plan_id: string;
  name: string;
  code?: string;
  category: string;
  level: string;
  description?: string;
  duration_hours?: number;
  instructor_id?: string;
  instructor_name?: string;
  location?: string;
  max_participants?: number;
  enrolled_count?: number;
  start_date?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingRecord {
  id: string;
  course_id: string;
  employee_id: string;
  enrollment_date: string;
  attendance_status: string;
  completion_status: string;
  score?: number;
  certificate_no?: string;
  completed_at?: string;
  feedback?: string;
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

export const companyApi: CrudOperations<Company> = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/api/hrm/companies${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/api/hrm/companies/${id}`);
  },

  create: (data: Partial<Company>) => {
    return apiClient.hrm.post('/api/hrm/companies', data);
  },

  update: (id: string, data: Partial<Company>) => {
    return apiClient.hrm.put(`/api/hrm/companies/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/api/hrm/companies/${id}`);
  },
};

export const departmentApi: CrudOperations<Department> = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/api/hrm/departments${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/api/hrm/departments/${id}`);
  },

  create: (data: Partial<Department>) => {
    return apiClient.hrm.post('/api/hrm/departments', data);
  },

  update: (id: string, data: Partial<Department>) => {
    return apiClient.hrm.put(`/api/hrm/departments/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/api/hrm/departments/${id}`);
  },
};

export const employeeApi: CrudOperations<Employee> = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/api/hrm/employees${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/api/hrm/employees/${id}`);
  },

  create: (data: Partial<Employee>) => {
    return apiClient.hrm.post('/api/hrm/employees', data);
  },

  update: (id: string, data: Partial<Employee>) => {
    return apiClient.hrm.put(`/api/hrm/employees/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/api/hrm/employees/${id}`);
  },
};

export const roleApi: CrudOperations<Role> = createCrudApi<Role>('/api/hrm/roles');

export const positionApi: CrudOperations<Position> = createCrudApi<Position>('/api/hrm/positions');

export const candidateApi: CrudOperations<Candidate> =
  createCrudApi<Candidate>('/api/hrm/candidates');

export const leaveApi = {
  ...createCrudApi<LeaveRequest>('/api/hrm/leaves'),

  approve(id: string, approver_id: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.put(`/api/hrm/leaves/${id}/approve`, { approver_id });
  },

  reject(id: string, approver_id: string, reason: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.put(`/api/hrm/leaves/${id}/reject`, {
      approver_id,
      reason,
    });
  },
};

export const attendanceApi = {
  ...createCrudApi<AttendanceRecord>('/api/hrm/attendance'),

  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<AttendanceRecord>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/attendance${queryString}`);
  },

  checkIn(employee_id: string): Promise<ApiResponse<AttendanceRecord>> {
    return apiClient.hrm.post('/api/hrm/attendance/check-in', { employee_id });
  },

  checkOut(employee_id: string): Promise<ApiResponse<AttendanceRecord>> {
    return apiClient.hrm.post('/api/hrm/attendance/check-out', { employee_id });
  },
};

export const jobOpeningApi = {
  ...createCrudApi<JobOpening>('/api/hrm/job-openings'),

  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<JobOpening>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/job-openings${queryString}`);
  },

  publish(id: string): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.put(`/api/hrm/job-openings/${id}/publish`);
  },

  close(id: string): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.put(`/api/hrm/job-openings/${id}/close`);
  },
};

export const interviewApi = {
  ...createCrudApi<Interview>('/api/hrm/interviews'),

  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<Interview>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/interviews${queryString}`);
  },

  complete(id: string, data: Partial<Interview>): Promise<ApiResponse<Interview>> {
    return apiClient.hrm.put(`/api/hrm/interviews/${id}/complete`, data);
  },
};

export const payrollApi = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PayrollRun>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/payroll-runs${queryString}`);
  },

  get(id: string): Promise<ApiResponse<{ run: PayrollRun; items: PayrollItem[] }>> {
    return apiClient.hrm.get(`/api/hrm/payroll-runs/${id}`);
  },

  create(data: { pay_period: string }): Promise<ApiResponse<PayrollRun>> {
    return apiClient.hrm.post('/api/hrm/payroll-runs', data);
  },

  delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.hrm.delete(`/api/hrm/payroll-runs/${id}`);
  },

  calculate(id: string): Promise<ApiResponse<PayrollRun>> {
    return apiClient.hrm.put(`/api/hrm/payroll-runs/${id}/calculate`);
  },

  pay(id: string): Promise<ApiResponse<PayrollRun>> {
    return apiClient.hrm.put(`/api/hrm/payroll-runs/${id}/pay`);
  },
};

export const payrollItemApi = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PayrollItem>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/payroll-items${queryString}`);
  },

  get(id: string): Promise<ApiResponse<{ item: PayrollItem; details: PayrollDetail[] }>> {
    return apiClient.hrm.get(`/api/hrm/payroll-items/${id}`);
  },
};

export const performanceReviewApi = {
  ...createCrudApi<PerformanceReview>('/api/hrm/performance-reviews'),

  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PerformanceReview>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/performance-reviews${queryString}`);
  },

  submit(id: string): Promise<ApiResponse<PerformanceReview>> {
    return apiClient.hrm.put(`/api/hrm/performance-reviews/${id}/submit`);
  },

  approve(id: string): Promise<ApiResponse<PerformanceReview>> {
    return apiClient.hrm.put(`/api/hrm/performance-reviews/${id}/approve`);
  },
};

export const performanceGoalApi: CrudOperations<PerformanceGoal> = createCrudApi<PerformanceGoal>(
  '/api/hrm/performance-goals'
);

export const employeePerformanceApi = {
  getReviews(
    employee_id: string
  ): Promise<ApiResponse<{ items: PerformanceReview[]; total: number }>> {
    return apiClient.hrm.get(`/api/hrm/employees/${employee_id}/performance-reviews`);
  },

  getGoals(employee_id: string): Promise<ApiResponse<{ items: PerformanceGoal[]; total: number }>> {
    return apiClient.hrm.get(`/api/hrm/employees/${employee_id}/performance-goals`);
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
  reason?: string;
  effective_date?: string;
  status: 'pending' | 'approved' | 'rejected';
  approver_id?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export const salaryAdjustmentApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<SalaryAdjustment>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/salary-adjustments${queryString}`);
  },
  get: async (id: string): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.get(`/api/hrm/salary-adjustments/${id}`);
  },
  create: async (data: Partial<SalaryAdjustment>): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.post('/api/hrm/salary-adjustments', data);
  },
  update: async (
    id: string,
    data: Partial<SalaryAdjustment>
  ): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.put(`/api/hrm/salary-adjustments/${id}`, data);
  },
  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/api/hrm/salary-adjustments/${id}`);
  },
  approve: async (id: string, approverId: string): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.put(`/api/hrm/salary-adjustments/${id}/approve`, {
      approver_id: approverId,
    });
  },
  reject: async (
    id: string,
    approverId: string,
    reason: string
  ): Promise<ApiResponse<SalaryAdjustment>> => {
    return apiClient.hrm.put(`/api/hrm/salary-adjustments/${id}/reject`, {
      approver_id: approverId,
      reason,
    });
  },
};

export const contractApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<Contract>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/contracts${queryString}`);
  },

  get: async (
    id: string
  ): Promise<ApiResponse<{ contract: Contract; renewals: ContractRenewal[] }>> => {
    return apiClient.hrm.get(`/api/hrm/contracts/${id}`);
  },

  create: async (data: Partial<Contract>): Promise<ApiResponse<Contract>> => {
    return apiClient.hrm.post('/api/hrm/contracts', data);
  },

  update: async (id: string, data: Partial<Contract>): Promise<ApiResponse<Contract>> => {
    return apiClient.hrm.put(`/api/hrm/contracts/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/api/hrm/contracts/${id}`);
  },

  getExpiring: async (params?: {
    days?: number;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResult<Contract>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/contracts/expiring${queryString}`);
  },

  renew: async (
    contract_id: string,
    data: Partial<ContractRenewal>
  ): Promise<ApiResponse<ContractRenewal>> => {
    return apiClient.hrm.post(`/api/hrm/contracts/${contract_id}/renew`, data);
  },
};

export const contractRenewalApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<ContractRenewal>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/contract-renewals${queryString}`);
  },

  get: async (id: string): Promise<ApiResponse<ContractRenewal>> => {
    return apiClient.hrm.get(`/api/hrm/contract-renewals/${id}`);
  },

  update: async (
    id: string,
    data: Partial<ContractRenewal>
  ): Promise<ApiResponse<ContractRenewal>> => {
    return apiClient.hrm.put(`/api/hrm/contract-renewals/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/api/hrm/contract-renewals/${id}`);
  },

  approve: async (id: string): Promise<ApiResponse<ContractRenewal>> => {
    return apiClient.hrm.put(`/api/hrm/contract-renewals/${id}/approve`);
  },

  reject: async (id: string, reason: string): Promise<ApiResponse<ContractRenewal>> => {
    return apiClient.hrm.put(`/api/hrm/contract-renewals/${id}/reject`, {
      reason,
    });
  },

  execute: async (id: string): Promise<ApiResponse<any>> => {
    return apiClient.hrm.put(`/api/hrm/contract-renewals/${id}/execute`);
  },
};

export const trainingPlanApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<TrainingPlan>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/training-plans${queryString}`);
  },

  get: async (id: string): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.hrm.get(`/api/hrm/training-plans/${id}`);
  },

  create: async (data: Partial<TrainingPlan>): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.hrm.post('/api/hrm/training-plans', data);
  },

  update: async (id: string, data: Partial<TrainingPlan>): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.hrm.put(`/api/hrm/training-plans/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/api/hrm/training-plans/${id}`);
  },

  activate: async (id: string): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.hrm.put(`/api/hrm/training-plans/${id}/activate`);
  },

  deactivate: async (id: string): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.hrm.put(`/api/hrm/training-plans/${id}/deactivate`);
  },
};

export const trainingCourseApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<TrainingCourse>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/training-courses${queryString}`);
  },

  get: async (id: string): Promise<ApiResponse<TrainingCourse>> => {
    return apiClient.hrm.get(`/api/hrm/training-courses/${id}`);
  },

  create: async (data: Partial<TrainingCourse>): Promise<ApiResponse<TrainingCourse>> => {
    return apiClient.hrm.post('/api/hrm/training-courses', data);
  },

  update: async (
    id: string,
    data: Partial<TrainingCourse>
  ): Promise<ApiResponse<TrainingCourse>> => {
    return apiClient.hrm.put(`/api/hrm/training-courses/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/api/hrm/training-courses/${id}`);
  },
};

export const trainingRecordApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<TrainingRecord>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/training-records${queryString}`);
  },

  get: async (id: string): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.hrm.get(`/api/hrm/training-records/${id}`);
  },

  create: async (data: Partial<TrainingRecord>): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.hrm.post('/api/hrm/training-records', data);
  },

  update: async (
    id: string,
    data: Partial<TrainingRecord>
  ): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.hrm.put(`/api/hrm/training-records/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/api/hrm/training-records/${id}`);
  },

  enroll: async (course_id: string, employee_id: string): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.hrm.post('/api/hrm/training-records/enroll', {
      course_id,
      employee_id,
    });
  },

  complete: async (
    id: string,
    data: Partial<TrainingRecord>
  ): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.hrm.put(`/api/hrm/training-records/${id}/complete`, data);
  },
};

export const hrmApi = {
  companies: companyApi,
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
  contracts: contractApi,
  contractRenewals: contractRenewalApi,
  trainingPlans: trainingPlanApi,
  trainingCourses: trainingCourseApi,
  trainingRecords: trainingRecordApi,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.hrm.get('/health');
  },
};
