import { apiClient } from './client';
import type { ApiResponse, AttendanceRecord } from '@/types';

export const attendanceApi = {
  getTodayRecord: async (): Promise<ApiResponse<AttendanceRecord | null>> => {
    return apiClient.get('/attendance/today');
  },

  checkIn: async (): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.post('/attendance/check-in');
  },

  checkOut: async (): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.post('/attendance/check-out');
  },

  getRecords: async (params: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ items: AttendanceRecord[]; total: number }>> => {
    return apiClient.get('/attendance', { params });
  },

  getRecordById: async (id: string): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.get(`/attendance/${id}`);
  },

  createRecord: async (data: {
    checkInTime: string;
    checkOutTime?: string;
    status?: string;
    note?: string;
  }): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.post('/attendance', data);
  },

  updateRecord: async (
    id: string,
    data: {
      checkInTime?: string;
      checkOutTime?: string;
      status?: string;
      note?: string;
    }
  ): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.put(`/attendance/${id}`, data);
  },

  deleteRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/attendance/${id}`);
  },
};