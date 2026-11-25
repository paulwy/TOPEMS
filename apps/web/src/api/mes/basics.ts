import apiClient from '../client';
import type { PaginationParams } from '../client';

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
    apiClient.mes.get<WorkshopListResponse>('/workshops', { params }),
  get: (id: string) => apiClient.mes.get<Workshop>(`/workshops/${id}`),
  create: (data: CreateWorkshopRequest) => apiClient.mes.post<{ id: string }>('/workshops', data),
  update: (id: string, data: UpdateWorkshopRequest) =>
    apiClient.mes.put<{ id: string }>(`/workshops/${id}`, data),
  remove: (id: string) => apiClient.mes.delete<string>(`/workshops/${id}`),
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
    apiClient.mes.get<ProductionLineListResponse>('/production-lines', { params }),
  get: (id: string) => apiClient.mes.get<ProductionLine>(`/production-lines/${id}`),
  create: (data: CreateProductionLineRequest) =>
    apiClient.mes.post<{ id: string }>('/production-lines', data),
  update: (id: string, data: UpdateProductionLineRequest) =>
    apiClient.mes.put<{ id: string }>(`/production-lines/${id}`, data),
  remove: (id: string) => apiClient.mes.delete<string>(`/production-lines/${id}`),
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
    apiClient.mes.get<ShiftListResponse>('/shifts', { params }),
  get: (id: string) => apiClient.mes.get<Shift>(`/shifts/${id}`),
  create: (data: CreateShiftRequest) => apiClient.mes.post<{ id: string }>('/shifts', data),
  update: (id: string, data: UpdateShiftRequest) =>
    apiClient.mes.put<{ id: string }>(`/shifts/${id}`, data),
  remove: (id: string) => apiClient.mes.delete<string>(`/shifts/${id}`),
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
    apiClient.mes.get<WorkCalendarListResponse>('/work-calendars', { params }),
  get: (id: string) => apiClient.mes.get<WorkCalendar>(`/work-calendars/${id}`),
  create: (data: CreateWorkCalendarRequest) =>
    apiClient.mes.post<{ id: string }>('/work-calendars', data),
  update: (id: string, data: UpdateWorkCalendarRequest) =>
    apiClient.mes.put<{ id: string }>(`/work-calendars/${id}`, data),
  remove: (id: string) => apiClient.mes.delete<string>(`/work-calendars/${id}`),
};
