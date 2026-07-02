import type { ApiResponse } from '../client';

export interface SafetyHazard {
  id: string;
  hazard_no: string;
  name: string;
  category: string;
  level: string;
  description: string | null;
  location: string | null;
  risk_assessment: string | null;
  control_measures: string[];
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
  risklevel: string | null;
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
  issues: string[];
  attachments: string[] | null;
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
  responsible_persons: string[];
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
  participants: string[];
  duration_hours: number;
  location: string | null;
  summary: string | null;
  issues_found: string | null;
  improvements: string | null;
  attachments: string[] | null;
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
  pagesize?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pagesize: number;
  total_pages: number;
}

// ============ Risk Management Types ============
export interface Risk {
  id: string;
  risk_no: string;
  name: string;
  category: string;
  risklevel: 'high' | 'medium' | 'low' | 'extreme';
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
  risklevel: 'high' | 'medium' | 'low' | 'extreme';
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
  risklevel: 'high' | 'medium' | 'low' | 'extreme';
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
  risklevel?: string;
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
  checkitems: string[] | null;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthCheckResultItem {
  item_name: string;
  result: string;
  unit?: string;
  reference_range?: string;
  status: 'normal' | 'abnormal' | 'warning';
  remarks?: string;
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
  checkitems: string[] | null;
  results: HealthCheckResultItem[];
  conclusion: string | null;
  abnormalitems: string[] | null;
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
  checkitems?: string[] | null;
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
  checkitems?: string[] | null;
  status?: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
}

export interface CreateHealthCheckRecordRequest {
  plan_id?: string | null;
  employee_id: string;
  employee_name: string;
  check_type: string;
  check_date?: string | null;
  hospital?: string | null;
  checkitems?: string[] | null;
  results?: HealthCheckResultItem[];
  conclusion?: string | null;
  abnormalitems?: string[] | null;
  suggestions?: string | null;
  follow_up_required?: boolean;
  status?: 'pending' | 'completed' | 'abnormal' | 'follow_up';
  attachments?: string[] | null;
}

export interface UpdateHealthCheckRecordRequest {
  check_type?: string;
  check_date?: string | null;
  hospital?: string | null;
  checkitems?: string[] | null;
  results?: HealthCheckResultItem[];
  conclusion?: string | null;
  abnormalitems?: string[] | null;
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
  hazardlevel: 'high' | 'medium' | 'low';
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
  hazardlevel?: 'high' | 'medium' | 'low';
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
  hazardlevel?: 'high' | 'medium' | 'low';
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
  hazardlevel?: string;
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
  hazardlevel: string | null;
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
  hazardlevel?: string | null;
  sort_order?: number;
}

export interface UpdateHazardousMaterialCategoryRequest {
  category_code?: string;
  name?: string;
  parent_id?: string | null;
  description?: string | null;
  hazardlevel?: string | null;
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
  non_complianceitems: string[] | null;
  corrective_actions: string | null;
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DischargeLimit {
  pollutant_name: string;
  limit_value: number;
  unit: string;
  standard?: string;
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
  discharge_limits: DischargeLimit[];
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
  event_category:
    'spill' | 'leak' | 'emission_exceedance' | 'waste_violation' | 'complaint' | 'other';
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
  non_complianceitems?: string[] | null;
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
  non_complianceitems?: string[] | null;
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
  discharge_limits?: DischargeLimit[];
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
  discharge_limits?: DischargeLimit[];
  monitoring_requirements?: string | null;
  attachments?: string[] | null;
  status?: 'valid' | 'expired' | 'revoked' | 'pending_renewal';
}

export interface CreateEnvironmentalEventRequest {
  title: string;
  event_type: string;
  event_category:
    'spill' | 'leak' | 'emission_exceedance' | 'waste_violation' | 'complaint' | 'other';
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
  event_category?:
    'spill' | 'leak' | 'emission_exceedance' | 'waste_violation' | 'complaint' | 'other';
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
export interface SyncErrorDetail {
  code?: string;
  message?: string;
  stack?: string;
  [key: string]: unknown;
}

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
  error_details: SyncErrorDetail;
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
  source_data: Record<string, unknown>;
  target_data: Record<string, unknown>;
  retried_count: number;
  last_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncFilter {
  [key: string]: unknown;
}

export interface SyncFieldMapping {
  source_field: string;
  target_field: string;
  transform?: string;
  default_value?: unknown;
}

export interface SyncConfig {
  id: string;
  config_name: string;
  sync_type: string;
  source_system: string;
  target_system: string;
  entity_type: string;
  direction: 'bidirectional' | 'source_totarget' | 'target_to_source';
  schedule: string | null;
  enabled: boolean;
  last_sync_at: string | null;
  next_sync_at: string | null;
  filters: SyncFilter;
  field_mapping: SyncFieldMapping[];
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
  filters?: SyncFilter;
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
