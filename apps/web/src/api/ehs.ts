import apiClient from "./client";
import type { ApiResponse } from "./client";

// ============ Safety Hazard Types ============
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
  severity?: "high" | "medium" | "low";
  exposure?: "high" | "medium" | "low";
  likelihood?: "high" | "medium" | "low";
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

// ============ Extended Hazard Types for Detail Page ============
export interface Hazard {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  location: string | null;
  severity: "high" | "medium" | "low";
  exposure: "high" | "medium" | "low";
  likelihood: "high" | "medium" | "low";
  status: "active" | "controlled" | "eliminated" | "archived";
  created_at: string;
  updated_at: string;
}

export interface RiskAssessment {
  id: string;
  hazard_id: string;
  assessment_date: string | null;
  assessor: string | null;
  severity: "high" | "medium" | "low";
  likelihood: "high" | "medium" | "low";
  risk_level: string | null;
  recommendations: string | null;
  created_at: string;
}

export interface ControlMeasure {
  id: string;
  hazard_id: string;
  measure_type: "engineering" | "administrative" | "ppe";
  description: string | null;
  responsible: string | null;
  deadline: string | null;
  status: "pending" | "in_progress" | "completed" | "verified";
  effectiveness: string | null;
  created_at: string;
}

export interface CreateRiskAssessmentRequest {
  hazard_id: string;
  assessment_date?: string | null;
  assessor?: string | null;
  severity?: "high" | "medium" | "low";
  likelihood?: "high" | "medium" | "low";
  recommendations?: string | null;
}

export interface CreateControlMeasureRequest {
  measure_type: "engineering" | "administrative" | "ppe";
  description?: string | null;
  responsible?: string | null;
  deadline?: string | null;
  status?: "pending" | "in_progress" | "completed" | "verified";
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

// ============ Incident Types ============
export interface Incident {
  id: string;
  title: string;
  description: string | null;
  incident_type:
    | "near_miss"
    | "accident"
    | "injury"
    | "environmental"
    | "equipment";
  severity: "near_miss" | "minor" | "serious" | "fatal";
  location: string | null;
  reported_by: string | null;
  reported_at: string | null;
  status: "pending" | "investigating" | "resolved" | "closed";
  root_cause: string | null;
  corrective_actions: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentAction {
  id: string;
  incident_id: string;
  action_type: "investigation" | "correction" | "prevention";
  description: string | null;
  responsible: string | null;
  due_date: string | null;
  status: "pending" | "in_progress" | "completed" | "verified";
  completion_date: string | null;
  created_at: string;
}

export interface CreateIncidentRequest {
  title: string;
  description?: string | null;
  incident_type:
    | "near_miss"
    | "accident"
    | "injury"
    | "environmental"
    | "equipment";
  severity: "near_miss" | "minor" | "serious" | "fatal";
  location?: string | null;
  reported_by?: string | null;
  reported_at?: string | null;
  status?: "pending" | "investigating" | "resolved" | "closed";
}

export interface CreateIncidentActionRequest {
  incident_id: string;
  action_type: "investigation" | "correction" | "prevention";
  description: string | null;
  responsible?: string | null;
  due_date?: string | null;
  status?: "pending" | "in_progress" | "completed" | "verified";
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
  listHazards: async (
    params?: ListQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<SafetyHazard>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size)
      queryParams.append("page_size", params.page_size.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.status) queryParams.append("status", params.status);

