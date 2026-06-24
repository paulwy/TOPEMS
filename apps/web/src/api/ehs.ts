import apiClient from './client';
import type { ApiResponse } from './client';

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
  severity?: 'high' | 'medium' | 'low';
  exposure?: 'high' | 'medium' | 'low';
  likelihood?: 'high' | 'medium' | 'low';
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
  severity: 'high' | 'medium' | 'low';
  exposure: 'high' | 'medium' | 'low';
  likelihood: 'high' | 'medium' | 'low';
  status: 'active' | 'controlled' | 'eliminated' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface RiskAssessment {
  id: string;
  hazard_id: string;
  assessment_date: string | null;
  assessor: string | null;
  severity: 'high' | 'medium' | 'low';
  likelihood: 'high' | 'medium' | 'low';
  risk_level: string | null;
  recommendations: string | null;
  created_at: string;
}

export interface ControlMeasure {
  id: string;
  hazard_id: string;
  measure_type: 'engineering' | 'administrative' | 'ppe';
  description: string | null;
  responsible: string | null;
  deadline: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'verified';
  effectiveness: string | null;
  created_at: string;
}

export interface CreateRiskAssessmentRequest {
  hazard_id: string;
  assessment_date?: string | null;
  assessor?: string | null;
  severity?: 'high' | 'medium' | 'low';
  likelihood?: 'high' | 'medium' | 'low';
  recommendations?: string | null;
}

export interface CreateControlMeasureRequest {
  measure_type: 'engineering' | 'administrative' | 'ppe';
  description?: string | null;
  responsible?: string | null;
  deadline?: string | null;
  status?: 'pending' | 'in_progress' | 'completed' | 'verified';
}

