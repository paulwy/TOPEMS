import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export interface ReportParams {
  start_date?: string;
  end_date?: string;
  department_id?: string;
  time_range?: 'week' | 'month' | 'quarter' | 'year';
}

export interface EmployeeSummary {
  total_count: number;
  active_count: number;
  new_hires: number;
  terminations: number;
  by_department: Record<string, unknown>[];
  by_position: Record<string, unknown>[];
  by_age_group: Record<string, unknown>[];
  by_gender: Record<string, unknown>[];
}

export interface DepartmentSummary {
  department_id?: string;
  department_name: string;
  employee_count: number;
  active_count: number;
  avg_salary?: number;
  total_salary?: number;
  headcount_change?: number;
}

export interface ContractSummary {
  total_contracts: number;
  active_contracts: number;
  expiring_soon: number;
  expired_contracts: number;
  by_type: Record<string, unknown>[];
  by_status: Record<string, unknown>[];
}

export interface TrainingSummary {
  total_trainings: number;
  completed_count: number;
  in_progress_count: number;
  planned_count: number;
  total_participants: number;
  completion_rate?: number;
  by_type: Record<string, unknown>[];
}

export interface AttendanceSummary {
  total_records: number;
  present_count: number;
  absent_count: number;
  leave_count: number;
  late_count: number;
  early_leave_count: number;
  attendance_rate?: number;
  by_department: Record<string, unknown>[];
}

export interface PayrollSummary {
  total_payments: number;
  total_amount: number;
  average_amount?: number;
  by_department: Record<string, unknown>[];
  by_type: Record<string, unknown>[];
  status_breakdown: Record<string, unknown>[];
}

export const hrmReportsApi = {
  async getEmployeeSummary(params?: ReportParams): Promise<ApiResponse<EmployeeSummary>> {
    const qs = new URLSearchParams();
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    if (params?.department_id) qs.set('department_id', params.department_id);
    if (params?.time_range) qs.set('time_range', params.time_range);
    const s = qs.toString();
    return apiClient.hrm.get<EmployeeSummary>(`/reports/employee-summary${s ? `?${s}` : ''}`);
  },

  async getDepartmentSummary(params?: ReportParams): Promise<ApiResponse<DepartmentSummary[]>> {
    const qs = new URLSearchParams();
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    if (params?.department_id) qs.set('department_id', params.department_id);
    if (params?.time_range) qs.set('time_range', params.time_range);
    const s = qs.toString();
    return apiClient.hrm.get<DepartmentSummary[]>(`/reports/department-summary${s ? `?${s}` : ''}`);
  },

  async getContractSummary(params?: ReportParams): Promise<ApiResponse<ContractSummary>> {
    const qs = new URLSearchParams();
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    if (params?.department_id) qs.set('department_id', params.department_id);
    if (params?.time_range) qs.set('time_range', params.time_range);
    const s = qs.toString();
    return apiClient.hrm.get<ContractSummary>(`/reports/contract-summary${s ? `?${s}` : ''}`);
  },

  async getTrainingSummary(params?: ReportParams): Promise<ApiResponse<TrainingSummary>> {
    const qs = new URLSearchParams();
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    if (params?.department_id) qs.set('department_id', params.department_id);
    if (params?.time_range) qs.set('time_range', params.time_range);
    const s = qs.toString();
    return apiClient.hrm.get<TrainingSummary>(`/reports/training-summary${s ? `?${s}` : ''}`);
  },

  async getAttendanceSummary(params?: ReportParams): Promise<ApiResponse<AttendanceSummary>> {
    const qs = new URLSearchParams();
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    if (params?.department_id) qs.set('department_id', params.department_id);
    if (params?.time_range) qs.set('time_range', params.time_range);
    const s = qs.toString();
    return apiClient.hrm.get<AttendanceSummary>(`/reports/attendance-summary${s ? `?${s}` : ''}`);
  },

  async getPayrollSummary(params?: ReportParams): Promise<ApiResponse<PayrollSummary>> {
    const qs = new URLSearchParams();
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    if (params?.department_id) qs.set('department_id', params.department_id);
    if (params?.time_range) qs.set('time_range', params.time_range);
    const s = qs.toString();
    return apiClient.hrm.get<PayrollSummary>(`/reports/payroll-summary${s ? `?${s}` : ''}`);
  },
};