    return apiClient.ehs.get<PaginatedResponse<SafetyHazard>>(
      `/api/v1/hazards?${queryParams.toString()}`,
    );
  },
  getHazard: async (id: string): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.get<SafetyHazard>(`/api/v1/hazards/${id}`);
  },
  createHazard: async (
    data: CreateSafetyHazardRequest,
  ): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.post<SafetyHazard>("/api/v1/hazards", data);
  },
  updateHazard: async (
    id: string,
    data: Partial<CreateSafetyHazardRequest>,
  ): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.put<SafetyHazard>(`/api/v1/hazards/${id}`, data);
  },
  deleteHazard: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/v1/hazards/${id}`);
  },

  // Risk Assessments
  listRiskAssessments: async (
    hazardId: string,
  ): Promise<ApiResponse<PaginatedResponse<RiskAssessment>>> => {
    return apiClient.ehs.get<PaginatedResponse<RiskAssessment>>(
      `/api/v1/hazards/${hazardId}/assessments`,
    );
  },
  createRiskAssessment: async (
    hazardId: string,
    data: CreateRiskAssessmentRequest,
  ): Promise<ApiResponse<RiskAssessment>> => {
    return apiClient.ehs.post<RiskAssessment>(
      `/api/v1/hazards/${hazardId}/assessments`,
      data,
    );
  },
  updateRiskAssessment: async (
    hazardId: string,
    assessmentId: string,
    data: Partial<CreateRiskAssessmentRequest>,
  ): Promise<ApiResponse<RiskAssessment>> => {
    return apiClient.ehs.put<RiskAssessment>(
      `/api/v1/hazards/${hazardId}/assessments/${assessmentId}`,
      data,
    );
  },

  // Control Measures
  listControlMeasures: async (
    hazardId: string,
  ): Promise<ApiResponse<PaginatedResponse<ControlMeasure>>> => {
    return apiClient.ehs.get<PaginatedResponse<ControlMeasure>>(
      `/api/v1/hazards/${hazardId}/controls`,
    );
  },
  createControlMeasure: async (
    hazardId: string,
    data: CreateControlMeasureRequest,
  ): Promise<ApiResponse<ControlMeasure>> => {
    return apiClient.ehs.post<ControlMeasure>(
      `/api/v1/hazards/${hazardId}/controls`,
      data,
    );
  },
  updateControlMeasure: async (
    hazardId: string,
    measureId: string,
    data: Partial<CreateControlMeasureRequest>,
  ): Promise<ApiResponse<ControlMeasure>> => {
    return apiClient.ehs.put<ControlMeasure>(
      `/api/v1/hazards/${hazardId}/controls/${measureId}`,
      data,
    );
  },
  deleteControlMeasure: async (
    hazardId: string,
    measureId: string,
  ): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/v1/hazards/${hazardId}/controls/${measureId}`,
    );
  },

  // Safety Checks
  listChecks: async (
    params?: ListQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<SafetyCheck>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size)
      queryParams.append("page_size", params.page_size.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.status) queryParams.append("status", params.status);

    return apiClient.ehs.get<PaginatedResponse<SafetyCheck>>(
      `/api/v1/checks?${queryParams.toString()}`,
    );
  },
  getCheck: async (id: string): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.get<SafetyCheck>(`/api/v1/checks/${id}`);
  },
  createCheck: async (
    data: CreateSafetyCheckRequest,
  ): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.post<SafetyCheck>("/api/v1/checks", data);
  },
  updateCheck: async (
    id: string,
    data: Partial<CreateSafetyCheckRequest>,
  ): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.put<SafetyCheck>(`/api/v1/checks/${id}`, data);
  },
  deleteCheck: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/v1/checks/${id}`);
  },

  // Emergency Plans
  listPlans: async (
    params?: ListQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<EmergencyPlan>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size)
      queryParams.append("page_size", params.page_size.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.status) queryParams.append("status", params.status);

    return apiClient.ehs.get<PaginatedResponse<EmergencyPlan>>(
      `/api/v1/plans?${queryParams.toString()}`,
    );
  },
  getPlan: async (id: string): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.get<EmergencyPlan>(`/api/v1/plans/${id}`);
  },
  createPlan: async (
    data: CreateEmergencyPlanRequest,
  ): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.post<EmergencyPlan>("/api/v1/plans", data);
  },
  updatePlan: async (
    id: string,
    data: Partial<CreateEmergencyPlanRequest>,
  ): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.put<EmergencyPlan>(`/api/v1/plans/${id}`, data);
  },
  deletePlan: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/v1/plans/${id}`);
  },

  // Drill Records
  listDrills: async (
    params?: ListQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<DrillRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size)
      queryParams.append("page_size", params.page_size.toString());
    if (params?.search) queryParams.append("search", params.search);

    return apiClient.ehs.get<PaginatedResponse<DrillRecord>>(
      `/api/v1/drills?${queryParams.toString()}`,
    );
  },
  getDrill: async (id: string): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.get<DrillRecord>(`/api/v1/drills/${id}`);
  },
  createDrill: async (
    data: CreateDrillRecordRequest,
  ): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.post<DrillRecord>("/api/v1/drills", data);
  },
  updateDrill: async (
    id: string,
    data: Partial<CreateDrillRecordRequest>,
  ): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.put<DrillRecord>(`/api/v1/drills/${id}`, data);
  },
  deleteDrill: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/v1/drills/${id}`);
  },

  // Incidents
  listIncidents: async (
    params?: ListQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<Incident>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size)
      queryParams.append("page_size", params.page_size.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.status) queryParams.append("status", params.status);

    return apiClient.ehs.get<PaginatedResponse<Incident>>(
      `/api/v1/incidents?${queryParams.toString()}`,
    );
  },
  getIncident: async (id: string): Promise<ApiResponse<Incident>> => {
    return apiClient.ehs.get<Incident>(`/api/v1/incidents/${id}`);
  },
  createIncident: async (
    data: CreateIncidentRequest,
  ): Promise<ApiResponse<Incident>> => {
    return apiClient.ehs.post<Incident>("/api/v1/incidents", data);
  },
  updateIncident: async (
    id: string,
    data: Partial<CreateIncidentRequest>,
  ): Promise<ApiResponse<Incident>> => {
    return apiClient.ehs.put<Incident>(`/api/v1/incidents/${id}`, data);
  },
  deleteIncident: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/v1/incidents/${id}`);
  },

  // Incident Actions
  listIncidentActions: async (
    incidentId: string,
  ): Promise<ApiResponse<PaginatedResponse<IncidentAction>>> => {
    return apiClient.ehs.get<PaginatedResponse<IncidentAction>>(
      `/api/v1/incidents/${incidentId}/actions`,
    );
  },
  createIncidentAction: async (
    incidentId: string,
    data: CreateIncidentActionRequest,
  ): Promise<ApiResponse<IncidentAction>> => {
    return apiClient.ehs.post<IncidentAction>(
      `/api/v1/incidents/${incidentId}/actions`,
      data,
    );
  },
  updateIncidentAction: async (
    incidentId: string,
    actionId: string,
    data: Partial<CreateIncidentActionRequest>,
  ): Promise<ApiResponse<IncidentAction>> => {
    return apiClient.ehs.put<IncidentAction>(
      `/api/v1/incidents/${incidentId}/actions/${actionId}`,
      data,
    );
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.ehs.get<string>("/health");
  },
};
