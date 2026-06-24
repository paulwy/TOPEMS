import { createRequest } from '@topems/shared-utils';

// ============= 基础类型 =============

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

// ============= 通用分页 =============

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  employee_id?: string;
  department_id?: string;
  [key: string]: string | number | undefined;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
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

const api = createRequest('/api/hrm');

// ============= 公司 API =============

export const companyApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/companies${queryString}`);
    return response.data as PaginatedResult<Company>;
  },
  get: async (id: string) => {
    const response = await api.get(`/companies/${id}`);
    return response.data as Company;
  },
  create: async (data: Partial<Company>) => {
    const response = await api.post('/companies', data);
    return response.data as Company;
  },
  update: async (id: string, data: Partial<Company>) => {
    const response = await api.put(`/companies/${id}`, data);
    return response.data as Company;
  },
  delete: async (id: string) => {
    await api.delete(`/companies/${id}`);
  },
};

// ============= 部门 API =============

export const departmentApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/departments${queryString}`);
    return response.data as PaginatedResult<Department>;
  },
  getTree: async () => {
    const response = await api.get('/departments/tree');
    return response.data as Department[];
  },
  get: async (id: string) => {
    const response = await api.get(`/departments/${id}`);
    return response.data as Department;
  },
  create: async (data: Partial<Department>) => {
    const response = await api.post('/departments', data);
    return response.data as Department;
  },
  update: async (id: string, data: Partial<Department>) => {
    const response = await api.put(`/departments/${id}`, data);
    return response.data as Department;
  },
  delete: async (id: string) => {
    await api.delete(`/departments/${id}`);
  },
};

// ============= 员工 API =============

export const employeeApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/employees${queryString}`);
    return response.data as PaginatedResult<Employee>;
  },
  get: async (id: string) => {
    const response = await api.get(`/employees/${id}`);
    return response.data as Employee;
  },
  create: async (data: Partial<Employee>) => {
    const response = await api.post('/employees', data);
    return response.data as Employee;
  },
  update: async (id: string, data: Partial<Employee>) => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data as Employee;
  },
  delete: async (id: string) => {
    await api.delete(`/employees/${id}`);
  },
};

// ============= 职位 API =============

export const positionApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/positions${queryString}`);
    return response.data as PaginatedResult<Position>;
  },
  get: async (id: string) => {
    const response = await api.get(`/positions/${id}`);
    return response.data as Position;
  },
  create: async (data: Partial<Position>) => {
    const response = await api.post('/positions', data);
    return response.data as Position;
  },
  update: async (id: string, data: Partial<Position>) => {
    const response = await api.put(`/positions/${id}`, data);
    return response.data as Position;
  },
  delete: async (id: string) => {
    await api.delete(`/positions/${id}`);
  },
};

// ============= 考勤 API =============

export const attendanceApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/attendance${queryString}`);
    return response.data as PaginatedResult<AttendanceRecord>;
  },
  get: async (id: string) => {
    const response = await api.get(`/attendance/${id}`);
    return response.data as AttendanceRecord;
  },
  checkIn: async (employee_id: string) => {
    const response = await api.post('/attendance/check-in', { employee_id });
    return response.data as AttendanceRecord;
  },
  checkOut: async (employee_id: string) => {
    const response = await api.post('/attendance/check-out', { employee_id });
    return response.data as AttendanceRecord;
  },
};

// ============= 请假 API =============

export const leaveApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/leaves${queryString}`);
    return response.data as PaginatedResult<LeaveRequest>;
  },
  get: async (id: string) => {
    const response = await api.get(`/leaves/${id}`);
    return response.data as LeaveRequest;
  },
  create: async (data: Partial<LeaveRequest>) => {
    const response = await api.post('/leaves', data);
    return response.data as LeaveRequest;
  },
  update: async (id: string, data: Partial<LeaveRequest>) => {
    const response = await api.put(`/leaves/${id}`, data);
    return response.data as LeaveRequest;
  },
  delete: async (id: string) => {
    await api.delete(`/leaves/${id}`);
  },
  approve: async (id: string, approver_id: string) => {
    const response = await api.put(`/leaves/${id}/approve`, { approver_id });
    return response.data as LeaveRequest;
  },
  reject: async (id: string, approver_id: string, reason: string) => {
    const response = await api.put(`/leaves/${id}/reject`, {
      approver_id,
      reason,
    });
    return response.data as LeaveRequest;
  },
};

// ============= 薪资 API =============

