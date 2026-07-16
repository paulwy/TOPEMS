import type { ListQueryParams } from './common';

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
