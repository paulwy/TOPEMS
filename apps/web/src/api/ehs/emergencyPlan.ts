interface EmergencyPlanItem {
  id: string;
  plan_no: string;
  title: string;
  description?: string;
  category: string;
  version: string;
  status: string;
  scope?: string;
  emergency_level?: string;
  responsible_dept?: string;
  responsible_person?: string;
  contact_phone?: string;
  content?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  effective_date?: string;
  expiry_date?: string;
  created_at?: string;
  updated_at?: string;
}

interface PlanSupply {
  id: string;
  plan_id: string;
  name: string;
  specification?: string;
  quantity: number;
  unit?: string;
  storage_location?: string;
  responsible_person?: string;
  remarks?: string;
  created_at?: string;
}

interface PlanVersion {
  id: string;
  plan_id: string;
  version: string;
  change_description?: string;
  changed_by?: string;
  changed_at?: string;
  content?: string;
}

interface PlanApproval {
  id: string;
  plan_id: string;
  approver?: string;
  approver_role?: string;
  status: string;
  opinion?: string;
  approved_at?: string;
  order_num: number;
}

interface PlanDetail {
  plan: EmergencyPlanItem;
  supplies: PlanSupply[];
  versions: PlanVersion[];
  approvals: PlanApproval[];
}

interface PlanCategory {
  code: string;
  name: string;
  icon: string;
}

interface PlanListQuery {
  page?: number;
  page_size?: number;
  status?: string;
  category?: string;
}

interface CreatePlanRequest {
  title: string;
  description?: string;
  category: string;
  scope?: string;
  emergency_level?: string;
  responsible_dept?: string;
  responsible_person?: string;
  contact_phone?: string;
  content?: string;
  effective_date?: string;
  expiry_date?: string;
}

interface UpdatePlanRequest {
  title?: string;
  description?: string;
  category?: string;
  scope?: string;
  emergency_level?: string;
  responsible_dept?: string;
  responsible_person?: string;
  contact_phone?: string;
  content?: string;
  status?: string;
  effective_date?: string;
  expiry_date?: string;
}

interface CreateSupplyRequest {
  name: string;
  specification?: string;
  quantity: number;
  unit?: string;
  storage_location?: string;
  responsible_person?: string;
  remarks?: string;
}

interface SubmitApprovalRequest {
  approvers?: string[];
  remarks?: string;
}

interface ApprovePlanRequest {
  opinion?: string;
  result: string;
}

export interface CreateVersionRequest {
  change_description?: string;
  content?: string;
}
