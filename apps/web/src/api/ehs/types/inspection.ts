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
