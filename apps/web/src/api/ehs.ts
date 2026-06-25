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

// ============ Risk Management Types ============
export interface Risk {
  id: string;
  risk_no: string;
  name: string;
  category: string;
  risk_level: 'high' | 'medium' | 'low' | 'extreme';
  description: string | null;
  location: string | null;
  likelihood: 'high' | 'medium' | 'low';
  severity: 'high' | 'medium' | 'low';
  risk_score: number;
  status: 'identified' | 'assessing' | 'controlled' | 'monitored' | 'closed';
  assessor: string | null;
  assessment_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskLevelMatrix {
  likelihood: 'high' | 'medium' | 'low';
  severity: 'high' | 'medium' | 'low';
  risk_level: 'high' | 'medium' | 'low' | 'extreme';
  risk_score: number;
}

export interface RiskControlMeasure {
  id: string;
  risk_id: string;
  measure_type: 'engineering' | 'administrative' | 'ppe' | 'elimination' | 'substitution';
  description: string | null;
  responsible: string | null;
  deadline: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'verified' | 'failed';
  effectiveness: string | null;
  cost: number | null;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
}

export interface RiskMgmtAssessment {
  id: string;
  risk_id: string;
  assessment_date: string | null;
  assessor: string | null;
  likelihood: 'high' | 'medium' | 'low';
  severity: 'high' | 'medium' | 'low';
  risk_level: 'high' | 'medium' | 'low' | 'extreme';
  risk_score: number;
  method: string | null;
  remarks: string | null;
  attachments: string[] | null;
  created_at: string;
}

export interface CreateRiskRequest {
  name: string;
  category: string;
  description?: string | null;
  location?: string | null;
  likelihood: 'high' | 'medium' | 'low';
  severity: 'high' | 'medium' | 'low';
  status?: 'identified' | 'assessing' | 'controlled' | 'monitored' | 'closed';
}

export interface UpdateRiskRequest {
  name?: string;
  category?: string;
  description?: string | null;
  location?: string | null;
  likelihood?: 'high' | 'medium' | 'low';
  severity?: 'high' | 'medium' | 'low';
  status?: 'identified' | 'assessing' | 'controlled' | 'monitored' | 'closed';
}

export interface CreateRiskMgmtAssessmentRequest {
  assessment_date?: string | null;
  assessor?: string | null;
  likelihood: 'high' | 'medium' | 'low';
  severity: 'high' | 'medium' | 'low';
  method?: string | null;
  remarks?: string | null;
  attachments?: string[] | null;
}

export interface CreateRiskControlMeasureRequest {
  measure_type: 'engineering' | 'administrative' | 'ppe' | 'elimination' | 'substitution';
  description?: string | null;
  responsible?: string | null;
  deadline?: string | null;
  priority?: 'high' | 'medium' | 'low';
  cost?: number | null;
  status?: 'pending' | 'in_progress' | 'completed' | 'verified' | 'failed';
}

export interface UpdateRiskControlMeasureRequest {
  measure_type?: 'engineering' | 'administrative' | 'ppe' | 'elimination' | 'substitution';
  description?: string | null;
  responsible?: string | null;
  deadline?: string | null;
  status?: 'pending' | 'in_progress' | 'completed' | 'verified' | 'failed';
  effectiveness?: string | null;
  priority?: 'high' | 'medium' | 'low';
  cost?: number | null;
}

export interface RiskListQueryParams extends ListQueryParams {
  risk_level?: string;
  category?: string;
}

// ============ Environment Management Types ============
export interface EnvironmentMonitor {
  id: string;
  monitor_no: string;
  name: string;
  monitor_type: string;
  location: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  description: string | null;
  monitor_frequency: string | null;
  standard_value: string | null;
  warning_threshold: number | null;
  alarm_threshold: number | null;
  unit: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentIndicator {
  id: string;
  indicator_no: string;
  name: string;
  category: string;
  unit: string | null;
  standard_value: number | null;
  current_value: number | null;
  status: 'normal' | 'warning' | 'exceeded';
  description: string | null;
  monitor_location: string | null;
  last_monitor_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentMonitorRecord {
  id: string;
  record_no: string;
  monitor_id: string;
  monitor_name: string;
  monitor_type: string;
  location: string | null;
  monitor_date: string | null;
  monitor_value: number | null;
  unit: string | null;
  standard_value: number | null;
  status: 'normal' | 'warning' | 'exceeded';
  weather: string | null;
  operator: string | null;
  remarks: string | null;
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEnvironmentMonitorRequest {
  name: string;
  monitor_type: string;
  location?: string | null;
  description?: string | null;
  monitor_frequency?: string | null;
  standard_value?: string | null;
  warning_threshold?: number | null;
  alarm_threshold?: number | null;
  unit?: string | null;
  status?: 'active' | 'inactive' | 'maintenance';
}

export interface UpdateEnvironmentMonitorRequest {
  name?: string;
  monitor_type?: string;
  location?: string | null;
  description?: string | null;
  monitor_frequency?: string | null;
  standard_value?: string | null;
  warning_threshold?: number | null;
  alarm_threshold?: number | null;
  unit?: string | null;
  status?: 'active' | 'inactive' | 'maintenance';
}

export interface CreateEnvironmentMonitorRecordRequest {
  monitor_id: string;
  monitor_date?: string | null;
  monitor_value: number;
  unit?: string | null;
  weather?: string | null;
  operator?: string | null;
  remarks?: string | null;
  attachments?: string[] | null;
}

export interface EnvironmentMonitorListQueryParams extends ListQueryParams {
  monitor_type?: string;
  status?: string;
}

export interface EnvironmentMonitorRecordListQueryParams extends ListQueryParams {
  monitor_id?: string;
  monitor_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

// ============ Training Management Types ============
export interface TrainingPlan {
  id: string;
  plan_no: string;
  title: string;
  training_type: string;
  category: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  trainer: string | null;
  participants: string[] | null;
  max_participants: number | null;
  duration_hours: number | null;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingRecord {
  id: string;
  record_no: string;
  plan_id: string | null;
  title: string;
  training_type: string;
  category: string;
  trainer: string | null;
  training_date: string | null;
  location: string | null;
  duration_hours: number | null;
  participants: string[] | null;
  content: string | null;
  materials: string[] | null;
  result: string | null;
  pass_rate: number | null;
  status: 'ongoing' | 'completed' | 'failed';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingCertificate {
  id: string;
  certificate_no: string;
  employee_id: string;
  employee_name: string;
  training_type: string;
  certificate_type: string;
  issue_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
  status: 'valid' | 'expired' | 'revoked';
  record_id: string | null;
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingPlanRequest {
  title: string;
  training_type: string;
  category: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  trainer?: string | null;
  participants?: string[] | null;
  max_participants?: number | null;
  duration_hours?: number | null;
  status?: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
}

export interface UpdateTrainingPlanRequest {
  title?: string;
  training_type?: string;
  category?: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  trainer?: string | null;
  participants?: string[] | null;
  max_participants?: number | null;
  duration_hours?: number | null;
  status?: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
}

export interface CreateTrainingRecordRequest {
  plan_id?: string | null;
  title: string;
  training_type: string;
  category: string;
  trainer?: string | null;
  training_date?: string | null;
  location?: string | null;
  duration_hours?: number | null;
  participants?: string[] | null;
  content?: string | null;
  materials?: string[] | null;
  result?: string | null;
  pass_rate?: number | null;
  status?: 'ongoing' | 'completed' | 'failed';
}

export interface UpdateTrainingRecordRequest {
  title?: string;
  training_type?: string;
  category?: string;
  trainer?: string | null;
  training_date?: string | null;
  location?: string | null;
  duration_hours?: number | null;
  participants?: string[] | null;
  content?: string | null;
  materials?: string[] | null;
  result?: string | null;
  pass_rate?: number | null;
  status?: 'ongoing' | 'completed' | 'failed';
}

export interface CreateTrainingCertificateRequest {
  employee_id: string;
  employee_name: string;
  training_type: string;
  certificate_type: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  issuing_authority?: string | null;
  record_id?: string | null;
  attachments?: string[] | null;
  status?: 'valid' | 'expired' | 'revoked';
}

export interface UpdateTrainingCertificateRequest {
  certificate_type?: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  issuing_authority?: string | null;
  status?: 'valid' | 'expired' | 'revoked';
  attachments?: string[] | null;
}

export interface TrainingPlanListQueryParams extends ListQueryParams {
  training_type?: string;
  category?: string;
}

export interface TrainingRecordListQueryParams extends ListQueryParams {
  training_type?: string;
  category?: string;
  employee_id?: string;
}

export interface TrainingCertificateListQueryParams extends ListQueryParams {
  employee_id?: string;
  status?: string;
  training_type?: string;
}

// ============ Occupational Health Types ============
export interface HealthRecord {
  id: string;
  record_no: string;
  employee_id: string;
  employee_name: string;
  gender: 'male' | 'female' | null;
  birthday: string | null;
  department: string | null;
  position: string | null;
  workplace: string | null;
  hazard_factors: string[] | null;
  blood_type: string | null;
  allergy_history: string | null;
  medical_history: string | null;
  contact_info: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface HealthCheckPlan {
  id: string;
  plan_no: string;
  title: string;
  check_type: string;
  category: string;
  description: string | null;
  check_date: string | null;
  end_date: string | null;
  location: string | null;
  hospital: string | null;
  participants: string[] | null;
  hazard_factors: string[] | null;
  check_items: string[] | null;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthCheckRecord {
  id: string;
  record_no: string;
  plan_id: string | null;
  employee_id: string;
  employee_name: string;
  check_type: string;
  check_date: string | null;
  hospital: string | null;
  check_items: string[] | null;
  results: any;
  conclusion: string | null;
  abnormal_items: string[] | null;
  suggestions: string | null;
  follow_up_required: boolean;
  status: 'pending' | 'completed' | 'abnormal' | 'follow_up';
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Contraindication {
  id: string;
  employee_id: string;
  employee_name: string;
  contraindication_type: string;
  description: string | null;
  hazard_factor: string | null;
  diagnosed_at: string | null;
  diagnosis_hospital: string | null;
  status: 'active' | 'recovered' | 'permanent';
  restrictions: string | null;
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHealthRecordRequest {
  employee_id: string;
  employee_name: string;
  gender?: 'male' | 'female' | null;
  birthday?: string | null;
  department?: string | null;
  position?: string | null;
  workplace?: string | null;
  hazard_factors?: string[] | null;
  blood_type?: string | null;
  allergy_history?: string | null;
  medical_history?: string | null;
  contact_info?: string | null;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UpdateHealthRecordRequest {
  employee_name?: string;
  gender?: 'male' | 'female' | null;
  birthday?: string | null;
  department?: string | null;
  position?: string | null;
  workplace?: string | null;
  hazard_factors?: string[] | null;
  blood_type?: string | null;
  allergy_history?: string | null;
  medical_history?: string | null;
  contact_info?: string | null;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface CreateHealthCheckPlanRequest {
  title: string;
  check_type: string;
  category: string;
  description?: string | null;
  check_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  hospital?: string | null;
  participants?: string[] | null;
  hazard_factors?: string[] | null;
  check_items?: string[] | null;
  status?: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
}

export interface UpdateHealthCheckPlanRequest {
  title?: string;
  check_type?: string;
  category?: string;
  description?: string | null;
  check_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  hospital?: string | null;
  participants?: string[] | null;
  hazard_factors?: string[] | null;
  check_items?: string[] | null;
  status?: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
}

export interface CreateHealthCheckRecordRequest {
  plan_id?: string | null;
  employee_id: string;
  employee_name: string;
  check_type: string;
  check_date?: string | null;
  hospital?: string | null;
  check_items?: string[] | null;
  results?: any;
  conclusion?: string | null;
  abnormal_items?: string[] | null;
  suggestions?: string | null;
  follow_up_required?: boolean;
  status?: 'pending' | 'completed' | 'abnormal' | 'follow_up';
  attachments?: string[] | null;
}

export interface UpdateHealthCheckRecordRequest {
  check_type?: string;
  check_date?: string | null;
  hospital?: string | null;
  check_items?: string[] | null;
  results?: any;
  conclusion?: string | null;
  abnormal_items?: string[] | null;
  suggestions?: string | null;
  follow_up_required?: boolean;
  status?: 'pending' | 'completed' | 'abnormal' | 'follow_up';
  attachments?: string[] | null;
}

export interface CreateContraindicationRequest {
  employee_id: string;
  employee_name: string;
  contraindication_type: string;
  description?: string | null;
  hazard_factor?: string | null;
  diagnosed_at?: string | null;
  diagnosis_hospital?: string | null;
  restrictions?: string | null;
  attachments?: string[] | null;
  status?: 'active' | 'recovered' | 'permanent';
}

export interface UpdateContraindicationRequest {
  contraindication_type?: string;
  description?: string | null;
  hazard_factor?: string | null;
  diagnosed_at?: string | null;
  diagnosis_hospital?: string | null;
  status?: 'active' | 'recovered' | 'permanent';
  restrictions?: string | null;
  attachments?: string[] | null;
}

export interface HealthRecordListQueryParams extends ListQueryParams {
  department?: string;
  position?: string;
  status?: string;
}

export interface HealthCheckPlanListQueryParams extends ListQueryParams {
  check_type?: string;
  category?: string;
  status?: string;
}

export interface HealthCheckRecordListQueryParams extends ListQueryParams {
  employee_id?: string;
  check_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface ContraindicationListQueryParams extends ListQueryParams {
  employee_id?: string;
  status?: string;
  hazard_factor?: string;
}

// ============ Occupational Disease Types ============
export interface HazardFactor {
  id: string;
  factor_no: string;
  name: string;
  category: string;
  type: 'chemical' | 'physical' | 'biological' | 'ergonomic' | 'psychological';
  description: string | null;
  hazard_level: 'high' | 'medium' | 'low';
  exposure_limit: string | null;
  unit: string | null;
  protection_measures: string[] | null;
  health_effects: string | null;
  status: 'active' | 'inactive' | 'monitored';
  created_at: string;
  updated_at: string;
}

export interface HazardDetectionRecord {
  id: string;
  record_no: string;
  factor_id: string;
  factor_name: string;
  detection_type: string;
  location: string | null;
  detection_date: string | null;
  detection_value: number | null;
  unit: string | null;
  standard_value: number | null;
  exposure_time: number | null;
  result: 'normal' | 'exceeded' | 'warning';
  detection_method: string | null;
  detector: string | null;
  remarks: string | null;
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface OccupationalDiseaseCase {
  id: string;
  case_no: string;
  employee_id: string;
  employee_name: string;
  gender: 'male' | 'female' | null;
  age: number | null;
  department: string | null;
  position: string | null;
  disease_type: string;
  disease_name: string;
  hazard_factor: string | null;
  diagnosis_date: string | null;
  diagnosis_hospital: string | null;
  diagnosis_basis: string | null;
  work_related: boolean;
  severity: 'mild' | 'moderate' | 'severe' | 'fatal';
  status: 'suspected' | 'confirmed' | 'recovered' | 'chronic' | 'deceased';
  treatment: string | null;
  compensation: string | null;
  attachments: string[] | null;
  reported_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProtectionMeasure {
  id: string;
  measure_no: string;
  factor_id: string | null;
  factor_name: string | null;
  name: string;
  category: 'engineering' | 'administrative' | 'ppe' | 'health_monitoring';
  description: string | null;
  target_hazards: string[] | null;
  effectiveness: string | null;
  responsible_department: string | null;
  status: 'planned' | 'implemented' | 'verified' | 'obsolete';
  created_at: string;
  updated_at: string;
}

export interface CreateHazardFactorRequest {
  name: string;
  category: string;
  type: 'chemical' | 'physical' | 'biological' | 'ergonomic' | 'psychological';
  description?: string | null;
  hazard_level?: 'high' | 'medium' | 'low';
  exposure_limit?: string | null;
  unit?: string | null;
  protection_measures?: string[] | null;
  health_effects?: string | null;
  status?: 'active' | 'inactive' | 'monitored';
}

export interface UpdateHazardFactorRequest {
  name?: string;
  category?: string;
  type?: 'chemical' | 'physical' | 'biological' | 'ergonomic' | 'psychological';
  description?: string | null;
  hazard_level?: 'high' | 'medium' | 'low';
  exposure_limit?: string | null;
  unit?: string | null;
  protection_measures?: string[] | null;
  health_effects?: string | null;
  status?: 'active' | 'inactive' | 'monitored';
}

export interface CreateHazardDetectionRecordRequest {
  factor_id: string;
  detection_type: string;
  location?: string | null;
  detection_date?: string | null;
  detection_value: number;
  unit?: string | null;
  standard_value?: number | null;
  exposure_time?: number | null;
  detection_method?: string | null;
  detector?: string | null;
  remarks?: string | null;
  attachments?: string[] | null;
}

export interface UpdateHazardDetectionRecordRequest {
  detection_type?: string;
  location?: string | null;
  detection_date?: string | null;
  detection_value?: number;
  unit?: string | null;
  standard_value?: number | null;
  exposure_time?: number | null;
  result?: 'normal' | 'exceeded' | 'warning';
  detection_method?: string | null;
  detector?: string | null;
  remarks?: string | null;
  attachments?: string[] | null;
}

export interface CreateOccupationalDiseaseCaseRequest {
  employee_id: string;
  employee_name: string;
  gender?: 'male' | 'female' | null;
  age?: number | null;
  department?: string | null;
  position?: string | null;
  disease_type: string;
  disease_name: string;
  hazard_factor?: string | null;
  diagnosis_date?: string | null;
  diagnosis_hospital?: string | null;
  diagnosis_basis?: string | null;
  work_related?: boolean;
  severity?: 'mild' | 'moderate' | 'severe' | 'fatal';
  status?: 'suspected' | 'confirmed' | 'recovered' | 'chronic' | 'deceased';
  treatment?: string | null;
  compensation?: string | null;
  attachments?: string[] | null;
  reported_at?: string | null;
}

export interface UpdateOccupationalDiseaseCaseRequest {
  employee_name?: string;
  gender?: 'male' | 'female' | null;
  age?: number | null;
  department?: string | null;
  position?: string | null;
  disease_type?: string;
  disease_name?: string;
  hazard_factor?: string | null;
  diagnosis_date?: string | null;
  diagnosis_hospital?: string | null;
  diagnosis_basis?: string | null;
  work_related?: boolean;
  severity?: 'mild' | 'moderate' | 'severe' | 'fatal';
  status?: 'suspected' | 'confirmed' | 'recovered' | 'chronic' | 'deceased';
  treatment?: string | null;
  compensation?: string | null;
  attachments?: string[] | null;
}

export interface CreateProtectionMeasureRequest {
  factor_id?: string | null;
  factor_name?: string | null;
  name: string;
  category: 'engineering' | 'administrative' | 'ppe' | 'health_monitoring';
  description?: string | null;
  target_hazards?: string[] | null;
  effectiveness?: string | null;
  responsible_department?: string | null;
  status?: 'planned' | 'implemented' | 'verified' | 'obsolete';
}

export interface UpdateProtectionMeasureRequest {
  name?: string;
  category?: 'engineering' | 'administrative' | 'ppe' | 'health_monitoring';
  description?: string | null;
  target_hazards?: string[] | null;
  effectiveness?: string | null;
  responsible_department?: string | null;
  status?: 'planned' | 'implemented' | 'verified' | 'obsolete';
}

export interface HazardFactorListQueryParams extends ListQueryParams {
  type?: string;
  category?: string;
  hazard_level?: string;
}

export interface HazardDetectionRecordListQueryParams extends ListQueryParams {
  factor_id?: string;
  result?: string;
  start_date?: string;
  end_date?: string;
}

export interface OccupationalDiseaseCaseListQueryParams extends ListQueryParams {
  employee_id?: string;
  disease_type?: string;
  status?: string;
  severity?: string;
}

export interface ProtectionMeasureListQueryParams extends ListQueryParams {
  category?: string;
  factor_id?: string;
  status?: string;
}

// ============ Hazardous Material Types ============
export interface HazardousMaterial {
  id: string;
  material_no: string;
  name: string;
  category: string;
  hazard_class: string;
  un_number: string | null;
  cas_no: string | null;
  specification: string | null;
  unit: string | null;
  description: string | null;
  hazards: string[] | null;
  storage_requirements: string | null;
  handling_requirements: string | null;
  emergency_measures: string | null;
  msds_url: string | null;
  status: 'active' | 'inactive' | 'restricted';
  created_at: string;
  updated_at: string;
}

export interface HazardousMaterialCategory {
  id: string;
  category_code: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  hazard_level: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HazardousMaterialInventory {
  id: string;
  material_id: string;
  material_name: string;
  warehouse: string | null;
  location: string | null;
  batch_no: string | null;
  quantity: number;
  unit: string | null;
  safety_stock: number | null;
  expiry_date: string | null;
  manufacturer: string | null;
  supplier: string | null;
  status: 'normal' | 'low_stock' | 'expired' | 'overstock';
  last_updated: string | null;
  created_at: string;
  updated_at: string;
}

export interface HazardousMaterialMovement {
  id: string;
  movement_no: string;
  material_id: string;
  material_name: string;
  movement_type: 'in' | 'out' | 'transfer' | 'return' | 'scrap';
  quantity: number;
  unit: string | null;
  batch_no: string | null;
  source_location: string | null;
  target_location: string | null;
  handler: string | null;
  movement_date: string | null;
  reason: string | null;
  operator: string | null;
  approver: string | null;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface MSDS {
  id: string;
  material_id: string;
  material_name: string;
  version: string | null;
  product_name: string | null;
  manufacturer: string | null;
  emergency_phone: string | null;
  hazard_identification: string | null;
  composition_info: string | null;
  first_aid_measures: string | null;
  fire_fighting_measures: string | null;
  accidental_release_measures: string | null;
  handling_and_storage: string | null;
  exposure_controls: string | null;
  physical_chemical_properties: string | null;
  reactivity_info: string | null;
  toxicological_info: string | null;
  ecological_info: string | null;
  disposal_considerations: string | null;
  transport_info: string | null;
  regulatory_info: string | null;
  other_info: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHazardousMaterialRequest {
  name: string;
  category: string;
  hazard_class: string;
  un_number?: string | null;
  cas_no?: string | null;
  specification?: string | null;
  unit?: string | null;
  description?: string | null;
  hazards?: string[] | null;
  storage_requirements?: string | null;
  handling_requirements?: string | null;
  emergency_measures?: string | null;
  msds_url?: string | null;
  status?: 'active' | 'inactive' | 'restricted';
}

export interface UpdateHazardousMaterialRequest {
  name?: string;
  category?: string;
  hazard_class?: string;
  un_number?: string | null;
  cas_no?: string | null;
  specification?: string | null;
  unit?: string | null;
  description?: string | null;
  hazards?: string[] | null;
  storage_requirements?: string | null;
  handling_requirements?: string | null;
  emergency_measures?: string | null;
  msds_url?: string | null;
  status?: 'active' | 'inactive' | 'restricted';
}

export interface CreateHazardousMaterialCategoryRequest {
  category_code: string;
  name: string;
  parent_id?: string | null;
  description?: string | null;
  hazard_level?: string | null;
  sort_order?: number;
}

export interface UpdateHazardousMaterialCategoryRequest {
  category_code?: string;
  name?: string;
  parent_id?: string | null;
  description?: string | null;
  hazard_level?: string | null;
  sort_order?: number;
}

export interface CreateHazardousMaterialInventoryRequest {
  material_id: string;
  warehouse?: string | null;
  location?: string | null;
  batch_no?: string | null;
  quantity: number;
  unit?: string | null;
  safety_stock?: number | null;
  expiry_date?: string | null;
  manufacturer?: string | null;
  supplier?: string | null;
}

export interface UpdateHazardousMaterialInventoryRequest {
  warehouse?: string | null;
  location?: string | null;
  quantity?: number;
  safety_stock?: number | null;
  expiry_date?: string | null;
  manufacturer?: string | null;
  supplier?: string | null;
  status?: 'normal' | 'low_stock' | 'expired' | 'overstock';
}

export interface CreateHazardousMaterialMovementRequest {
  material_id: string;
  movement_type: 'in' | 'out' | 'transfer' | 'return' | 'scrap';
  quantity: number;
  unit?: string | null;
  batch_no?: string | null;
  source_location?: string | null;
  target_location?: string | null;
  handler?: string | null;
  movement_date?: string | null;
  reason?: string | null;
  operator?: string | null;
  attachments?: string[] | null;
  status?: 'pending' | 'approved' | 'completed' | 'rejected';
}

export interface UpdateHazardousMaterialMovementRequest {
  movement_type?: 'in' | 'out' | 'transfer' | 'return' | 'scrap';
  quantity?: number;
  source_location?: string | null;
  target_location?: string | null;
  handler?: string | null;
  movement_date?: string | null;
  reason?: string | null;
  approver?: string | null;
  status?: 'pending' | 'approved' | 'completed' | 'rejected';
  attachments?: string[] | null;
}

export interface CreateMSDSRequest {
  material_id: string;
  material_name: string;
  version?: string | null;
  product_name?: string | null;
  manufacturer?: string | null;
  emergency_phone?: string | null;
  hazard_identification?: string | null;
  composition_info?: string | null;
  first_aid_measures?: string | null;
  fire_fighting_measures?: string | null;
  accidental_release_measures?: string | null;
  handling_and_storage?: string | null;
  exposure_controls?: string | null;
  physical_chemical_properties?: string | null;
  reactivity_info?: string | null;
  toxicological_info?: string | null;
  ecological_info?: string | null;
  disposal_considerations?: string | null;
  transport_info?: string | null;
  regulatory_info?: string | null;
  other_info?: string | null;
  file_url?: string | null;
}

export interface UpdateMSDSRequest {
  version?: string | null;
  product_name?: string | null;
  manufacturer?: string | null;
  emergency_phone?: string | null;
  hazard_identification?: string | null;
  composition_info?: string | null;
  first_aid_measures?: string | null;
  fire_fighting_measures?: string | null;
  accidental_release_measures?: string | null;
  handling_and_storage?: string | null;
  exposure_controls?: string | null;
  physical_chemical_properties?: string | null;
  reactivity_info?: string | null;
  toxicological_info?: string | null;
  ecological_info?: string | null;
  disposal_considerations?: string | null;
  transport_info?: string | null;
  regulatory_info?: string | null;
  other_info?: string | null;
  file_url?: string | null;
}

export interface HazardousMaterialListQueryParams extends ListQueryParams {
  category?: string;
  hazard_class?: string;
  status?: string;
}

export interface HazardousMaterialInventoryListQueryParams extends ListQueryParams {
  material_id?: string;
  warehouse?: string;
  status?: string;
}

export interface HazardousMaterialMovementListQueryParams extends ListQueryParams {
  material_id?: string;
  movement_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

// ============ Environmental Compliance Types ============
export interface EnvironmentalRegulation {
  id: string;
  regulation_no: string;
  title: string;
  category: string;
  regulation_type: 'law' | 'regulation' | 'standard' | 'policy' | 'notice';
  issuing_authority: string | null;
  issue_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  version: string | null;
  status: 'draft' | 'published' | 'effective' | 'expired' | 'archived';
  content: string | null;
  keywords: string[] | null;
  applicable_scopes: string[] | null;
  attachments: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAssessment {
  id: string;
  assessment_no: string;
  title: string;
  assessment_type: string;
  scope: string | null;
  period_start: string | null;
  period_end: string | null;
  assessor: string | null;
  assessment_date: string | null;
  result: 'compliant' | 'partially_compliant' | 'non_compliant';
  score: number | null;
  findings: string | null;
  non_compliance_items: string[] | null;
  corrective_actions: string | null;
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DischargePermit {
  id: string;
  permit_no: string;
  title: string;
  permit_type: string;
  permit_category: string;
  holder: string | null;
  issue_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
  discharge_location: string | null;
  discharge_standard: string | null;
  discharge_limits: any;
  monitoring_requirements: string | null;
  status: 'valid' | 'expired' | 'revoked' | 'pending_renewal';
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentalEvent {
  id: string;
  event_no: string;
  title: string;
  event_type: string;
  event_category: 'spill' | 'leak' | 'emission_exceedance' | 'waste_violation' | 'complaint' | 'other';
  location: string | null;
  occurred_at: string | null;
  reported_at: string | null;
  reported_by: string | null;
  severity: 'minor' | 'moderate' | 'major' | 'catastrophic';
  description: string | null;
  immediate_actions: string | null;
  root_cause: string | null;
  corrective_actions: string | null;
  preventive_measures: string | null;
  environmental_impact: string | null;
  regulatory_reporting_required: boolean;
  status: 'reported' | 'investigating' | 'mitigating' | 'resolved' | 'closed';
  responsible_person: string | null;
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEnvironmentalRegulationRequest {
  title: string;
  category: string;
  regulation_type: 'law' | 'regulation' | 'standard' | 'policy' | 'notice';
  issuing_authority?: string | null;
  issue_date?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  version?: string | null;
  content?: string | null;
  keywords?: string[] | null;
  applicable_scopes?: string[] | null;
  attachments?: string[] | null;
  status?: 'draft' | 'published' | 'effective' | 'expired' | 'archived';
}

export interface UpdateEnvironmentalRegulationRequest {
  title?: string;
  category?: string;
  regulation_type?: 'law' | 'regulation' | 'standard' | 'policy' | 'notice';
  issuing_authority?: string | null;
  issue_date?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  version?: string | null;
  content?: string | null;
  keywords?: string[] | null;
  applicable_scopes?: string[] | null;
  attachments?: string[] | null;
  status?: 'draft' | 'published' | 'effective' | 'expired' | 'archived';
}

export interface CreateComplianceAssessmentRequest {
  title: string;
  assessment_type: string;
  scope?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  assessor?: string | null;
  assessment_date?: string | null;
  result?: 'compliant' | 'partially_compliant' | 'non_compliant';
  score?: number | null;
  findings?: string | null;
  non_compliance_items?: string[] | null;
  corrective_actions?: string | null;
  attachments?: string[] | null;
  status?: 'draft' | 'in_progress' | 'completed' | 'approved';
}

export interface UpdateComplianceAssessmentRequest {
  title?: string;
  assessment_type?: string;
  scope?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  assessor?: string | null;
  assessment_date?: string | null;
  result?: 'compliant' | 'partially_compliant' | 'non_compliant';
  score?: number | null;
  findings?: string | null;
  non_compliance_items?: string[] | null;
  corrective_actions?: string | null;
  attachments?: string[] | null;
  status?: 'draft' | 'in_progress' | 'completed' | 'approved';
}

export interface CreateDischargePermitRequest {
  title: string;
  permit_type: string;
  permit_category: string;
  holder?: string | null;
  issue_date?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  issuing_authority?: string | null;
  discharge_location?: string | null;
  discharge_standard?: string | null;
  discharge_limits?: any;
  monitoring_requirements?: string | null;
  attachments?: string[] | null;
  status?: 'valid' | 'expired' | 'revoked' | 'pending_renewal';
}

export interface UpdateDischargePermitRequest {
  title?: string;
  permit_type?: string;
  permit_category?: string;
  holder?: string | null;
  issue_date?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  issuing_authority?: string | null;
  discharge_location?: string | null;
  discharge_standard?: string | null;
  discharge_limits?: any;
  monitoring_requirements?: string | null;
  attachments?: string[] | null;
  status?: 'valid' | 'expired' | 'revoked' | 'pending_renewal';
}

export interface CreateEnvironmentalEventRequest {
  title: string;
  event_type: string;
  event_category: 'spill' | 'leak' | 'emission_exceedance' | 'waste_violation' | 'complaint' | 'other';
  location?: string | null;
  occurred_at?: string | null;
  reported_by?: string | null;
  severity?: 'minor' | 'moderate' | 'major' | 'catastrophic';
  description?: string | null;
  immediate_actions?: string | null;
  root_cause?: string | null;
  corrective_actions?: string | null;
  preventive_measures?: string | null;
  environmental_impact?: string | null;
  regulatory_reporting_required?: boolean;
  responsible_person?: string | null;
  attachments?: string[] | null;
  status?: 'reported' | 'investigating' | 'mitigating' | 'resolved' | 'closed';
}

export interface UpdateEnvironmentalEventRequest {
  title?: string;
  event_type?: string;
  event_category?: 'spill' | 'leak' | 'emission_exceedance' | 'waste_violation' | 'complaint' | 'other';
  location?: string | null;
  occurred_at?: string | null;
  severity?: 'minor' | 'moderate' | 'major' | 'catastrophic';
  description?: string | null;
  immediate_actions?: string | null;
  root_cause?: string | null;
  corrective_actions?: string | null;
  preventive_measures?: string | null;
  environmental_impact?: string | null;
  regulatory_reporting_required?: boolean;
  responsible_person?: string | null;
  attachments?: string[] | null;
  status?: 'reported' | 'investigating' | 'mitigating' | 'resolved' | 'closed';
}

export interface EnvironmentalRegulationListQueryParams extends ListQueryParams {
  category?: string;
  regulation_type?: string;
  status?: string;
}

export interface ComplianceAssessmentListQueryParams extends ListQueryParams {
  assessment_type?: string;
  result?: string;
  status?: string;
}

export interface DischargePermitListQueryParams extends ListQueryParams {
  permit_type?: string;
  permit_category?: string;
  status?: string;
}

export interface EnvironmentalEventListQueryParams extends ListQueryParams {
  event_type?: string;
  event_category?: string;
  severity?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

// ============ Data Sync Types ============
export interface SyncRecord {
  id: string;
  sync_no: string;
  sync_type: string;
  source_system: string;
  target_system: string;
  entity_type: string;
  entity_count: number;
  success_count: number;
  failed_count: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  triggered_by: string | null;
  trigger_type: 'manual' | 'scheduled' | 'event';
  error_message: string | null;
  error_details: any;
  created_at: string;
  updated_at: string;
}

export interface SyncRecordDetail {
  id: string;
  sync_id: string;
  entity_id: string;
  entity_type: string;
  entity_name: string;
  operation: 'create' | 'update' | 'delete';
  status: 'success' | 'failed' | 'skipped' | 'pending';
  error_message: string | null;
  source_data: any;
  target_data: any;
  retried_count: number;
  last_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncConfig {
  id: string;
  config_name: string;
  sync_type: string;
  source_system: string;
  target_system: string;
  entity_type: string;
  direction: 'bidirectional' | 'source_to_target' | 'target_to_source';
  schedule: string | null;
  enabled: boolean;
  last_sync_at: string | null;
  next_sync_at: string | null;
  filters: any;
  field_mapping: any;
  created_at: string;
  updated_at: string;
}

export interface CreateSyncRequest {
  sync_type: string;
  source_system: string;
  target_system: string;
  entity_type: string;
  trigger_type?: 'manual' | 'scheduled' | 'event';
  entity_ids?: string[] | null;
  filters?: any;
}

export interface SyncRetryRequest {
  sync_id: string;
  detail_ids?: string[] | null;
  all_failed?: boolean;
}

export interface SyncRecordListQueryParams extends ListQueryParams {
  sync_type?: string;
  source_system?: string;
  target_system?: string;
  entity_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
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

  // ============ Risk Management ============
  listRisks: async (
    params?: RiskListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Risk>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.risk_level) queryParams.append('risk_level', params.risk_level);
    if (params?.category) queryParams.append('category', params.category);

    return apiClient.ehs.get<PaginatedResponse<Risk>>(
      `/api/ehs/risks?${queryParams.toString()}`
    );
  },
  getRisk: async (id: string): Promise<ApiResponse<Risk>> => {
    return apiClient.ehs.get<Risk>(`/api/ehs/risks/${id}`);
  },
  createRisk: async (data: CreateRiskRequest): Promise<ApiResponse<Risk>> => {
    return apiClient.ehs.post<Risk>('/api/ehs/risks', data);
  },
  updateRisk: async (
    id: string,
    data: Partial<UpdateRiskRequest>
  ): Promise<ApiResponse<Risk>> => {
    return apiClient.ehs.put<Risk>(`/api/ehs/risks/${id}`, data);
  },
  deleteRisk: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/risks/${id}`);
  },

  // Risk Assessments
  listRiskMgmtAssessments: async (
    riskId: string
  ): Promise<ApiResponse<PaginatedResponse<RiskMgmtAssessment>>> => {
    return apiClient.ehs.get<PaginatedResponse<RiskMgmtAssessment>>(
      `/api/ehs/risks/${riskId}/assessments`
    );
  },
  createRiskMgmtAssessment: async (
    riskId: string,
    data: CreateRiskMgmtAssessmentRequest
  ): Promise<ApiResponse<RiskMgmtAssessment>> => {
    return apiClient.ehs.post<RiskMgmtAssessment>(
      `/api/ehs/risks/${riskId}/assessments`,
      data
    );
  },

  // Risk Control Measures
  listRiskControlMeasures: async (
    riskId: string
  ): Promise<ApiResponse<PaginatedResponse<RiskControlMeasure>>> => {
    return apiClient.ehs.get<PaginatedResponse<RiskControlMeasure>>(
      `/api/ehs/risks/${riskId}/controls`
    );
  },
  createRiskControlMeasure: async (
    riskId: string,
    data: CreateRiskControlMeasureRequest
  ): Promise<ApiResponse<RiskControlMeasure>> => {
    return apiClient.ehs.post<RiskControlMeasure>(
      `/api/ehs/risks/${riskId}/controls`,
      data
    );
  },
  updateRiskControlMeasure: async (
    riskId: string,
    measureId: string,
    data: Partial<UpdateRiskControlMeasureRequest>
  ): Promise<ApiResponse<RiskControlMeasure>> => {
    return apiClient.ehs.put<RiskControlMeasure>(
      `/api/ehs/risks/${riskId}/controls/${measureId}`,
      data
    );
  },
  deleteRiskControlMeasure: async (
    riskId: string,
    measureId: string
  ): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/risks/${riskId}/controls/${measureId}`);
  },

  // ============ Environment Management ============
  listEnvironmentMonitors: async (
    params?: EnvironmentMonitorListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EnvironmentMonitor>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.monitor_type) queryParams.append('monitor_type', params.monitor_type);

    return apiClient.ehs.get<PaginatedResponse<EnvironmentMonitor>>(
      `/api/ehs/environment/monitors?${queryParams.toString()}`
    );
  },
  getEnvironmentMonitor: async (id: string): Promise<ApiResponse<EnvironmentMonitor>> => {
    return apiClient.ehs.get<EnvironmentMonitor>(`/api/ehs/environment/monitors/${id}`);
  },
  createEnvironmentMonitor: async (
    data: CreateEnvironmentMonitorRequest
  ): Promise<ApiResponse<EnvironmentMonitor>> => {
    return apiClient.ehs.post<EnvironmentMonitor>('/api/ehs/environment/monitors', data);
  },
  updateEnvironmentMonitor: async (
    id: string,
    data: Partial<UpdateEnvironmentMonitorRequest>
  ): Promise<ApiResponse<EnvironmentMonitor>> => {
    return apiClient.ehs.put<EnvironmentMonitor>(
      `/api/ehs/environment/monitors/${id}`,
      data
    );
  },
  deleteEnvironmentMonitor: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/environment/monitors/${id}`);
  },

  // Environment Indicators
  listEnvironmentIndicators: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EnvironmentIndicator>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<EnvironmentIndicator>>(
      `/api/ehs/environment/indicators?${queryParams.toString()}`
    );
  },

  // Environment Monitor Records
  listEnvironmentMonitorRecords: async (
    params?: EnvironmentMonitorRecordListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EnvironmentMonitorRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.monitor_id) queryParams.append('monitor_id', params.monitor_id);
    if (params?.monitor_type) queryParams.append('monitor_type', params.monitor_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.ehs.get<PaginatedResponse<EnvironmentMonitorRecord>>(
      `/api/ehs/environment/records?${queryParams.toString()}`
    );
  },
  getEnvironmentMonitorRecord: async (
    id: string
  ): Promise<ApiResponse<EnvironmentMonitorRecord>> => {
    return apiClient.ehs.get<EnvironmentMonitorRecord>(`/api/ehs/environment/records/${id}`);
  },
  createEnvironmentMonitorRecord: async (
    data: CreateEnvironmentMonitorRecordRequest
  ): Promise<ApiResponse<EnvironmentMonitorRecord>> => {
    return apiClient.ehs.post<EnvironmentMonitorRecord>(
      '/api/ehs/environment/records',
      data
    );
  },

  // ============ Training Management ============
  listTrainingPlans: async (
    params?: TrainingPlanListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<TrainingPlan>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.training_type) queryParams.append('training_type', params.training_type);
    if (params?.category) queryParams.append('category', params.category);

    return apiClient.ehs.get<PaginatedResponse<TrainingPlan>>(
      `/api/ehs/training/plans?${queryParams.toString()}`
    );
  },
  getTrainingPlan: async (id: string): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.ehs.get<TrainingPlan>(`/api/ehs/training/plans/${id}`);
  },
  createTrainingPlan: async (
    data: CreateTrainingPlanRequest
  ): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.ehs.post<TrainingPlan>('/api/ehs/training/plans', data);
  },
  updateTrainingPlan: async (
    id: string,
    data: Partial<UpdateTrainingPlanRequest>
  ): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.ehs.put<TrainingPlan>(`/api/ehs/training/plans/${id}`, data);
  },
  deleteTrainingPlan: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/training/plans/${id}`);
  },

  // Training Records
  listTrainingRecords: async (
    params?: TrainingRecordListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<TrainingRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.training_type) queryParams.append('training_type', params.training_type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);

    return apiClient.ehs.get<PaginatedResponse<TrainingRecord>>(
      `/api/ehs/training/records?${queryParams.toString()}`
    );
  },
  getTrainingRecord: async (id: string): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.ehs.get<TrainingRecord>(`/api/ehs/training/records/${id}`);
  },
  createTrainingRecord: async (
    data: CreateTrainingRecordRequest
  ): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.ehs.post<TrainingRecord>('/api/ehs/training/records', data);
  },
  updateTrainingRecord: async (
    id: string,
    data: Partial<UpdateTrainingRecordRequest>
  ): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.ehs.put<TrainingRecord>(`/api/ehs/training/records/${id}`, data);
  },
  deleteTrainingRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/training/records/${id}`);
  },

  // Training Certificates
  listTrainingCertificates: async (
    params?: TrainingCertificateListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<TrainingCertificate>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.training_type) queryParams.append('training_type', params.training_type);

    return apiClient.ehs.get<PaginatedResponse<TrainingCertificate>>(
      `/api/ehs/training/certificates?${queryParams.toString()}`
    );
  },
  getTrainingCertificate: async (
    id: string
  ): Promise<ApiResponse<TrainingCertificate>> => {
    return apiClient.ehs.get<TrainingCertificate>(`/api/ehs/training/certificates/${id}`);
  },
  createTrainingCertificate: async (
    data: CreateTrainingCertificateRequest
  ): Promise<ApiResponse<TrainingCertificate>> => {
    return apiClient.ehs.post<TrainingCertificate>(
      '/api/ehs/training/certificates',
      data
    );
  },
  updateTrainingCertificate: async (
    id: string,
    data: Partial<UpdateTrainingCertificateRequest>
  ): Promise<ApiResponse<TrainingCertificate>> => {
    return apiClient.ehs.put<TrainingCertificate>(
      `/api/ehs/training/certificates/${id}`,
      data
    );
  },
  deleteTrainingCertificate: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/training/certificates/${id}`);
  },

  // ============ Occupational Health ============
  listHealthRecords: async (
    params?: HealthRecordListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HealthRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.department) queryParams.append('department', params.department);
    if (params?.position) queryParams.append('position', params.position);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<HealthRecord>>(
      `/api/ehs/occupational-health/records?${queryParams.toString()}`
    );
  },
  getHealthRecord: async (id: string): Promise<ApiResponse<HealthRecord>> => {
    return apiClient.ehs.get<HealthRecord>(`/api/ehs/occupational-health/records/${id}`);
  },
  createHealthRecord: async (
    data: CreateHealthRecordRequest
  ): Promise<ApiResponse<HealthRecord>> => {
    return apiClient.ehs.post<HealthRecord>('/api/ehs/occupational-health/records', data);
  },
  updateHealthRecord: async (
    id: string,
    data: Partial<UpdateHealthRecordRequest>
  ): Promise<ApiResponse<HealthRecord>> => {
    return apiClient.ehs.put<HealthRecord>(
      `/api/ehs/occupational-health/records/${id}`,
      data
    );
  },
  deleteHealthRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/occupational-health/records/${id}`);
  },

  // Health Check Plans
  listHealthCheckPlans: async (
    params?: HealthCheckPlanListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HealthCheckPlan>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.check_type) queryParams.append('check_type', params.check_type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<HealthCheckPlan>>(
      `/api/ehs/occupational-health/check-plans?${queryParams.toString()}`
    );
  },
  getHealthCheckPlan: async (id: string): Promise<ApiResponse<HealthCheckPlan>> => {
    return apiClient.ehs.get<HealthCheckPlan>(
      `/api/ehs/occupational-health/check-plans/${id}`
    );
  },
  createHealthCheckPlan: async (
    data: CreateHealthCheckPlanRequest
  ): Promise<ApiResponse<HealthCheckPlan>> => {
    return apiClient.ehs.post<HealthCheckPlan>(
      '/api/ehs/occupational-health/check-plans',
      data
    );
  },
  updateHealthCheckPlan: async (
    id: string,
    data: Partial<UpdateHealthCheckPlanRequest>
  ): Promise<ApiResponse<HealthCheckPlan>> => {
    return apiClient.ehs.put<HealthCheckPlan>(
      `/api/ehs/occupational-health/check-plans/${id}`,
      data
    );
  },
  deleteHealthCheckPlan: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/occupational-health/check-plans/${id}`
    );
  },

  // Health Check Records
  listHealthCheckRecords: async (
    params?: HealthCheckRecordListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HealthCheckRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);
    if (params?.check_type) queryParams.append('check_type', params.check_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.ehs.get<PaginatedResponse<HealthCheckRecord>>(
      `/api/ehs/occupational-health/check-records?${queryParams.toString()}`
    );
  },
  getHealthCheckRecord: async (id: string): Promise<ApiResponse<HealthCheckRecord>> => {
    return apiClient.ehs.get<HealthCheckRecord>(
      `/api/ehs/occupational-health/check-records/${id}`
    );
  },
  createHealthCheckRecord: async (
    data: CreateHealthCheckRecordRequest
  ): Promise<ApiResponse<HealthCheckRecord>> => {
    return apiClient.ehs.post<HealthCheckRecord>(
      '/api/ehs/occupational-health/check-records',
      data
    );
  },
  updateHealthCheckRecord: async (
    id: string,
    data: Partial<UpdateHealthCheckRecordRequest>
  ): Promise<ApiResponse<HealthCheckRecord>> => {
    return apiClient.ehs.put<HealthCheckRecord>(
      `/api/ehs/occupational-health/check-records/${id}`,
      data
    );
  },
  deleteHealthCheckRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/occupational-health/check-records/${id}`
    );
  },

  // Contraindications
  listContraindications: async (
    params?: ContraindicationListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Contraindication>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.hazard_factor) queryParams.append('hazard_factor', params.hazard_factor);

    return apiClient.ehs.get<PaginatedResponse<Contraindication>>(
      `/api/ehs/occupational-health/contraindications?${queryParams.toString()}`
    );
  },
  getContraindication: async (id: string): Promise<ApiResponse<Contraindication>> => {
    return apiClient.ehs.get<Contraindication>(
      `/api/ehs/occupational-health/contraindications/${id}`
    );
  },
  createContraindication: async (
    data: CreateContraindicationRequest
  ): Promise<ApiResponse<Contraindication>> => {
    return apiClient.ehs.post<Contraindication>(
      '/api/ehs/occupational-health/contraindications',
      data
    );
  },
  updateContraindication: async (
    id: string,
    data: Partial<UpdateContraindicationRequest>
  ): Promise<ApiResponse<Contraindication>> => {
    return apiClient.ehs.put<Contraindication>(
      `/api/ehs/occupational-health/contraindications/${id}`,
      data
    );
  },
  deleteContraindication: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/occupational-health/contraindications/${id}`
    );
  },

  // ============ Occupational Disease ============
  listHazardFactors: async (
    params?: HazardFactorListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HazardFactor>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.hazard_level) queryParams.append('hazard_level', params.hazard_level);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<HazardFactor>>(
      `/api/ehs/occupational-diseases/factors?${queryParams.toString()}`
    );
  },
  getHazardFactor: async (id: string): Promise<ApiResponse<HazardFactor>> => {
    return apiClient.ehs.get<HazardFactor>(
      `/api/ehs/occupational-diseases/factors/${id}`
    );
  },
  createHazardFactor: async (
    data: CreateHazardFactorRequest
  ): Promise<ApiResponse<HazardFactor>> => {
    return apiClient.ehs.post<HazardFactor>(
      '/api/ehs/occupational-diseases/factors',
      data
    );
  },
  updateHazardFactor: async (
    id: string,
    data: Partial<UpdateHazardFactorRequest>
  ): Promise<ApiResponse<HazardFactor>> => {
    return apiClient.ehs.put<HazardFactor>(
      `/api/ehs/occupational-diseases/factors/${id}`,
      data
    );
  },
  deleteHazardFactor: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/occupational-diseases/factors/${id}`
    );
  },

  // Hazard Detection Records
  listHazardDetectionRecords: async (
    params?: HazardDetectionRecordListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HazardDetectionRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.factor_id) queryParams.append('factor_id', params.factor_id);
    if (params?.result) queryParams.append('result', params.result);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.ehs.get<PaginatedResponse<HazardDetectionRecord>>(
      `/api/ehs/occupational-diseases/detection-records?${queryParams.toString()}`
    );
  },
  getHazardDetectionRecord: async (
    id: string
  ): Promise<ApiResponse<HazardDetectionRecord>> => {
    return apiClient.ehs.get<HazardDetectionRecord>(
      `/api/ehs/occupational-diseases/detection-records/${id}`
    );
  },
  createHazardDetectionRecord: async (
    data: CreateHazardDetectionRecordRequest
  ): Promise<ApiResponse<HazardDetectionRecord>> => {
    return apiClient.ehs.post<HazardDetectionRecord>(
      '/api/ehs/occupational-diseases/detection-records',
      data
    );
  },
  updateHazardDetectionRecord: async (
    id: string,
    data: Partial<UpdateHazardDetectionRecordRequest>
  ): Promise<ApiResponse<HazardDetectionRecord>> => {
    return apiClient.ehs.put<HazardDetectionRecord>(
      `/api/ehs/occupational-diseases/detection-records/${id}`,
      data
    );
  },
  deleteHazardDetectionRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/occupational-diseases/detection-records/${id}`
    );
  },

  // Occupational Disease Cases
  listOccupationalDiseaseCases: async (
    params?: OccupationalDiseaseCaseListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<OccupationalDiseaseCase>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);
    if (params?.disease_type) queryParams.append('disease_type', params.disease_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.severity) queryParams.append('severity', params.severity);

    return apiClient.ehs.get<PaginatedResponse<OccupationalDiseaseCase>>(
      `/api/ehs/occupational-diseases/cases?${queryParams.toString()}`
    );
  },
  getOccupationalDiseaseCase: async (
    id: string
  ): Promise<ApiResponse<OccupationalDiseaseCase>> => {
    return apiClient.ehs.get<OccupationalDiseaseCase>(
      `/api/ehs/occupational-diseases/cases/${id}`
    );
  },
  createOccupationalDiseaseCase: async (
    data: CreateOccupationalDiseaseCaseRequest
  ): Promise<ApiResponse<OccupationalDiseaseCase>> => {
    return apiClient.ehs.post<OccupationalDiseaseCase>(
      '/api/ehs/occupational-diseases/cases',
      data
    );
  },
  updateOccupationalDiseaseCase: async (
    id: string,
    data: Partial<UpdateOccupationalDiseaseCaseRequest>
  ): Promise<ApiResponse<OccupationalDiseaseCase>> => {
    return apiClient.ehs.put<OccupationalDiseaseCase>(
      `/api/ehs/occupational-diseases/cases/${id}`,
      data
    );
  },
  deleteOccupationalDiseaseCase: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/occupational-diseases/cases/${id}`
    );
  },

  // Protection Measures
  listProtectionMeasures: async (
    params?: ProtectionMeasureListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<ProtectionMeasure>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.factor_id) queryParams.append('factor_id', params.factor_id);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<ProtectionMeasure>>(
      `/api/ehs/occupational-diseases/protection-measures?${queryParams.toString()}`
    );
  },
  getProtectionMeasure: async (id: string): Promise<ApiResponse<ProtectionMeasure>> => {
    return apiClient.ehs.get<ProtectionMeasure>(
      `/api/ehs/occupational-diseases/protection-measures/${id}`
    );
  },
  createProtectionMeasure: async (
    data: CreateProtectionMeasureRequest
  ): Promise<ApiResponse<ProtectionMeasure>> => {
    return apiClient.ehs.post<ProtectionMeasure>(
      '/api/ehs/occupational-diseases/protection-measures',
      data
    );
  },
  updateProtectionMeasure: async (
    id: string,
    data: Partial<UpdateProtectionMeasureRequest>
  ): Promise<ApiResponse<ProtectionMeasure>> => {
    return apiClient.ehs.put<ProtectionMeasure>(
      `/api/ehs/occupational-diseases/protection-measures/${id}`,
      data
    );
  },
  deleteProtectionMeasure: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/occupational-diseases/protection-measures/${id}`
    );
  },

  // ============ Hazardous Material Management ============
  listHazardousMaterials: async (
    params?: HazardousMaterialListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HazardousMaterial>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.hazard_class) queryParams.append('hazard_class', params.hazard_class);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<HazardousMaterial>>(
      `/api/ehs/hazardous-materials?${queryParams.toString()}`
    );
  },
  getHazardousMaterial: async (id: string): Promise<ApiResponse<HazardousMaterial>> => {
    return apiClient.ehs.get<HazardousMaterial>(`/api/ehs/hazardous-materials/${id}`);
  },
  createHazardousMaterial: async (
    data: CreateHazardousMaterialRequest
  ): Promise<ApiResponse<HazardousMaterial>> => {
    return apiClient.ehs.post<HazardousMaterial>('/api/ehs/hazardous-materials', data);
  },
  updateHazardousMaterial: async (
    id: string,
    data: Partial<UpdateHazardousMaterialRequest>
  ): Promise<ApiResponse<HazardousMaterial>> => {
    return apiClient.ehs.put<HazardousMaterial>(
      `/api/ehs/hazardous-materials/${id}`,
      data
    );
  },
  deleteHazardousMaterial: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/hazardous-materials/${id}`);
  },

  // Hazardous Material Categories
  listHazardousMaterialCategories: async (): Promise<
    ApiResponse<HazardousMaterialCategory[]>
  > => {
    return apiClient.ehs.get<HazardousMaterialCategory[]>(
      '/api/ehs/hazardous-materials/categories'
    );
  },
  createHazardousMaterialCategory: async (
    data: CreateHazardousMaterialCategoryRequest
  ): Promise<ApiResponse<HazardousMaterialCategory>> => {
    return apiClient.ehs.post<HazardousMaterialCategory>(
      '/api/ehs/hazardous-materials/categories',
      data
    );
  },
  updateHazardousMaterialCategory: async (
    id: string,
    data: Partial<UpdateHazardousMaterialCategoryRequest>
  ): Promise<ApiResponse<HazardousMaterialCategory>> => {
    return apiClient.ehs.put<HazardousMaterialCategory>(
      `/api/ehs/hazardous-materials/categories/${id}`,
      data
    );
  },
  deleteHazardousMaterialCategory: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/hazardous-materials/categories/${id}`
    );
  },