// ============ Inspection Plan Types ============
export interface InspectionPlan {
  id: string;
  plan_no: string;
  title: string;
  description: string | null;
  inspection_type: string;
  frequency: string;
  start_date: string | null;
  end_date: string | null;
  inspector: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface InspectionItem {
  id: string;
  plan_id: string;
  item_no: string;
  title: string;
  description: string | null;
  category: string;
  standard: string | null;
  order_num: number;
}

export interface InspectionRecord {
  id: string;
  record_no: string;
  plan_id: string | null;
  title: string;
  inspection_type: string;
  location: string | null;
  inspector: string | null;
  inspected_at: string | null;
  result: string | null;
  issues: string[] | null;
  attachments: string[] | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface InspectionRecordDetail {
  record: InspectionRecord;
  items: RecordItem[];
}

export interface RecordItem {
  id: string;
  record_id: string;
  item_id: string | null;
  item_title: string;
  item_category: string;
  result: string;
  remarks: string | null;
}

export interface CreateInspectionPlanRequest {
  title: string;
  description?: string | null;
  inspection_type: string;
  frequency: string;
  start_date?: string | null;
  end_date?: string | null;
  inspector?: string | null;
}

export interface CreateInspectionItemRequest {
  title: string;
  description?: string | null;
  category: string;
  standard?: string | null;
  order_num: number;
}

export interface CreateInspectionRecordRequest {
  plan_id?: string | null;
  title: string;
  inspection_type: string;
  location?: string | null;
  inspector?: string | null;
  inspected_at?: string | null;
  issues?: string[] | null;
  items: CreateRecordItemRequest[];
}

export interface CreateRecordItemRequest {
  item_id?: string | null;
  item_title: string;
  item_category: string;
  result: string;
  remarks?: string | null;
}

// ============ Safety Issues / Hazard Management Types ============
export interface SafetyIssue {
  id: string;
  hazard_no: string;
  title: string;
  description: string | null;
  category: string;
  level: string;
  source: string;
  location: string | null;
  reported_by: string | null;
  reported_at: string | null;
  status: string;
  inspection_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SafetyIssueDetail {
  hazard: SafetyIssue;
  rectification: Rectification | null;
  verification: Verification | null;
}

export interface Rectification {
  id: string;
  hazard_id: string;
  description: string;
  responsible: string | null;
  deadline: string | null;
  status: string;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Verification {
  id: string;
  hazard_id: string;
  verifier: string | null;
  result: string;
  remarks: string | null;
  verified_at: string | null;
  created_at: string | null;
}

export interface CreateSafetyIssueRequest {
  title: string;
  description?: string | null;
  category: string;
  level: string;
  source: string;
  location?: string | null;
  reported_by?: string | null;
  inspection_id?: string | null;
}

export interface CreateRectificationRequest {
  description: string;
  responsible?: string | null;
  deadline?: string | null;
}

export interface UpdateRectificationRequest {
  description?: string | null;
  responsible?: string | null;
  deadline?: string | null;
  progress?: number;
  status?: string;
}

export interface CreateVerificationRequest {
  verifier?: string | null;
  result: string;
  remarks?: string | null;
}

// ============ Safety Check Types ============
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
  incident_type: 'near_miss' | 'accident' | 'injury' | 'environmental' | 'equipment';
  severity: 'near_miss' | 'minor' | 'serious' | 'fatal';
  location: string | null;
  reported_by: string | null;
  reported_at: string | null;
  status: 'pending' | 'investigating' | 'resolved' | 'closed';
  root_cause: string | null;
  corrective_actions: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentAction {
  id: string;
  incident_id: string;
  action_type: 'investigation' | 'correction' | 'prevention';
  description: string | null;
  responsible: string | null;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'verified';
  completion_date: string | null;
  created_at: string;
}

export interface CreateIncidentRequest {
  title: string;
  description?: string | null;
  incident_type: 'near_miss' | 'accident' | 'injury' | 'environmental' | 'equipment';
  severity: 'near_miss' | 'minor' | 'serious' | 'fatal';
  location?: string | null;
  reported_by?: string | null;
  reported_at?: string | null;
  status?: 'pending' | 'investigating' | 'resolved' | 'closed';
}

export interface CreateIncidentActionRequest {
  incident_id: string;
  action_type: 'investigation' | 'correction' | 'prevention';
  description: string | null;
  responsible?: string | null;
  due_date?: string | null;
  status?: 'pending' | 'in_progress' | 'completed' | 'verified';
}

// ============ Accident Types ============
export interface Accident {
  id: string;
  accident_no: string;
  title: string;
  description: string | null;
  accident_type: string | null;
  severity: string;
  location: string | null;
  occurred_at: string | null;
  casualties: number | null;
  economic_loss: number | null;
  status: string;
  reported_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AccidentDetail {
  accident: Accident;
  investigation: Investigation | null;
  treatment: Treatment | null;
  review: Review | null;
}

export interface Investigation {
  id: string;
  accident_id: string;
  team: string[] | null;
  findings: string | null;
  root_cause: string | null;
  timeline: Event[] | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Event {
  time: string;
  description: string;
}

export interface Treatment {
  id: string;
  accident_id: string;
  actions: TreatmentAction[];
  responsible: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TreatmentAction {
  id: string;
  description: string;
  responsible: string | null;
  deadline: string | null;
  status: string;
  completed_at: string | null;
}

export interface Review {
  id: string;
  accident_id: string;
  summary: string | null;
  lessons_learned: string[] | null;
  recommendations: string[] | null;
  reviewer: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

export interface CreateAccidentRequest {
  title: string;
  description?: string | null;
  accident_type?: string | null;
  severity: string;
  location?: string | null;
  occurred_at?: string | null;
  casualties?: number | null;
  economic_loss?: number | null;
  reported_by?: string | null;
}

export interface CreateInvestigationRequest {
  team?: string[] | null;
  findings?: string | null;
  root_cause?: string | null;
}

export interface CreateTreatmentRequest {
  actions: CreateTreatmentActionRequest[];
  responsible?: string | null;
}

export interface CreateTreatmentActionRequest {
  description: string;
  responsible?: string | null;
  deadline?: string | null;
}

export interface CreateReviewRequest {
  summary?: string | null;
  lessons_learned?: string[] | null;
  recommendations?: string[] | null;
  reviewer?: string | null;
}

// ============ Emergency Plan Types ============
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
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SafetyHazard>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<SafetyHazard>>(
      `/api/ehs/hazards?${queryParams.toString()}`
    );
  },
  getHazard: async (id: string): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.get<SafetyHazard>(`/api/ehs/hazards/${id}`);
  },
  createHazard: async (data: CreateSafetyHazardRequest): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.post<SafetyHazard>('/api/ehs/hazards', data);
  },
  updateHazard: async (
    id: string,
    data: Partial<CreateSafetyHazardRequest>
  ): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.put<SafetyHazard>(`/api/ehs/hazards/${id}`, data);
  },
  deleteHazard: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/hazards/${id}`);
  },

  // Risk Assessments
  listRiskAssessments: async (
    hazardId: string
  ): Promise<ApiResponse<PaginatedResponse<RiskAssessment>>> => {
    return apiClient.ehs.get<PaginatedResponse<RiskAssessment>>(
      `/api/ehs/hazards/${hazardId}/assessments`
    );
  },
  createRiskAssessment: async (
    hazardId: string,
    data: CreateRiskAssessmentRequest
  ): Promise<ApiResponse<RiskAssessment>> => {
    return apiClient.ehs.post<RiskAssessment>(`/api/ehs/hazards/${hazardId}/assessments`, data);
  },
  updateRiskAssessment: async (
    hazardId: string,
    assessmentId: string,
    data: Partial<CreateRiskAssessmentRequest>
  ): Promise<ApiResponse<RiskAssessment>> => {
    return apiClient.ehs.put<RiskAssessment>(
      `/api/ehs/hazards/${hazardId}/assessments/${assessmentId}`,
      data
    );
  },

  // Control Measures
  listControlMeasures: async (
    hazardId: string
  ): Promise<ApiResponse<PaginatedResponse<ControlMeasure>>> => {
    return apiClient.ehs.get<PaginatedResponse<ControlMeasure>>(
      `/api/ehs/hazards/${hazardId}/controls`
    );
  },
  createControlMeasure: async (
    hazardId: string,
    data: CreateControlMeasureRequest
  ): Promise<ApiResponse<ControlMeasure>> => {
    return apiClient.ehs.post<ControlMeasure>(`/api/ehs/hazards/${hazardId}/controls`, data);
  },
  updateControlMeasure: async (
    hazardId: string,
    measureId: string,
    data: Partial<CreateControlMeasureRequest>
  ): Promise<ApiResponse<ControlMeasure>> => {
    return apiClient.ehs.put<ControlMeasure>(
      `/api/ehs/hazards/${hazardId}/controls/${measureId}`,
      data
    );
  },
  deleteControlMeasure: async (hazardId: string, measureId: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/hazards/${hazardId}/controls/${measureId}`);
  },

