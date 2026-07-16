import type { ListQueryParams } from './common';

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
