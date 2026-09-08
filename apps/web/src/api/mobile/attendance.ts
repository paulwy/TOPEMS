/**
 * Mobile · 增强考勤管理 (Attendance) API 绑定
 *
 * 路由:
 *   GET    /mobile/attendance/overview
 *   GET    /mobile/attendance/records
 *   POST   /mobile/attendance/check-in
 *   POST   /mobile/attendance/check-out
 *   GET    /mobile/attendance/statistics
 *   GET    /mobile/attendance/shifts
 *   POST   /mobile/attendance/leaves
 *   GET    /mobile/attendance/leaves
 *   POST   /mobile/attendance/leaves/{id}/cancel
 *   POST   /mobile/attendance/clock-in
 *   POST   /mobile/attendance/clock-out
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type AttendanceStatus =
  'normal' | 'late' | 'early_leave' | 'absent' | 'leave' | 'business_trip' | 'remote';
export type LeaveType =
  'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'funeral' | 'compensatory' | 'other';
export type ShiftType = 'morning' | 'afternoon' | 'night' | 'flexible' | 'overtime';

export interface AttendanceOverview {
  today_status: 'not_checked_in' | 'checked_in' | 'checked_out' | 'leave' | 'business_trip';
  today_check_in?: string;
  today_check_out?: string;
  today_work_hours?: number;
  this_month_total: number;
  this_month_present: number;
  this_month_leave: number;
  this_month_late: number;
  this_month_absent: number;
  annual_leave_remaining: number;
  annual_leave_total: number;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  work_hours?: number;
  overtime_hours?: number;
  status: AttendanceStatus;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  check_in_method?: 'location' | 'qr_code' | 'face' | 'manual';
  shift_type?: ShiftType;
  note?: string;
  created_at: string;
}

export interface AttendanceStatistics {
  period: string;
  total_days: number;
  present_days: number;
  leave_days: number;
  late_days: number;
  early_leave_days: number;
  absent_days: number;
  business_trip_days: number;
  remote_days: number;
  avg_work_hours: number;
  total_overtime_hours: number;
  by_day: Array<{
    date: string;
    status: AttendanceStatus;
    hours: number;
  }>;
}

export interface Shift {
  id: string;
  name: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
  work_hours: number;
  is_active: boolean;
}

export interface LeaveApplication {
  id: string;
  user_id: string;
  user_name: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approver_name?: string;
  attachment_url?: string;
  created_at: string;
  updated_at: string;
}

interface CreateLeaveRequest {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  reason: string;
  attachment_url?: string;
}

export const attendanceApi = {
  getOverview: async (): Promise<ApiResponse<AttendanceOverview>> => {
    return apiClient.mobile.get('attendance/overview');
  },

  listRecords: async (params?: {
    month?: string;
    status?: AttendanceStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: AttendanceRecord[]; total: number }>> => {
    return apiClient.mobile.get('attendance/records', { params });
  },

  checkIn: async (data: {
    lat: number;
    lng: number;
    address?: string;
    method?: 'location' | 'qr_code' | 'face';
  }): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.mobile.post('attendance/check-in', data);
  },

  checkOut: async (data: {
    lat: number;
    lng: number;
    address?: string;
  }): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.mobile.post('attendance/check-out', data);
  },

  clockIn: async (): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.mobile.post('attendance/clock-in');
  },

  clockOut: async (): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.mobile.post('attendance/clock-out');
  },

  getStatistics: async (params?: {
    month?: string;
  }): Promise<ApiResponse<AttendanceStatistics>> => {
    return apiClient.mobile.get('attendance/statistics', { params });
  },

  listShifts: async (): Promise<ApiResponse<Shift[]>> => {
    return apiClient.mobile.get('attendance/shifts');
  },

  listLeaves: async (params?: {
    status?: LeaveApplication['status'];
    leave_type?: LeaveType;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: LeaveApplication[]; total: number }>> => {
    return apiClient.mobile.get('attendance/leaves', { params });
  },

  applyLeave: async (data: CreateLeaveRequest): Promise<ApiResponse<LeaveApplication>> => {
    return apiClient.mobile.post('attendance/leaves', data);
  },

  cancelLeave: async (id: string): Promise<ApiResponse<LeaveApplication>> => {
    return apiClient.mobile.post(`attendance/leaves/${id}/cancel`);
  },
};

export default attendanceApi;
