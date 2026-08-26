import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type { PaginatedResponse } from './types';

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

const _emergencyPlanApi = {
  async listPlans(
    params?: PlanListQuery
  ): Promise<ApiResponse<PaginatedResponse<EmergencyPlanItem>>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    const s = qs.toString();
    return apiClient.ehs.get<PaginatedResponse<EmergencyPlanItem>>(
      `/emergency-plans${s ? `?${s}` : ''}`
    );
  },

  async getPlan(id: string): Promise<ApiResponse<PlanDetail>> {
    return apiClient.ehs.get<PlanDetail>(`/emergency-plans/${id}`);
  },

  async createPlan(data: CreatePlanRequest): Promise<ApiResponse<EmergencyPlanItem>> {
    return apiClient.ehs.post<EmergencyPlanItem>('/emergency-plans', data);
  },

  async updatePlan(id: string, data: UpdatePlanRequest): Promise<ApiResponse<EmergencyPlanItem>> {
    return apiClient.ehs.put<EmergencyPlanItem>(`/emergency-plans/${id}`, data);
  },

  async deletePlan(id: string): Promise<ApiResponse<null>> {
    return apiClient.ehs.delete<null>(`/emergency-plans/${id}`);
  },

  async listPlanCategories(): Promise<ApiResponse<PlanCategory[]>> {
    return apiClient.ehs.get<PlanCategory[]>('/emergency-plans/categories');
  },

  async listPlanSupplies(planId: string): Promise<ApiResponse<PlanSupply[]>> {
    return apiClient.ehs.get<PlanSupply[]>(`/emergency-plans/${planId}/supplies`);
  },

  async addPlanSupply(planId: string, data: CreateSupplyRequest): Promise<ApiResponse<PlanSupply>> {
    return apiClient.ehs.post<PlanSupply>(`/emergency-plans/${planId}/supplies`, data);
  },

  async deletePlanSupply(planId: string, supplyId: string): Promise<ApiResponse<null>> {
    return apiClient.ehs.delete<null>(`/emergency-plans/${planId}/supplies/${supplyId}`);
  },

  async listPlanVersions(planId: string): Promise<ApiResponse<PlanVersion[]>> {
    return apiClient.ehs.get<PlanVersion[]>(`/emergency-plans/${planId}/versions`);
  },

  async createPlanVersion(
    planId: string,
    data: CreateVersionRequest
  ): Promise<ApiResponse<PlanVersion>> {
    return apiClient.ehs.post<PlanVersion>(`/emergency-plans/${planId}/versions`, data);
  },

  async submitPlanApproval(
    planId: string,
    data?: SubmitApprovalRequest
  ): Promise<ApiResponse<EmergencyPlanItem>> {
    return apiClient.ehs.post<EmergencyPlanItem>(
      `/emergency-plans/${planId}/submit-approval`,
      data ?? {}
    );
  },

  async approvePlan(planId: string, data: ApprovePlanRequest): Promise<ApiResponse<PlanApproval>> {
    return apiClient.ehs.post<PlanApproval>(`/emergency-plans/${planId}/approve`, data);
  },
};
