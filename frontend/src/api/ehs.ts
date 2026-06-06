import apiClient from './client';
import type { ApiResponse } from './client';

export interface SafetyHazard {
  id: string;
  hazard_no: string;
  name: string;
  category: string;
  level: string;
  description: string | null;
  location: string | null;
  risk_assessment: string | null;
  control_measures: any;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSafetyHazardRequest {
  hazard_no: string;
  name: string;
  category: string;
  level: string;
  description?: string | null;
  location?: string | null;
  risk_assessment?: string | null;
  control_measures: string[];
  status: string;
}

export interface SafetyCheck {
  id: string;
  check_no: string;
  check_type: string;
  inspector: string;
  check_date: string | null;
  location: string | null;
  result: string;
  issues: any;
  attachments: any | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSafetyCheckRequest {
  check_no: string;
  check_type: string;
  inspector: string;
  check_date?: string | null;
  location?: string | null;
  result: string;
  issues: string[];
  attachments?: string[] | null;
  status: string;
}

export interface EmergencyPlan {
  id: string;
  plan_no: string;
  name: string;
  plan_type: string;
  scope: string | null;
  trigger_conditions: string | null;
  response_procedures: string | null;
  responsible_persons: any;
  contact_info: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEmergencyPlanRequest {
  plan_no: string;
  name: string;
  plan_type: string;
  scope?: string | null;
  trigger_conditions?: string | null;
  response_procedures?: string | null;
  responsible_persons: string[];
  contact_info?: string | null;
  status: string;
}

export interface DrillRecord {
  id: string;
  drill_no: string;
  plan_id: string | null;
  drill_name: string;
  drill_date: string | null;
  participants: any;
  duration_hours: number;
  location: string | null;
  summary: string | null;
  issues_found: string | null;
  improvements: string | null;
  attachments: any | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDrillRecordRequest {
  drill_no: string;
  plan_id?: string | null;
  drill_name: string;
  drill_date?: string | null;
  participants: string[];
  duration_hours: number;
  location?: string | null;
  summary?: string | null;
  issues_found?: string | null;
  improvements?: string | null;
  attachments?: string[] | null;
}

export interface ListQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const ehsApi = {
  // Safety Hazards
  listHazards: async (params?: ListQueryParams): Promise<ApiResponse<PaginatedResponse<SafetyHazard>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    
    return apiClient.ehs.get<PaginatedResponse<SafetyHazard>>(`/api/v1/hazards?${queryParams.toString()}`);
  },
  getHazard: async (id: string): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.get<SafetyHazard>(`/api/v1/hazards/${id}`);
  },
  createHazard: async (data: CreateSafetyHazardRequest): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.post<SafetyHazard>('/api/v1/hazards', data);
  },
  updateHazard: async (id: string, data: Partial<CreateSafetyHazardRequest>): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.put<SafetyHazard>(`/api/v1/hazards/${id}`, data);
  },
  deleteHazard: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/v1/hazards/${id}`);
  },

  // Safety Checks
  listChecks: async (params?: ListQueryParams): Promise<ApiResponse<PaginatedResponse<SafetyCheck>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    
    return apiClient.ehs.get<PaginatedResponse<SafetyCheck>>(`/api/v1/checks?${queryParams.toString()}`);
  },
  getCheck: async (id: string): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.get<SafetyCheck>(`/api/v1/checks/${id}`);
  },
  createCheck: async (data: CreateSafetyCheckRequest): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.post<SafetyCheck>('/api/v1/checks', data);
  },
  updateCheck: async (id: string, data: Partial<CreateSafetyCheckRequest>): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.put<SafetyCheck>(`/api/v1/checks/${id}`, data);
  },
  deleteCheck: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/v1/checks/${id}`);
  },

  // Emergency Plans
  listPlans: async (params?: ListQueryParams): Promise<ApiResponse<PaginatedResponse<EmergencyPlan>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    
    return apiClient.ehs.get<PaginatedResponse<EmergencyPlan>>(`/api/v1/plans?${queryParams.toString()}`);
  },
  getPlan: async (id: string): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.get<EmergencyPlan>(`/api/v1/plans/${id}`);
  },
  createPlan: async (data: CreateEmergencyPlanRequest): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.post<EmergencyPlan>('/api/v1/plans', data);
  },
  updatePlan: async (id: string, data: Partial<CreateEmergencyPlanRequest>): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.put<EmergencyPlan>(`/api/v1/plans/${id}`, data);
  },
  deletePlan: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/v1/plans/${id}`);
  },

  // Drill Records
  listDrills: async (params?: ListQueryParams): Promise<ApiResponse<PaginatedResponse<DrillRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    return apiClient.ehs.get<PaginatedResponse<DrillRecord>>(`/api/v1/drills?${queryParams.toString()}`);
  },
  getDrill: async (id: string): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.get<DrillRecord>(`/api/v1/drills/${id}`);
  },
  createDrill: async (data: CreateDrillRecordRequest): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.post<DrillRecord>('/api/v1/drills', data);
  },
  updateDrill: async (id: string, data: Partial<CreateDrillRecordRequest>): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.put<DrillRecord>(`/api/v1/drills/${id}`, data);
  },
  deleteDrill: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/v1/drills/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.ehs.get<string>('/health');
  },
};
