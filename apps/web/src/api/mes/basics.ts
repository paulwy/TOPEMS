import apiClient from '../client';
import type { ApiResponse, PaginationParams } from '../client';

// ==================== 车间 ====================

export interface Workshop {
  id: string;
  code: string;
  name: string;
  location?: string | null;
  manager?: string | null;
  status: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkshopRequest {
  code: string;
  name: string;
  location?: string;
  manager?: string;
  status?: string;
  description?: string;
}

export interface UpdateWorkshopRequest {
  name?: string;
  location?: string;
  manager?: string;
  status?: string;
  description?: string;
}

export interface WorkshopListResponse {
  items: Workshop[];
  total: number;
  page: number;
  page_size: number;
}

export const workshopApi = {
  list: (params: PaginationParams & { search?: string; status?: string }) =>
    apiClient.get<ApiResponse<WorkshopListResponse>>('/api/mes/workshops', { params }),
  get: (id: string) => apiClient.get<ApiResponse<Workshop>>(`/api/mes/workshops/${id}`),
  create: (data: CreateWorkshopRequest) =>
    apiClient.post<ApiResponse<{ id: string }>>('/api/mes/workshops', data),
  update: (id: string, data: UpdateWorkshopRequest) =>
    apiClient.put<ApiResponse<{ id: string }>>(`/api/mes/workshops/${id}`, data),
  remove: (id: string) => apiClient.delete<ApiResponse<string>>(`/api/mes/workshops/${id}`),
};

// ==================== 产线 ====================

export interface ProductionLine {
  id: string;
  code: string;
  name: string;
  workshop_id?: string | null;
  description?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionLineRequest {
  code: string;
  name: string;
  workshop_id?: string;
  description?: string;
  status?: string;
}

export interface UpdateProductionLineRequest {
  name?: string;
  workshop_id?: string;
  description?: string;
  status?: string;
}

export interface ProductionLineListResponse {
  items: ProductionLine[];
  total: number;
  page: number;
  page_size: number;
}

export const productionLineApi = {
  list: (params: PaginationParams & { search?: string; status?: string }) =>
    apiClient.get<ApiResponse<ProductionLineListResponse>>('/api/mes/production-lines', { params }),
  get: (id: string) =>
    apiClient.get<ApiResponse<ProductionLine>>(`/api/mes/production-lines/${id}`),
  create: (data: CreateProductionLineRequest) =>
    apiClient.post<ApiResponse<{ id: string }>>('/api/mes/production-lines', data),
  update: (id: string, data: UpdateProductionLineRequest) =>
    apiClient.put<ApiResponse<{ id: string }>>(`/api/mes/production-lines/${id}`, data),
  remove: (id: string) => apiClient.delete<ApiResponse<string>>(`/api/mes/production-lines/${id}`),
};

// ==================== 班次 ====================

export interface Shift {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  is_overnight: boolean;
  status: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateShiftRequest {
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  is_overnight?: boolean;
  status?: string;
  description?: string;
}

export interface UpdateShiftRequest {
  name?: string;
  start_time?: string;
  end_time?: string;
  is_overnight?: boolean;
  status?: string;
  description?: string;
}

export interface ShiftListResponse {
  items: Shift[];
  total: number;
  page: number;
  page_size: number;
}

export const shiftApi = {
  list: (params: PaginationParams & { search?: string; status?: string }) =>
    apiClient.get<ApiResponse<ShiftListResponse>>('/api/mes/shifts', { params }),
  get: (id: string) => apiClient.get<ApiResponse<Shift>>(`/api/mes/shifts/${id}`),
  create: (data: CreateShiftRequest) =>
    apiClient.post<ApiResponse<{ id: string }>>('/api/mes/shifts', data),
  update: (id: string, data: UpdateShiftRequest) =>
    apiClient.put<ApiResponse<{ id: string }>>(`/api/mes/shifts/${id}`, data),
  remove: (id: string) => apiClient.delete<ApiResponse<string>>(`/api/mes/shifts/${id}`),
};

// ==================== 工作日历 ====================

export interface WorkCalendar {
  id: string;
  code: string;
  name: string;
  calendar_type: string;
  work_date: string;
  shift_id?: string | null;
  is_working: boolean;
  remark?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkCalendarRequest {
  code: string;
  name: string;
  calendar_type?: string;
  work_date: string;
  shift_id?: string;
  is_working?: boolean;
  remark?: string;
}

export interface UpdateWorkCalendarRequest {
  name?: string;
  calendar_type?: string;
  work_date?: string;
  shift_id?: string;
  is_working?: boolean;
  remark?: string;
}

export interface WorkCalendarListResponse {
  items: WorkCalendar[];
  total: number;
  page: number;
  page_size: number;
}

export const workCalendarApi = {
  list: (params: PaginationParams & { search?: string; calendarType?: string }) =>
    apiClient.get<ApiResponse<WorkCalendarListResponse>>('/api/mes/work-calendars', { params }),
  get: (id: string) => apiClient.get<ApiResponse<WorkCalendar>>(`/api/mes/work-calendars/${id}`),
  create: (data: CreateWorkCalendarRequest) =>
    apiClient.post<ApiResponse<{ id: string }>>('/api/mes/work-calendars', data),
  update: (id: string, data: UpdateWorkCalendarRequest) =>
    apiClient.put<ApiResponse<{ id: string }>>(`/api/mes/work-calendars/${id}`, data),
  remove: (id: string) => apiClient.delete<ApiResponse<string>>(`/api/mes/work-calendars/${id}`),
};
