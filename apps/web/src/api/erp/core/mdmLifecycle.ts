import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

// ============ Types ============

export type LifecycleStage =
  | 'proposed'
  | 'designed'
  | 'in_development'
  | 'testing'
  | 'released'
  | 'operative'
  | 'sunset'
  | 'archived'
  | 'destroyed';

interface LifecycleEntity {
  master_data_id: string;
  domain: string;
  entity_type: string;
  stage: LifecycleStage;
  name: string;
  version: string;
  owner?: string;
  created_at: string;
  updated_at: string;
}

interface LifecycleTask {
  task_id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  due_date?: string;
  assignee?: string;
}

export interface LifecycleEvent {
  event_id: string;
  master_data_id: string;
  from_stage?: LifecycleStage;
  to_stage: LifecycleStage;
  actor: string;
  reason?: string;
  created_at: string;
}

interface RetirementPlan {
  plan_id: string;
  master_data_id: string;
  master_data_name: string;
  stage: string;
  target_date?: string;
  status:
    | 'draft'
    | 'assessing'
    | 'notified'
    | 'confirmed'
    | 'executing'
    | 'executed'
    | 'rolled_back'
    | 'cancelled';
  impact_score?: number;
  created_at: string;
  updated_at: string;
}

interface ArchivePolicy {
  policy_id: string;
  name: string;
  scope: string;
  age_threshold_days: number;
  storage_tier: 'hot' | 'warm' | 'cold' | 'archive';
  retention_days: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface ArchiveRecord {
  record_id: string;
  master_data_id: string;
  master_data_name: string;
  policy_id: string;
  archived_at: string;
  storage_tier: 'hot' | 'warm' | 'cold' | 'archive';
  size_bytes?: number;
  status: 'archived' | 'restored' | 'destroyed';
}

interface LifecycleStats {
  by_stage: Array<{ stage: LifecycleStage; count: number }>;
  total: number;
  avg_stage_duration_days?: number;
}

export interface ArchiveStats {
  total_records: number;
  by_tier: Array<{ tier: string; count: number; size_bytes: number }>;
  restorations_last_30d?: number;
}

interface RetirementStats {
  total_plans: number;
  executed_count: number;
  pending_count: number;
  avg_impact_score?: number;
}

interface LifecycleDashboard {
  lifecycle: LifecycleStats;
  archive: ArchiveStats;
  retirement: RetirementStats;
  sla_compliance: number;
}

interface UpdateLifecycleTaskRequest {
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignee?: string;
  note?: string;
}

interface TransitionLifecycleRequest {
  target_stage: LifecycleStage;
  reason?: string;
  approver?: string;
}

interface CreateRetirementPlanRequest {
  master_data_id: string;
  master_data_name: string;
  target_date?: string;
  reason?: string;
}

interface AssessImpactRequest {
  include_related?: boolean;
  depth?: number;
}

interface NotifyRequest {
  channels?: string[];
  recipients?: string[];
  message?: string;
}

interface ConfirmRetirementRequest {
  confirmed_by?: string;
  notes?: string;
}

interface ExecuteRetirementRequest {
  execute_type?: 'soft' | 'hard';
  scheduled_at?: string;
}

interface RollbackRetirementRequest {
  reason?: string;
  rolled_back_by?: string;
}

interface CreateArchivePolicyRequest {
  name: string;
  scope: string;
  age_threshold_days: number;
  storage_tier: 'hot' | 'warm' | 'cold' | 'archive';
  retention_days: number;
}

interface UpdateArchivePolicyRequest {
  name?: string;
  age_threshold_days?: number;
  storage_tier?: 'hot' | 'warm' | 'cold' | 'archive';
  retention_days?: number;
  status?: 'active' | 'inactive';
}

interface RunArchiveRequest {
  policy_id?: string;
  dry_run?: boolean;
  scope?: string;
}

// ============ Helpers ============

interface MdmLifecycleQueryParams extends PaginationParams {
  domain?: string;
  stage?: LifecycleStage;
  status?: string;
  policy_id?: string;
}

const buildSearchParams = (params?: MdmLifecycleQueryParams): URLSearchParams => {
  const sp = new URLSearchParams();
  if (params?.page !== undefined) sp.set('page', String(params.page));
  const ps =
    (params as unknown as { pageSize?: number } | undefined)?.pageSize ??
    (params as unknown as { page_size?: number } | undefined)?.page_size;
  if (ps !== undefined) sp.set('page_size', String(ps));
  if (params?.search) sp.set('search', params.search);
  if (params?.domain) sp.set('domain', params.domain);
  if (params?.stage) sp.set('stage', params.stage);
  if (params?.status) sp.set('status', params.status);
  if (params?.policy_id) sp.set('policy_id', params.policy_id);
  return sp;
};

// ============ API ============

export const mdmLifecycleApi = {
  // ===== Lifecycle Entities =====
  async listEntities(
    params?: MdmLifecycleQueryParams
  ): Promise<ApiResponse<{ items: LifecycleEntity[]; total: number }>> {
    const sp = buildSearchParams(params);
    const qs = sp.toString();
    return apiClient.erp.get<{ items: LifecycleEntity[]; total: number }>(
      `/mdm-v49/lifecycle/entities${qs ? `?${qs}` : ''}`
    );
  },

  async createEntity(data: Partial<LifecycleEntity>): Promise<ApiResponse<LifecycleEntity>> {
    return apiClient.erp.post<LifecycleEntity>('/mdm-v49/lifecycle/entities', data);
  },

  async getEntity(masterDataId: string): Promise<ApiResponse<LifecycleEntity>> {
    return apiClient.erp.get<LifecycleEntity>(`/mdm-v49/lifecycle/entities/${masterDataId}`);
  },

  async transitionStage(
    masterDataId: string,
    data: TransitionLifecycleRequest
  ): Promise<ApiResponse<LifecycleEntity>> {
    return apiClient.erp.post<LifecycleEntity>(`/mdm-v49/lifecycle/entities/${masterDataId}`, data);
  },

  async updateTask(
    masterDataId: string,
    taskId: string,
    data: UpdateLifecycleTaskRequest
  ): Promise<ApiResponse<LifecycleTask>> {
    return apiClient.erp.post<LifecycleTask>(
      `/mdm-v49/lifecycle/entities/${masterDataId}/tasks/${taskId}`,
      data
    );
  },

  async getEvents(masterDataId: string): Promise<ApiResponse<LifecycleEvent[]>> {
    return apiClient.erp.get<LifecycleEvent[]>(
      `/mdm-v49/lifecycle/entities/${masterDataId}/events`
    );
  },

  // ===== Retirement Plans =====
  async listRetirementPlans(
    params?: MdmLifecycleQueryParams
  ): Promise<ApiResponse<{ items: RetirementPlan[]; total: number }>> {
    const sp = buildSearchParams(params);
    const qs = sp.toString();
    return apiClient.erp.get<{ items: RetirementPlan[]; total: number }>(
      `/mdm-v49/retirement/plans${qs ? `?${qs}` : ''}`
    );
  },

  async createRetirementPlan(
    data: CreateRetirementPlanRequest
  ): Promise<ApiResponse<RetirementPlan>> {
    return apiClient.erp.post<RetirementPlan>('/mdm-v49/retirement/plans', data);
  },

  async getRetirementPlan(planId: string): Promise<ApiResponse<RetirementPlan>> {
    return apiClient.erp.get<RetirementPlan>(`/mdm-v49/retirement/plans/${planId}`);
  },

  async assessImpact(
    planId: string,
    data?: AssessImpactRequest
  ): Promise<ApiResponse<{ impact_score: number; details: string[] }>> {
    return apiClient.erp.post<{ impact_score: number; details: string[] }>(
      `/mdm-v49/retirement/plans/${planId}/assess`,
      data || {}
    );
  },

  async notifyStakeholders(
    planId: string,
    data?: NotifyRequest
  ): Promise<ApiResponse<{ notified: number }>> {
    return apiClient.erp.post<{ notified: number }>(
      `/mdm-v49/retirement/plans/${planId}/notify`,
      data || {}
    );
  },

  async confirmRetirementPlan(
    planId: string,
    data?: ConfirmRetirementRequest
  ): Promise<ApiResponse<RetirementPlan>> {
    return apiClient.erp.post<RetirementPlan>(
      `/mdm-v49/retirement/plans/${planId}/confirm`,
      data || {}
    );
  },

  async executeRetirementPlan(
    planId: string,
    data?: ExecuteRetirementRequest
  ): Promise<ApiResponse<RetirementPlan>> {
    return apiClient.erp.post<RetirementPlan>(
      `/mdm-v49/retirement/plans/${planId}/execute`,
      data || {}
    );
  },

  async rollbackRetirementPlan(
    planId: string,
    data?: RollbackRetirementRequest
  ): Promise<ApiResponse<RetirementPlan>> {
    return apiClient.erp.post<RetirementPlan>(
      `/mdm-v49/retirement/plans/${planId}/rollback`,
      data || {}
    );
  },

  async cancelRetirementPlan(planId: string): Promise<ApiResponse<RetirementPlan>> {
    return apiClient.erp.post<RetirementPlan>(`/mdm-v49/retirement/plans/${planId}/cancel`, {});
  },

  // ===== Archive Policies =====
  async listArchivePolicies(
    params?: MdmLifecycleQueryParams
  ): Promise<ApiResponse<{ items: ArchivePolicy[]; total: number }>> {
    const sp = buildSearchParams(params);
    const qs = sp.toString();
    return apiClient.erp.get<{ items: ArchivePolicy[]; total: number }>(
      `/mdm-v49/archive/policies${qs ? `?${qs}` : ''}`
    );
  },

  async createArchivePolicy(data: CreateArchivePolicyRequest): Promise<ApiResponse<ArchivePolicy>> {
    return apiClient.erp.post<ArchivePolicy>('/mdm-v49/archive/policies', data);
  },

  async getArchivePolicy(policyId: string): Promise<ApiResponse<ArchivePolicy>> {
    return apiClient.erp.get<ArchivePolicy>(`/mdm-v49/archive/policies/${policyId}`);
  },

  async updateArchivePolicy(
    policyId: string,
    data: UpdateArchivePolicyRequest
  ): Promise<ApiResponse<ArchivePolicy>> {
    return apiClient.erp.put<ArchivePolicy>(`/mdm-v49/archive/policies/${policyId}`, data);
  },

  async deleteArchivePolicy(policyId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.erp.delete<{ success: boolean }>(`/mdm-v49/archive/policies/${policyId}`);
  },

  // ===== Archive Records =====
  async listArchiveRecords(
    params?: MdmLifecycleQueryParams
  ): Promise<ApiResponse<{ items: ArchiveRecord[]; total: number }>> {
    const sp = buildSearchParams(params);
    const qs = sp.toString();
    return apiClient.erp.get<{ items: ArchiveRecord[]; total: number }>(
      `/mdm-v49/archive/records${qs ? `?${qs}` : ''}`
    );
  },

  async getArchiveRecord(recordId: string): Promise<ApiResponse<ArchiveRecord>> {
    return apiClient.erp.get<ArchiveRecord>(`/mdm-v49/archive/records/${recordId}`);
  },

  async restoreArchiveRecord(
    recordId: string,
    data?: { restore_reason?: string }
  ): Promise<ApiResponse<ArchiveRecord>> {
    return apiClient.erp.post<ArchiveRecord>(
      `/mdm-v49/archive/records/${recordId}/restore`,
      data || {}
    );
  },

  async runArchive(data?: RunArchiveRequest): Promise<ApiResponse<{ archived_count: number }>> {
    return apiClient.erp.post<{ archived_count: number }>('/mdm-v49/archive/run', data || {});
  },

  // ===== Stats & Governance =====
  async getLifecycleStats(): Promise<ApiResponse<LifecycleStats>> {
    return apiClient.erp.get<LifecycleStats>('/mdm-v49/stats/lifecycle');
  },

  async getArchiveStats(): Promise<ApiResponse<ArchiveStats>> {
    return apiClient.erp.get<ArchiveStats>('/mdm-v49/stats/archive');
  },

  async getRetirementStats(): Promise<ApiResponse<RetirementStats>> {
    return apiClient.erp.get<RetirementStats>('/mdm-v49/stats/retirement');
  },

  async runSlaCheck(): Promise<ApiResponse<{ total: number; passed: number; failed: number }>> {
    return apiClient.erp.post<{ total: number; passed: number; failed: number }>(
      '/mdm-v49/sla/check',
      {}
    );
  },

  async getDashboard(): Promise<ApiResponse<LifecycleDashboard>> {
    return apiClient.erp.get<LifecycleDashboard>('/mdm-v49/dashboard');
  },
};