export const payrollApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/payroll-runs${queryString}`);
    return response.data as PaginatedResult<PayrollRun>;
  },
  get: async (id: string) => {
    const response = await api.get(`/payroll-runs/${id}`);
    return response.data as { run: PayrollRun; items: PayrollItem[] };
  },
  create: async (data: { pay_period: string }) => {
    const response = await api.post('/payroll-runs', data);
    return response.data as PayrollRun;
  },
  delete: async (id: string) => {
    await api.delete(`/payroll-runs/${id}`);
  },
  calculate: async (id: string) => {
    const response = await api.put(`/payroll-runs/${id}/calculate`);
    return response.data as PayrollRun;
  },
  pay: async (id: string) => {
    const response = await api.put(`/payroll-runs/${id}/pay`);
    return response.data as PayrollRun;
  },
};

export const salaryAdjustmentApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/salary-adjustments${queryString}`);
    return response.data as PaginatedResult<SalaryAdjustment>;
  },
  get: async (id: string) => {
    const response = await api.get(`/salary-adjustments/${id}`);
    return response.data as SalaryAdjustment;
  },
  create: async (data: Partial<SalaryAdjustment>) => {
    const response = await api.post('/salary-adjustments', data);
    return response.data as SalaryAdjustment;
  },
  update: async (id: string, data: Partial<SalaryAdjustment>) => {
    const response = await api.put(`/salary-adjustments/${id}`, data);
    return response.data as SalaryAdjustment;
  },
  delete: async (id: string) => {
    await api.delete(`/salary-adjustments/${id}`);
  },
  approve: async (id: string, approverId: string) => {
    const response = await api.put(`/salary-adjustments/${id}/approve`, {
      approver_id: approverId,
    });
    return response.data as SalaryAdjustment;
  },
  reject: async (id: string, approverId: string, reason: string) => {
    const response = await api.put(`/salary-adjustments/${id}/reject`, {
      approver_id: approverId,
      reason,
    });
    return response.data as SalaryAdjustment;
  },
};

// ============= 绩效 API =============

export const performanceReviewApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/performance-reviews${queryString}`);
    return response.data as PaginatedResult<PerformanceReview>;
  },
  get: async (id: string) => {
    const response = await api.get(`/performance-reviews/${id}`);
    return response.data as PerformanceReview;
  },
  create: async (data: Partial<PerformanceReview>) => {
    const response = await api.post('/performance-reviews', data);
    return response.data as PerformanceReview;
  },
  update: async (id: string, data: Partial<PerformanceReview>) => {
    const response = await api.put(`/performance-reviews/${id}`, data);
    return response.data as PerformanceReview;
  },
  delete: async (id: string) => {
    await api.delete(`/performance-reviews/${id}`);
  },
  submit: async (id: string) => {
    const response = await api.put(`/performance-reviews/${id}/submit`);
    return response.data as PerformanceReview;
  },
  approve: async (id: string) => {
    const response = await api.put(`/performance-reviews/${id}/approve`);
    return response.data as PerformanceReview;
  },
};

export const performanceGoalApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/performance-goals${queryString}`);
    return response.data as PaginatedResult<PerformanceGoal>;
  },
  get: async (id: string) => {
    const response = await api.get(`/performance-goals/${id}`);
    return response.data as PerformanceGoal;
  },
  create: async (data: Partial<PerformanceGoal>) => {
    const response = await api.post('/performance-goals', data);
    return response.data as PerformanceGoal;
  },
  update: async (id: string, data: Partial<PerformanceGoal>) => {
    const response = await api.put(`/performance-goals/${id}`, data);
    return response.data as PerformanceGoal;
  },
  delete: async (id: string) => {
    await api.delete(`/performance-goals/${id}`);
  },
};

// ============= 培训 API =============

export const trainingPlanApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/training-plans${queryString}`);
    return response.data as PaginatedResult<TrainingPlan>;
  },
  get: async (id: string) => {
    const response = await api.get(`/training-plans/${id}`);
    return response.data as TrainingPlan;
  },
  create: async (data: Partial<TrainingPlan>) => {
    const response = await api.post('/training-plans', data);
    return response.data as TrainingPlan;
  },
  update: async (id: string, data: Partial<TrainingPlan>) => {
    const response = await api.put(`/training-plans/${id}`, data);
    return response.data as TrainingPlan;
  },
  delete: async (id: string) => {
    await api.delete(`/training-plans/${id}`);
  },
  activate: async (id: string) => {
    const response = await api.put(`/training-plans/${id}/activate`);
    return response.data as TrainingPlan;
  },
  deactivate: async (id: string) => {
    const response = await api.put(`/training-plans/${id}/deactivate`);
    return response.data as TrainingPlan;
  },
};

export const trainingCourseApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/training-courses${queryString}`);
    return response.data as PaginatedResult<TrainingCourse>;
  },
  get: async (id: string) => {
    const response = await api.get(`/training-courses/${id}`);
    return response.data as TrainingCourse;
  },
  create: async (data: Partial<TrainingCourse>) => {
    const response = await api.post('/training-courses', data);
    return response.data as TrainingCourse;
  },
  update: async (id: string, data: Partial<TrainingCourse>) => {
    const response = await api.put(`/training-courses/${id}`, data);
    return response.data as TrainingCourse;
  },
  delete: async (id: string) => {
    await api.delete(`/training-courses/${id}`);
  },
};

