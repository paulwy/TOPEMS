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
