import type { ApiResponse, PaginationParams as BasePaginationParams } from '../client';

import type { PaginatedResult } from '@/api/client';

export interface Company {
  id: string;
  tenant_id: string;
  name: string;
  code?: string;
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
  parentId?: string;
  org_id?: string;
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
  id_number?: string;
  hire_date?: string;
  regular_date?: string;
  probation_period?: number;
  department_id?: string;
  department_name?: string;
  position?: string;
  joblevel?: string;
  work_location?: string;
  report_to_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  education?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  emergency_relation?: string;
  hukou_location?: string;
  remark?: string;
  employee_type?: string;
  status: string;
  user_id?: string;
  org_id?: string;
  position_id?: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
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
  payrollitem_id: string;
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
  employee_name?: string;
  employee_no?: string;
  contractNo?: string;
  contract_type: string;
  contract_name?: string;
  department?: string;
  position?: string;
  party_a_name?: string;
  party_a_contact?: string;
  party_b_name?: string;
  party_b_contact?: string;
  start_date: string;
  end_date?: string;
  salary?: number;
  probation_period?: number;
  probation_period_days?: number;
  probation_end_date?: string;
  salary_type?: string;
  base_salary?: number;
  currency?: string;
  work_location?: string;
  contract_file?: string;
  contract_file_path?: string;
  reminder_days?: number;
  status: string;
  notes?: string;
  remark?: string;
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

export interface PaginationParams extends BasePaginationParams {
  status?: string;
  employee_id?: string;
  department_id?: string;
}
export type { PaginatedResult };

export interface ListParams {
  page?: number;
  pagesize?: number;
  [key: string]: string | number | undefined;
}

export function buildQueryString(params?: ListParams): string {
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

export interface CrudOperations<T> {
  list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<T>>>;
  get: (id: string) => Promise<ApiResponse<T>>;
  create: (data: Partial<T>) => Promise<ApiResponse<T>>;
  update: (id: string, data: Partial<T>) => Promise<ApiResponse<T>>;
  delete: (id: string) => Promise<ApiResponse<string>>;
}
