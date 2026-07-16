import type { ListQueryParams } from './common';

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
