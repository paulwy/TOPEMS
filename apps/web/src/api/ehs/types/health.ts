import type { ListQueryParams } from './common';

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
