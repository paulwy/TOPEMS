import type { ApiResponse } from "./client";
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
export interface Incident {
    id: string;
    title: string;
    description: string | null;
    incident_type: "near_miss" | "accident" | "injury" | "environmental" | "equipment";
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
    incident_type: "near_miss" | "accident" | "injury" | "environmental" | "equipment";
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
export declare const ehsApi: {
    listHazards: (params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<SafetyHazard>>>;
    getHazard: (id: string) => Promise<ApiResponse<SafetyHazard>>;
    createHazard: (data: CreateSafetyHazardRequest) => Promise<ApiResponse<SafetyHazard>>;
    updateHazard: (id: string, data: Partial<CreateSafetyHazardRequest>) => Promise<ApiResponse<SafetyHazard>>;
    deleteHazard: (id: string) => Promise<ApiResponse<void>>;
    listRiskAssessments: (hazardId: string) => Promise<ApiResponse<PaginatedResponse<RiskAssessment>>>;
    createRiskAssessment: (hazardId: string, data: CreateRiskAssessmentRequest) => Promise<ApiResponse<RiskAssessment>>;
    updateRiskAssessment: (hazardId: string, assessmentId: string, data: Partial<CreateRiskAssessmentRequest>) => Promise<ApiResponse<RiskAssessment>>;
    listControlMeasures: (hazardId: string) => Promise<ApiResponse<PaginatedResponse<ControlMeasure>>>;
    createControlMeasure: (hazardId: string, data: CreateControlMeasureRequest) => Promise<ApiResponse<ControlMeasure>>;
    updateControlMeasure: (hazardId: string, measureId: string, data: Partial<CreateControlMeasureRequest>) => Promise<ApiResponse<ControlMeasure>>;
    deleteControlMeasure: (hazardId: string, measureId: string) => Promise<ApiResponse<void>>;
    listChecks: (params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<SafetyCheck>>>;
    getCheck: (id: string) => Promise<ApiResponse<SafetyCheck>>;
    createCheck: (data: CreateSafetyCheckRequest) => Promise<ApiResponse<SafetyCheck>>;
    updateCheck: (id: string, data: Partial<CreateSafetyCheckRequest>) => Promise<ApiResponse<SafetyCheck>>;
    deleteCheck: (id: string) => Promise<ApiResponse<void>>;
    listPlans: (params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<EmergencyPlan>>>;
    getPlan: (id: string) => Promise<ApiResponse<EmergencyPlan>>;
    createPlan: (data: CreateEmergencyPlanRequest) => Promise<ApiResponse<EmergencyPlan>>;
    updatePlan: (id: string, data: Partial<CreateEmergencyPlanRequest>) => Promise<ApiResponse<EmergencyPlan>>;
    deletePlan: (id: string) => Promise<ApiResponse<void>>;
    listDrills: (params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<DrillRecord>>>;
    getDrill: (id: string) => Promise<ApiResponse<DrillRecord>>;
    createDrill: (data: CreateDrillRecordRequest) => Promise<ApiResponse<DrillRecord>>;
    updateDrill: (id: string, data: Partial<CreateDrillRecordRequest>) => Promise<ApiResponse<DrillRecord>>;
    deleteDrill: (id: string) => Promise<ApiResponse<void>>;
    listIncidents: (params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<Incident>>>;
    getIncident: (id: string) => Promise<ApiResponse<Incident>>;
    createIncident: (data: CreateIncidentRequest) => Promise<ApiResponse<Incident>>;
    updateIncident: (id: string, data: Partial<CreateIncidentRequest>) => Promise<ApiResponse<Incident>>;
    deleteIncident: (id: string) => Promise<ApiResponse<void>>;
    listIncidentActions: (incidentId: string) => Promise<ApiResponse<PaginatedResponse<IncidentAction>>>;
    createIncidentAction: (incidentId: string, data: CreateIncidentActionRequest) => Promise<ApiResponse<IncidentAction>>;
    updateIncidentAction: (incidentId: string, actionId: string, data: Partial<CreateIncidentActionRequest>) => Promise<ApiResponse<IncidentAction>>;
    health: () => Promise<ApiResponse<string>>;
};
