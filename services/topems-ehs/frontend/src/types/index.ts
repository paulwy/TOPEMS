export interface ApiResponse<T = any> {
  code: number;
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
}

export interface SafetyHazard {
  id: string;
  hazard_no: string;
  name: string;
  category: string;
  level: string;
  description?: string;
  location?: string;
  risk_assessment?: string;
  control_measures: string[];
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SafetyCheck {
  id: string;
  check_no: string;
  check_type: string;
  inspector: string;
  check_date?: string;
  location?: string;
  result: string;
  issues: string[];
  attachments?: string[];
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyPlan {
  id: string;
  plan_no: string;
  name: string;
  plan_type: string;
  scope?: string;
  trigger_conditions?: string;
  response_procedures?: string;
  responsible_persons: string[];
  contact_info?: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DrillRecord {
  id: string;
  drill_no: string;
  plan_id?: string;
  drill_name: string;
  drill_date?: string;
  participants: string[];
  duration_hours: number;
  location?: string;
  summary?: string;
  issues_found?: string;
  improvements?: string;
  attachments?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MonitoringPoint {
  id: string;
  point_no: string;
  name: string;
  point_type: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  parameters: string[];
  thresholds?: any;
  status: string;
  last_data_time?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentalData {
  id: string;
  point_id: string;
  data_time: string;
  parameter: string;
  value: number;
  unit: string;
  quality?: string;
  remarks?: string;
  created_at: string;
}

export interface EnvironmentalAlert {
  id: string;
  point_id: string;
  alert_type: string;
  alert_level: string;
  parameter: string;
  threshold_value: number;
  actual_value: number;
  alert_time: string;
  status: string;
  handled_by?: string;
  handled_time?: string;
  handle_result?: string;
  created_at: string;
}

export interface HealthRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  gender?: string;
  birth_date?: string;
  blood_type?: string;
  allergies?: string[];
  chronic_diseases?: string[];
  medical_history?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface HealthCheckup {
  id: string;
  employee_id: string;
  employee_name: string;
  checkup_date: string;
  checkup_type: string;
  institution?: string;
  result_summary?: string;
  abnormal_items?: string[];
  recommendations?: string;
  attachments?: string[];
  next_checkup_date?: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface VaccinationRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  vaccine_name: string;
  vaccine_type: string;
  vaccination_date: string;
  dose_number: number;
  institution?: string;
  batch_number?: string;
  expiry_date?: string;
  next_dose_date?: string;
  remarks?: string;
  attachments?: string[];
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SafetyIncident {
  id: string;
  incident_no: string;
  title: string;
  incident_type: string;
  incident_level: string;
  location?: string;
  incident_time: string;
  description?: string;
  casualties?: number;
  injuries?: number;
  economic_loss?: number;
  cause_analysis?: string;
  corrective_actions?: string[];
  responsible_persons?: string[];
  status: string;
  handled_by?: string;
  handled_time?: string;
  attachments?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskAssessment {
  id: string;
  assessment_no: string;
  title: string;
  assessment_type: string;
  risk_source: string;
  risk_category: string;
  likelihood: number;
  consequence: number;
  risk_level: string;
  risk_score: number;
  description?: string;
  affected_area?: string;
  affected_persons?: number;
  existing_controls?: string[];
  status: string;
  assessor?: string;
  assessment_date?: string;
  review_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskControl {
  id: string;
  assessment_id: string;
  control_type: string;
  control_measure: string;
  implementation_plan?: string;
  responsible_person?: string;
  target_date?: string;
  completion_date?: string;
  effectiveness?: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingProgram {
  id: string;
  program_no: string;
  title: string;
  training_type: string;
  content?: string;
  objectives?: string;
  target_audience?: string;
  duration_hours?: number;
  training_method?: string;
  instructor?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  max_participants?: number;
  materials?: string[];
  status: string;
  completion_rate?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingRecord {
  id: string;
  program_id: string;
  employee_id: string;
  employee_name: string;
  enrollment_date: string;
  completion_date?: string;
  score?: number;
  certificate_no?: string;
  certificate_expiry?: string;
  status: string;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
