import apiClient from './client';
import type { ApiResponse } from './client';

export interface SafetyHazard {
  id: string;
  hazard_no: string;
  name: string;
  category: string;
  level: string;
  description: string;
  location: string;
  control_measures: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSafetyHazardRequest {
  hazard_no: string;
  name: string;
  category: string;
  level: string;
  description: string;
  location: string;
  control_measures: string[];
  status: string;
}

export interface SafetyCheck {
  id: string;
  check_no: string;
  check_type: string;
  inspector: string;
  check_date: string;
  location: string;
  result: string;
  issues: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSafetyCheckRequest {
  check_no: string;
  check_type: string;
  inspector: string;
  location: string;
  result: string;
  issues: string[];
  status: string;
}

export interface EmergencyPlan {
  id: string;
  plan_no: string;
  name: string;
  plan_type: string;
  scope: string;
  trigger_conditions: string;
  response_procedures: string;
  responsible_persons: string[];
  contact_info: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEmergencyPlanRequest {
  plan_no: string;
  name: string;
  plan_type: string;
  scope: string;
  trigger_conditions: string;
  response_procedures: string;
  responsible_persons: string[];
  contact_info: string;
  status: string;
}

export interface DrillRecord {
  id: string;
  drill_no: string;
  plan_id?: string;
  drill_name: string;
  drill_date: string;
  participants: string[];
  duration_hours: number;
  location: string;
  summary: string;
  issues_found: string;
  improvements: string;
  created_at: string;
}

export interface CreateDrillRecordRequest {
  drill_no: string;
  plan_id?: string;
  drill_name: string;
  participants: string[];
  duration_hours: number;
  location: string;
  summary: string;
  issues_found: string;
  improvements: string;
}

export const ehsApi = {
  // Safety Hazards
  listHazards: async (): Promise<ApiResponse<SafetyHazard[]>> => {
    return apiClient.ehs.get<SafetyHazard[]>('/api/v1/hazards');
  },
  getHazard: async (id: string): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.get<SafetyHazard>(`/api/v1/hazards/${id}`);
  },
  createHazard: async (data: CreateSafetyHazardRequest): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.post<SafetyHazard>('/api/v1/hazards', data);
  },
  updateHazard: async (id: string, data: CreateSafetyHazardRequest): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.put<SafetyHazard>(`/api/v1/hazards/${id}`, data);
  },
  deleteHazard: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.ehs.delete<boolean>(`/api/v1/hazards/${id}`);
  },

  // Safety Checks
  listChecks: async (): Promise<ApiResponse<SafetyCheck[]>> => {
    return apiClient.ehs.get<SafetyCheck[]>('/api/v1/checks');
  },
  getCheck: async (id: string): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.get<SafetyCheck>(`/api/v1/checks/${id}`);
  },
  createCheck: async (data: CreateSafetyCheckRequest): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.post<SafetyCheck>('/api/v1/checks', data);
  },
  updateCheck: async (id: string, data: CreateSafetyCheckRequest): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.put<SafetyCheck>(`/api/v1/checks/${id}`, data);
  },
  deleteCheck: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.ehs.delete<boolean>(`/api/v1/checks/${id}`);
  },

  // Emergency Plans
  listPlans: async (): Promise<ApiResponse<EmergencyPlan[]>> => {
    return apiClient.ehs.get<EmergencyPlan[]>('/api/v1/plans');
  },
  getPlan: async (id: string): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.get<EmergencyPlan>(`/api/v1/plans/${id}`);
  },
  createPlan: async (data: CreateEmergencyPlanRequest): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.post<EmergencyPlan>('/api/v1/plans', data);
  },
  updatePlan: async (id: string, data: CreateEmergencyPlanRequest): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.put<EmergencyPlan>(`/api/v1/plans/${id}`, data);
  },
  deletePlan: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.ehs.delete<boolean>(`/api/v1/plans/${id}`);
  },

  // Drill Records
  listDrills: async (): Promise<ApiResponse<DrillRecord[]>> => {
    return apiClient.ehs.get<DrillRecord[]>('/api/v1/drills');
  },
  getDrill: async (id: string): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.get<DrillRecord>(`/api/v1/drills/${id}`);
  },
  createDrill: async (data: CreateDrillRecordRequest): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.post<DrillRecord>('/api/v1/drills', data);
  },
  updateDrill: async (id: string, data: CreateDrillRecordRequest): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.put<DrillRecord>(`/api/v1/drills/${id}`, data);
  },
  deleteDrill: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.ehs.delete<boolean>(`/api/v1/drills/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.ehs.get<string>('/health');
  },
};
