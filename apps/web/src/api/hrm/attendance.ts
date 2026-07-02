import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { AttendanceRecord, ListParams, PaginatedResult } from './types';
import { buildQueryString } from './types';

export const attendanceApi = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<AttendanceRecord>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/attendance${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/attendance/${id}`);
  },

  create: (data: Partial<AttendanceRecord>) => {
    return apiClient.hrm.post('/attendance', data);
  },

  update: (id: string, data: Partial<AttendanceRecord>) => {
    return apiClient.hrm.put(`/attendance/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/attendance/${id}`);
  },

  checkIn(employee_id: string): Promise<ApiResponse<AttendanceRecord>> {
    return apiClient.hrm.post('/attendance/check-in', { employee_id });
  },

  checkOut(employee_id: string): Promise<ApiResponse<AttendanceRecord>> {
    return apiClient.hrm.post('/attendance/check-out', { employee_id });
  },
};

export default attendanceApi;