  // Hazardous Material Inventory
  listHazardousMaterialInventory: async (
    params?: HazardousMaterialInventoryListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HazardousMaterialInventory>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.material_id) queryParams.append('material_id', params.material_id);
    if (params?.warehouse) queryParams.append('warehouse', params.warehouse);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<HazardousMaterialInventory>>(
      `/api/ehs/hazardous-materials/inventory?${queryParams.toString()}`
    );
  },
  getHazardousMaterialInventory: async (
    id: string
  ): Promise<ApiResponse<HazardousMaterialInventory>> => {
    return apiClient.ehs.get<HazardousMaterialInventory>(
      `/api/ehs/hazardous-materials/inventory/${id}`
    );
  },
  createHazardousMaterialInventory: async (
    data: CreateHazardousMaterialInventoryRequest
  ): Promise<ApiResponse<HazardousMaterialInventory>> => {
    return apiClient.ehs.post<HazardousMaterialInventory>(
      '/api/ehs/hazardous-materials/inventory',
      data
    );
  },
  updateHazardousMaterialInventory: async (
    id: string,
    data: Partial<UpdateHazardousMaterialInventoryRequest>
  ): Promise<ApiResponse<HazardousMaterialInventory>> => {
    return apiClient.ehs.put<HazardousMaterialInventory>(
      `/api/ehs/hazardous-materials/inventory/${id}`,
      data
    );
  },
  deleteHazardousMaterialInventory: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/hazardous-materials/inventory/${id}`
    );
  },

  // Hazardous Material Movements
  listHazardousMaterialMovements: async (
    params?: HazardousMaterialMovementListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HazardousMaterialMovement>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.material_id) queryParams.append('material_id', params.material_id);
    if (params?.movement_type) queryParams.append('movement_type', params.movement_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.ehs.get<PaginatedResponse<HazardousMaterialMovement>>(
      `/api/ehs/hazardous-materials/movements?${queryParams.toString()}`
    );
  },
  getHazardousMaterialMovement: async (
    id: string
  ): Promise<ApiResponse<HazardousMaterialMovement>> => {
    return apiClient.ehs.get<HazardousMaterialMovement>(
      `/api/ehs/hazardous-materials/movements/${id}`
    );
  },
  createHazardousMaterialMovement: async (
    data: CreateHazardousMaterialMovementRequest
  ): Promise<ApiResponse<HazardousMaterialMovement>> => {
    return apiClient.ehs.post<HazardousMaterialMovement>(
      '/api/ehs/hazardous-materials/movements',
      data
    );
  },
  updateHazardousMaterialMovement: async (
    id: string,
    data: Partial<UpdateHazardousMaterialMovementRequest>
  ): Promise<ApiResponse<HazardousMaterialMovement>> => {
    return apiClient.ehs.put<HazardousMaterialMovement>(
      `/api/ehs/hazardous-materials/movements/${id}`,
      data
    );
  },
  deleteHazardousMaterialMovement: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/hazardous-materials/movements/${id}`
    );
  },

  // MSDS
  listMSDS: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<MSDS>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.ehs.get<PaginatedResponse<MSDS>>(
      `/api/ehs/hazardous-materials/msds?${queryParams.toString()}`
    );
  },
  getMSDS: async (id: string): Promise<ApiResponse<MSDS>> => {
    return apiClient.ehs.get<MSDS>(`/api/ehs/hazardous-materials/msds/${id}`);
  },
  getMSDSByMaterialId: async (materialId: string): Promise<ApiResponse<MSDS>> => {
    return apiClient.ehs.get<MSDS>(
      `/api/ehs/hazardous-materials/${materialId}/msds`
    );
  },
  createMSDS: async (data: CreateMSDSRequest): Promise<ApiResponse<MSDS>> => {
    return apiClient.ehs.post<MSDS>('/api/ehs/hazardous-materials/msds', data);
  },
  updateMSDS: async (
    id: string,
    data: Partial<UpdateMSDSRequest>
  ): Promise<ApiResponse<MSDS>> => {
    return apiClient.ehs.put<MSDS>(`/api/ehs/hazardous-materials/msds/${id}`, data);
  },
  deleteMSDS: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/hazardous-materials/msds/${id}`);
  },

  // ============ Environmental Compliance ============
  listEnvironmentalRegulations: async (
    params?: EnvironmentalRegulationListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EnvironmentalRegulation>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.regulation_type) queryParams.append('regulation_type', params.regulation_type);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<EnvironmentalRegulation>>(
      `/api/ehs/environmental-compliance/regulations?${queryParams.toString()}`
    );
  },
  getEnvironmentalRegulation: async (
    id: string
  ): Promise<ApiResponse<EnvironmentalRegulation>> => {
    return apiClient.ehs.get<EnvironmentalRegulation>(
      `/api/ehs/environmental-compliance/regulations/${id}`
    );
  },
  createEnvironmentalRegulation: async (
    data: CreateEnvironmentalRegulationRequest
  ): Promise<ApiResponse<EnvironmentalRegulation>> => {
    return apiClient.ehs.post<EnvironmentalRegulation>(
      '/api/ehs/environmental-compliance/regulations',
      data
    );
  },
  updateEnvironmentalRegulation: async (
    id: string,
    data: Partial<UpdateEnvironmentalRegulationRequest>
  ): Promise<ApiResponse<EnvironmentalRegulation>> => {
    return apiClient.ehs.put<EnvironmentalRegulation>(
      `/api/ehs/environmental-compliance/regulations/${id}`,
      data
    );
  },
  deleteEnvironmentalRegulation: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/environmental-compliance/regulations/${id}`
    );
  },

  // Compliance Assessments
  listComplianceAssessments: async (
    params?: ComplianceAssessmentListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<ComplianceAssessment>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.assessment_type)
      queryParams.append('assessment_type', params.assessment_type);
    if (params?.result) queryParams.append('result', params.result);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<ComplianceAssessment>>(
      `/api/ehs/environmental-compliance/assessments?${queryParams.toString()}`
    );
  },
  getComplianceAssessment: async (
    id: string
  ): Promise<ApiResponse<ComplianceAssessment>> => {
    return apiClient.ehs.get<ComplianceAssessment>(
      `/api/ehs/environmental-compliance/assessments/${id}`
    );
  },
  createComplianceAssessment: async (
    data: CreateComplianceAssessmentRequest
  ): Promise<ApiResponse<ComplianceAssessment>> => {
    return apiClient.ehs.post<ComplianceAssessment>(
      '/api/ehs/environmental-compliance/assessments',
      data
    );
  },
  updateComplianceAssessment: async (
    id: string,
    data: Partial<UpdateComplianceAssessmentRequest>
  ): Promise<ApiResponse<ComplianceAssessment>> => {
    return apiClient.ehs.put<ComplianceAssessment>(
      `/api/ehs/environmental-compliance/assessments/${id}`,
      data
    );
  },
  deleteComplianceAssessment: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/environmental-compliance/assessments/${id}`
    );
  },

  // Discharge Permits
  listDischargePermits: async (
    params?: DischargePermitListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<DischargePermit>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.permit_type) queryParams.append('permit_type', params.permit_type);
    if (params?.permit_category) queryParams.append('permit_category', params.permit_category);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<DischargePermit>>(
      `/api/ehs/environmental-compliance/permits?${queryParams.toString()}`
    );
  },
  getDischargePermit: async (id: string): Promise<ApiResponse<DischargePermit>> => {
    return apiClient.ehs.get<DischargePermit>(
      `/api/ehs/environmental-compliance/permits/${id}`
    );
  },
  createDischargePermit: async (
    data: CreateDischargePermitRequest
  ): Promise<ApiResponse<DischargePermit>> => {
    return apiClient.ehs.post<DischargePermit>(
      '/api/ehs/environmental-compliance/permits',
      data
    );
  },
  updateDischargePermit: async (
    id: string,
    data: Partial<UpdateDischargePermitRequest>
  ): Promise<ApiResponse<DischargePermit>> => {
    return apiClient.ehs.put<DischargePermit>(
      `/api/ehs/environmental-compliance/permits/${id}`,
      data
    );
  },
  deleteDischargePermit: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/environmental-compliance/permits/${id}`
    );
  },

  // Environmental Events
  listEnvironmentalEvents: async (
    params?: EnvironmentalEventListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EnvironmentalEvent>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.event_type) queryParams.append('event_type', params.event_type);
    if (params?.event_category) queryParams.append('event_category', params.event_category);
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.ehs.get<PaginatedResponse<EnvironmentalEvent>>(
      `/api/ehs/environmental-compliance/events?${queryParams.toString()}`
    );
  },
  getEnvironmentalEvent: async (id: string): Promise<ApiResponse<EnvironmentalEvent>> => {
    return apiClient.ehs.get<EnvironmentalEvent>(
      `/api/ehs/environmental-compliance/events/${id}`
    );
  },
  createEnvironmentalEvent: async (
    data: CreateEnvironmentalEventRequest
  ): Promise<ApiResponse<EnvironmentalEvent>> => {
    return apiClient.ehs.post<EnvironmentalEvent>(
      '/api/ehs/environmental-compliance/events',
      data
    );
  },
  updateEnvironmentalEvent: async (
    id: string,
    data: Partial<UpdateEnvironmentalEventRequest>
  ): Promise<ApiResponse<EnvironmentalEvent>> => {
    return apiClient.ehs.put<EnvironmentalEvent>(
      `/api/ehs/environmental-compliance/events/${id}`,
      data
    );
  },
  deleteEnvironmentalEvent: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/environmental-compliance/events/${id}`
    );
  },

  // ============ Data Sync ============
  listSyncRecords: async (
    params?: SyncRecordListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SyncRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sync_type) queryParams.append('sync_type', params.sync_type);
    if (params?.source_system) queryParams.append('source_system', params.source_system);
    if (params?.target_system) queryParams.append('target_system', params.target_system);
    if (params?.entity_type) queryParams.append('entity_type', params.entity_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.ehs.get<PaginatedResponse<SyncRecord>>(
      `/api/ehs/sync-records?${queryParams.toString()}`
    );
  },
  getSyncRecord: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.ehs.get<SyncRecord>(`/api/ehs/sync-records/${id}`);
  },
  createSync: async (data: CreateSyncRequest): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.ehs.post<SyncRecord>('/api/ehs/sync', data);
  },
  retrySync: async (data: SyncRetryRequest): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.ehs.post<SyncRecord>('/api/ehs/sync/retry', data);
  },
  syncToQMS: async (
    entityType: string,
    entityIds?: string[]
  ): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.ehs.post<SyncRecord>('/api/ehs/sync/to-qms', {
      entity_type: entityType,
      entity_ids: entityIds,
    });
  },
  syncToLIMS: async (
    entityType: string,
    entityIds?: string[]
  ): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.ehs.post<SyncRecord>('/api/ehs/sync/to-lims', {
      entity_type: entityType,
      entity_ids: entityIds,
    });
  },

  // Sync Record Details
  listSyncRecordDetails: async (
    syncId: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SyncRecordDetail>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<SyncRecordDetail>>(
      `/api/ehs/sync-records/${syncId}/details?${queryParams.toString()}`
    );
  },

  // Sync Configs
  listSyncConfigs: async (): Promise<ApiResponse<SyncConfig[]>> => {
    return apiClient.ehs.get<SyncConfig[]>('/api/ehs/sync/configs');
  },
  getSyncConfig: async (id: string): Promise<ApiResponse<SyncConfig>> => {
    return apiClient.ehs.get<SyncConfig>(`/api/ehs/sync/configs/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.ehs.get<string>('/health');
  },
};