  // Inspection Plans
  listInspectionPlans: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<InspectionPlan>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<InspectionPlan>>(
      `/api/ehs/checks/plans?${queryParams.toString()}`
    );
  },
  getInspectionPlan: async (id: string): Promise<ApiResponse<InspectionPlan>> => {
    return apiClient.ehs.get<InspectionPlan>(`/api/ehs/checks/plans/${id}`);
  },
  createInspectionPlan: async (
    data: CreateInspectionPlanRequest
  ): Promise<ApiResponse<InspectionPlan>> => {
    return apiClient.ehs.post<InspectionPlan>('/api/ehs/checks/plans', data);
  },
  updateInspectionPlan: async (
    id: string,
    data: Partial<CreateInspectionPlanRequest>
  ): Promise<ApiResponse<InspectionPlan>> => {
    return apiClient.ehs.put<InspectionPlan>(`/api/ehs/checks/plans/${id}`, data);
  },
  deleteInspectionPlan: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/checks/plans/${id}`);
  },

  // Inspection Items
  listInspectionItems: async (
    planId: string
  ): Promise<ApiResponse<PaginatedResponse<InspectionItem>>> => {
    return apiClient.ehs.get<PaginatedResponse<InspectionItem>>(
      `/api/ehs/checks/plans/${planId}/items`
    );
  },
  createInspectionItem: async (
    planId: string,
    data: CreateInspectionItemRequest
  ): Promise<ApiResponse<InspectionItem>> => {
    return apiClient.ehs.post<InspectionItem>(`/api/ehs/checks/plans/${planId}/items`, data);
  },
  deleteInspectionItem: async (planId: string, itemId: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/checks/plans/${planId}/items/${itemId}`);
  },

  // Inspection Records
  listInspectionRecords: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<InspectionRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<InspectionRecord>>(
      `/api/ehs/checks/records?${queryParams.toString()}`
    );
  },
  getInspectionRecord: async (id: string): Promise<ApiResponse<InspectionRecordDetail>> => {
    return apiClient.ehs.get<InspectionRecordDetail>(`/api/ehs/checks/records/${id}`);
  },
  createInspectionRecord: async (
    data: CreateInspectionRecordRequest
  ): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.ehs.post<InspectionRecord>('/api/ehs/checks/records', data);
  },
  updateInspectionRecord: async (
    id: string,
    data: Partial<CreateInspectionRecordRequest>
  ): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.ehs.put<InspectionRecord>(`/api/ehs/checks/records/${id}`, data);
  },
  deleteInspectionRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/checks/records/${id}`);
  },

  // Safety Issues (Hazard Management)
  listSafetyIssues: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SafetyIssue>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<SafetyIssue>>(
      `/api/ehs/issues?${queryParams.toString()}`
    );
  },
  getSafetyIssue: async (id: string): Promise<ApiResponse<SafetyIssueDetail>> => {
    return apiClient.ehs.get<SafetyIssueDetail>(`/api/ehs/issues/${id}`);
  },
  createSafetyIssue: async (data: CreateSafetyIssueRequest): Promise<ApiResponse<SafetyIssue>> => {
    return apiClient.ehs.post<SafetyIssue>('/api/ehs/issues', data);
  },
  updateSafetyIssue: async (
    id: string,
    data: Partial<CreateSafetyIssueRequest>
  ): Promise<ApiResponse<SafetyIssue>> => {
    return apiClient.ehs.put<SafetyIssue>(`/api/ehs/issues/${id}`, data);
  },
  deleteSafetyIssue: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/issues/${id}`);
  },

  // Rectification
  startRectification: async (
    issueId: string,
    data: CreateRectificationRequest
  ): Promise<ApiResponse<Rectification>> => {
    return apiClient.ehs.post<Rectification>(`/api/ehs/issues/${issueId}/rectification`, data);
  },
  updateRectification: async (
    issueId: string,
    data: UpdateRectificationRequest
  ): Promise<ApiResponse<Rectification>> => {
    return apiClient.ehs.put<Rectification>(`/api/ehs/issues/${issueId}/rectification`, data);
  },
  submitRectification: async (issueId: string): Promise<ApiResponse<Rectification>> => {
    return apiClient.ehs.post<Rectification>(`/api/ehs/issues/${issueId}/rectification/submit`, {});
  },

  // Verification
  verifySafetyIssue: async (
    issueId: string,
    data: CreateVerificationRequest
  ): Promise<ApiResponse<Verification>> => {
    return apiClient.ehs.post<Verification>(`/api/ehs/issues/${issueId}/verification`, data);
  },

  // Close Issue
  closeSafetyIssue: async (id: string): Promise<ApiResponse<SafetyIssue>> => {
    return apiClient.ehs.post<SafetyIssue>(`/api/ehs/issues/${id}/close`, {});
  },

  // Safety Checks
  listChecks: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SafetyCheck>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<SafetyCheck>>(
      `/api/ehs/checks?${queryParams.toString()}`
    );
  },
  getCheck: async (id: string): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.get<SafetyCheck>(`/api/ehs/checks/${id}`);
  },
  createCheck: async (data: CreateSafetyCheckRequest): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.post<SafetyCheck>('/api/ehs/checks', data);
  },
  updateCheck: async (
    id: string,
    data: Partial<CreateSafetyCheckRequest>
  ): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.put<SafetyCheck>(`/api/ehs/checks/${id}`, data);
  },
  deleteCheck: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/checks/${id}`);
  },

  // Emergency Plans
  listPlans: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EmergencyPlan>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<EmergencyPlan>>(
      `/api/ehs/plans?${queryParams.toString()}`
    );
  },
  getPlan: async (id: string): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.get<EmergencyPlan>(`/api/ehs/plans/${id}`);
  },
  createPlan: async (data: CreateEmergencyPlanRequest): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.post<EmergencyPlan>('/api/ehs/plans', data);
  },
  updatePlan: async (
    id: string,
    data: Partial<CreateEmergencyPlanRequest>
  ): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.put<EmergencyPlan>(`/api/ehs/plans/${id}`, data);
  },
  deletePlan: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/plans/${id}`);
  },

  // Drill Records
  listDrills: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<DrillRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.ehs.get<PaginatedResponse<DrillRecord>>(
      `/api/ehs/drills?${queryParams.toString()}`
    );
  },
  getDrill: async (id: string): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.get<DrillRecord>(`/api/ehs/drills/${id}`);
  },
  createDrill: async (data: CreateDrillRecordRequest): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.post<DrillRecord>('/api/ehs/drills', data);
  },
  updateDrill: async (
    id: string,
    data: Partial<CreateDrillRecordRequest>
  ): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.put<DrillRecord>(`/api/ehs/drills/${id}`, data);
  },
  deleteDrill: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/drills/${id}`);
  },

  // Incidents
  listIncidents: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Incident>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<Incident>>(
      `/api/ehs/incidents?${queryParams.toString()}`
    );
  },
  getIncident: async (id: string): Promise<ApiResponse<Incident>> => {
    return apiClient.ehs.get<Incident>(`/api/ehs/incidents/${id}`);
  },
  createIncident: async (data: CreateIncidentRequest): Promise<ApiResponse<Incident>> => {
    return apiClient.ehs.post<Incident>('/api/ehs/incidents', data);
  },
  updateIncident: async (
    id: string,
    data: Partial<CreateIncidentRequest>
  ): Promise<ApiResponse<Incident>> => {
    return apiClient.ehs.put<Incident>(`/api/ehs/incidents/${id}`, data);
  },
  deleteIncident: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/incidents/${id}`);
  },

  // Incident Actions
  listIncidentActions: async (
    incidentId: string
  ): Promise<ApiResponse<PaginatedResponse<IncidentAction>>> => {
    return apiClient.ehs.get<PaginatedResponse<IncidentAction>>(
      `/api/ehs/incidents/${incidentId}/actions`
    );
  },
  createIncidentAction: async (
    incidentId: string,
    data: CreateIncidentActionRequest
  ): Promise<ApiResponse<IncidentAction>> => {
    return apiClient.ehs.post<IncidentAction>(`/api/ehs/incidents/${incidentId}/actions`, data);
  },
  updateIncidentAction: async (
    incidentId: string,
    actionId: string,
    data: Partial<CreateIncidentActionRequest>
  ): Promise<ApiResponse<IncidentAction>> => {
    return apiClient.ehs.put<IncidentAction>(
      `/api/ehs/incidents/${incidentId}/actions/${actionId}`,
      data
    );
  },

  // Accidents
  listAccidents: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Accident>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<Accident>>(
      `/api/ehs/incidents?${queryParams.toString()}`
    );
  },
  getAccident: async (id: string): Promise<ApiResponse<AccidentDetail>> => {
    return apiClient.ehs.get<AccidentDetail>(`/api/ehs/incidents/${id}`);
  },
  createAccident: async (data: CreateAccidentRequest): Promise<ApiResponse<Accident>> => {
    return apiClient.ehs.post<Accident>('/api/ehs/incidents', data);
  },
  updateAccident: async (
    id: string,
    data: Partial<CreateAccidentRequest>
  ): Promise<ApiResponse<Accident>> => {
    return apiClient.ehs.put<Accident>(`/api/ehs/incidents/${id}`, data);
  },
  deleteAccident: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/incidents/${id}`);
  },

  // Accident Investigation
  startInvestigation: async (
    accidentId: string,
    data: CreateInvestigationRequest
  ): Promise<ApiResponse<Investigation>> => {
    return apiClient.ehs.post<Investigation>(
      `/api/ehs/incidents/${accidentId}/investigation`,
      data
    );
  },
  updateInvestigation: async (
    accidentId: string,
    data: Partial<CreateInvestigationRequest>
  ): Promise<ApiResponse<Investigation>> => {
    return apiClient.ehs.put<Investigation>(`/api/ehs/incidents/${accidentId}/investigation`, data);
  },
  completeInvestigation: async (accidentId: string): Promise<ApiResponse<Investigation>> => {
    return apiClient.ehs.post<Investigation>(
      `/api/ehs/incidents/${accidentId}/investigation/complete`,
      {}
    );
  },

  // Accident Treatment
  createTreatment: async (
    accidentId: string,
    data: CreateTreatmentRequest
  ): Promise<ApiResponse<Treatment>> => {
    return apiClient.ehs.post<Treatment>(`/api/ehs/incidents/${accidentId}/treatment`, data);
  },
  updateTreatmentAction: async (
    accidentId: string,
    actionId: string,
    data: { status?: string; completed_at?: string }
  ): Promise<ApiResponse<TreatmentAction>> => {
    return apiClient.ehs.put<TreatmentAction>(
      `/api/ehs/incidents/${accidentId}/treatment/actions/${actionId}`,
      data
    );
  },
  completeTreatment: async (accidentId: string): Promise<ApiResponse<Treatment>> => {
    return apiClient.ehs.post<Treatment>(`/api/ehs/incidents/${accidentId}/treatment/complete`, {});
  },

  // Accident Review
  createReview: async (
    accidentId: string,
    data: CreateReviewRequest
  ): Promise<ApiResponse<Review>> => {
    return apiClient.ehs.post<Review>(`/api/ehs/incidents/${accidentId}/review`, data);
  },

  // Close Accident
  closeAccident: async (id: string): Promise<ApiResponse<Accident>> => {
    return apiClient.ehs.post<Accident>(`/api/ehs/incidents/${id}/close`, {});
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.ehs.get<string>('/health');
  },
};