export const trainingRecordApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/training-records${queryString}`);
    return response.data as PaginatedResult<TrainingRecord>;
  },
  get: async (id: string) => {
    const response = await api.get(`/training-records/${id}`);
    return response.data as TrainingRecord;
  },
  create: async (data: Partial<TrainingRecord>) => {
    const response = await api.post('/training-records', data);
    return response.data as TrainingRecord;
  },
  update: async (id: string, data: Partial<TrainingRecord>) => {
    const response = await api.put(`/training-records/${id}`, data);
    return response.data as TrainingRecord;
  },
  delete: async (id: string) => {
    await api.delete(`/training-records/${id}`);
  },
  enroll: async (course_id: string, employee_id: string) => {
    const response = await api.post('/training-records/enroll', {
      course_id,
      employee_id,
    });
    return response.data as TrainingRecord;
  },
  complete: async (id: string, data: Partial<TrainingRecord>) => {
    const response = await api.put(`/training-records/${id}/complete`, data);
    return response.data as TrainingRecord;
  },
};

// ============= 招聘 API =============

export const jobOpeningApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/job-openings${queryString}`);
    return response.data as PaginatedResult<JobOpening>;
  },
  get: async (id: string) => {
    const response = await api.get(`/job-openings/${id}`);
    return response.data as JobOpening;
  },
  create: async (data: Partial<JobOpening>) => {
    const response = await api.post('/job-openings', data);
    return response.data as JobOpening;
  },
  update: async (id: string, data: Partial<JobOpening>) => {
    const response = await api.put(`/job-openings/${id}`, data);
    return response.data as JobOpening;
  },
  delete: async (id: string) => {
    await api.delete(`/job-openings/${id}`);
  },
  publish: async (id: string) => {
    const response = await api.put(`/job-openings/${id}/publish`);
    return response.data as JobOpening;
  },
  close: async (id: string) => {
    const response = await api.put(`/job-openings/${id}/close`);
    return response.data as JobOpening;
  },
};

export const candidateApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/candidates${queryString}`);
    return response.data as PaginatedResult<Candidate>;
  },
  get: async (id: string) => {
    const response = await api.get(`/candidates/${id}`);
    return response.data as Candidate;
  },
  create: async (data: Partial<Candidate>) => {
    const response = await api.post('/candidates', data);
    return response.data as Candidate;
  },
  update: async (id: string, data: Partial<Candidate>) => {
    const response = await api.put(`/candidates/${id}`, data);
    return response.data as Candidate;
  },
  delete: async (id: string) => {
    await api.delete(`/candidates/${id}`);
  },
};

// ============= 合同 API =============

export const contractApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/contracts${queryString}`);
    return response.data as PaginatedResult<Contract>;
  },
  get: async (id: string) => {
    const response = await api.get(`/contracts/${id}`);
    return response.data as Contract;
  },
  create: async (data: Partial<Contract>) => {
    const response = await api.post('/contracts', data);
    return response.data as Contract;
  },
  update: async (id: string, data: Partial<Contract>) => {
    const response = await api.put(`/contracts/${id}`, data);
    return response.data as Contract;
  },
  delete: async (id: string) => {
    await api.delete(`/contracts/${id}`);
  },
  getExpiring: async (params?: { days?: number; page?: number; page_size?: number }) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/contracts/expiring${queryString}`);
    return response.data as PaginatedResult<Contract>;
  },
};

// ============= 报表 API =============

export interface HrmReport {
  id: string;
  name: string;
  type: string;
  description?: string;
  parameters?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const reportApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/reports${queryString}`);
    return response.data as PaginatedResult<HrmReport>;
  },
  get: async (id: string) => {
    const response = await api.get(`/reports/${id}`);
    return response.data as HrmReport;
  },
  generate: async (id: string, parameters?: Record<string, any>) => {
    const response = await api.post(`/reports/${id}/generate`, { parameters });
    return response.data as { url: string };
  },
  getHeadcount: async () => {
    const response = await api.get('/reports/headcount');
    return response.data as {
      total: number;
      by_department: Array<{ department: string; count: number }>;
      by_status: Array<{ status: string; count: number }>;
    };
  },
  getAttendanceStats: async (params?: { start_date?: string; end_date?: string }) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/reports/attendance-stats${queryString}`);
    return response.data as {
      total_records: number;
      present: number;
      absent: number;
      late: number;
      leave: number;
    };
  },
  getPayrollStats: async (params?: { period?: string }) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/reports/payroll-stats${queryString}`);
    return response.data as {
      total_runs: number;
      total_amount: number;
      employee_count: number;
    };
  },
};

// ============= 统一导出 =============

export const hrmApi = {
  companies: companyApi,
  departments: departmentApi,
  employees: employeeApi,
  positions: positionApi,
  attendance: attendanceApi,
  leave: leaveApi,
  payroll: payrollApi,
  salaryAdjustments: salaryAdjustmentApi,
  performanceReviews: performanceReviewApi,
  performanceGoals: performanceGoalApi,
  trainingPlans: trainingPlanApi,
  trainingCourses: trainingCourseApi,
  trainingRecords: trainingRecordApi,
  jobOpenings: jobOpeningApi,
  candidates: candidateApi,
  contracts: contractApi,
  reports: reportApi,

  health: async (): Promise<string> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default hrmApi;
