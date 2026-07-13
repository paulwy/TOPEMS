import type { ApiResponse, AttendanceRecord, AttendanceStats } from '@/types';

const mockAttendanceRecords: AttendanceRecord[] = [
  { id: '1', userId: 'user-001', userName: '张三', checkInTime: '2024-01-15T08:30:00Z', checkOutTime: '2024-01-15T17:30:00Z', date: '2024-01-15', locationLat: 31.2304, locationLng: 121.4737, status: 'normal', createdAt: '2024-01-15T08:30:00Z', updatedAt: '2024-01-15T17:30:00Z' },
  { id: '2', userId: 'user-001', userName: '张三', checkInTime: '2024-01-14T09:15:00Z', checkOutTime: '2024-01-14T18:00:00Z', date: '2024-01-14', locationLat: 31.2304, locationLng: 121.4737, status: 'late', createdAt: '2024-01-14T09:15:00Z', updatedAt: '2024-01-14T18:00:00Z' },
  { id: '3', userId: 'user-001', userName: '张三', checkInTime: '2024-01-13T08:00:00Z', checkOutTime: '2024-01-13T17:00:00Z', date: '2024-01-13', locationLat: 31.2304, locationLng: 121.4737, status: 'normal', createdAt: '2024-01-13T08:00:00Z', updatedAt: '2024-01-13T17:00:00Z' },
  { id: '4', userId: 'user-001', userName: '张三', checkInTime: '2024-01-12T08:20:00Z', checkOutTime: '2024-01-12T16:30:00Z', date: '2024-01-12', locationLat: 31.2304, locationLng: 121.4737, status: 'early_leave', createdAt: '2024-01-12T08:20:00Z', updatedAt: '2024-01-12T16:30:00Z' },
  { id: '5', userId: 'user-001', userName: '张三', checkInTime: '2024-01-11T08:45:00Z', checkOutTime: '2024-01-11T19:30:00Z', date: '2024-01-11', locationLat: 31.2304, locationLng: 121.4737, status: 'overtime', createdAt: '2024-01-11T08:45:00Z', updatedAt: '2024-01-11T19:30:00Z' },
  { id: '6', userId: 'user-001', userName: '张三', checkInTime: '2024-01-10T08:30:00Z', checkOutTime: '2024-01-10T17:30:00Z', date: '2024-01-10', locationLat: 31.2304, locationLng: 121.4737, status: 'normal', createdAt: '2024-01-10T08:30:00Z', updatedAt: '2024-01-10T17:30:00Z' },
  { id: '7', userId: 'user-001', userName: '张三', checkInTime: '2024-01-09T08:30:00Z', checkOutTime: '2024-01-09T17:30:00Z', date: '2024-01-09', locationLat: 31.2304, locationLng: 121.4737, status: 'normal', createdAt: '2024-01-09T08:30:00Z', updatedAt: '2024-01-09T17:30:00Z' },
];

const mockAttendanceStats: AttendanceStats = {
  totalDays: 30,
  presentDays: 25,
  lateDays: 3,
  absentDays: 2,
  overtimeHours: 15,
  attendanceDays: 25,
  lateCount: 3,
  earlyLeaveCount: 1,
  absentCount: 2,
};

export function mockGetAttendanceStats(): ApiResponse<AttendanceStats> {
  return { success: true, data: mockAttendanceStats };
}

export function mockGetAttendanceRecords(params: { page?: number; pageSize?: number; startDate?: string; endDate?: string }): ApiResponse<{ items: AttendanceRecord[]; total: number }> {
  let filtered = [...mockAttendanceRecords];
  
  const startDate = params?.startDate;
  if (startDate) {
    filtered = filtered.filter(record => record.date && record.date >= startDate);
  }
  
  const endDate = params?.endDate;
  if (endDate) {
    filtered = filtered.filter(record => record.date && record.date <= endDate);
  }
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    success: true,
    data: {
      items: filtered.slice(start, end),
      total: filtered.length,
    },
  };
}

export function mockGetTodayRecord(): ApiResponse<AttendanceRecord | null> {
  return { success: true, data: mockAttendanceRecords[0] };
}

export function mockCheckIn(data: { locationLat?: number; locationLng?: number }): ApiResponse<AttendanceRecord> {
  return {
    success: true,
    data: {
      id: 'NEW-' + Date.now(),
      userId: 'user-001',
      userName: '张三',
      checkInTime: new Date().toISOString(),
      checkOutTime: undefined,
      date: new Date().toISOString().split('T')[0],
      locationLat: data.locationLat || 31.2304,
      locationLng: data.locationLng || 121.4737,
      status: 'normal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function mockCheckOut(data: { locationLat?: number; locationLng?: number }): ApiResponse<AttendanceRecord> {
  return {
    success: true,
    data: {
      id: 'NEW-' + Date.now(),
      userId: 'user-001',
      userName: '张三',
      checkInTime: '2024-01-15T08:30:00Z',
      checkOutTime: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      locationLat: data.locationLat || 31.2304,
      locationLng: data.locationLng || 121.4737,
      status: 'normal',
      createdAt: '2024-01-15T08:30:00Z',
      updatedAt: new Date().toISOString(),
    },
  };
}