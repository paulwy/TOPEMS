import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type SnapshotType = 'full' | 'incremental' | 'differential';
export type RecoveryPlanPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecoveryPlanStatus = 'draft' | 'active' | 'executing' | 'completed' | 'failed';
export type ContinuityPlanStatus = 'draft' | 'active' | 'testing' | 'archived';
export type ReplicationStatus = 'idle' | 'replicating' | 'paused' | 'error';
export type FailoverStatus = 'initiating' | 'in_progress' | 'completed' | 'failed';

export interface RecoveryPoint {
  id: string;
  snapshot_type: SnapshotType;
  created_at: string;
  size_bytes: number;
  note?: string;
  created_by: string;
}

export interface RecoveryPlan {
  id: string;
  name: string;
  priority: RecoveryPlanPriority;
  snapshot_type: SnapshotType;
  description?: string;
  steps: string[];
  status: RecoveryPlanStatus;
  last_executed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RecoveryPlanProgress {
  plan_id: string;
  current_step: number;
  total_steps: number;
  status: RecoveryPlanStatus;
  started_at: string;
  completed_at?: string;
  error?: string;
}

export interface ContinuityPlan {
  id: string;
  name: string;
  critical_function: string;
  rto_minutes: number;
  rpo_minutes: number;
  status: ContinuityPlanStatus;
  dependencies: string[];
  last_tested_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ContinuityImpact {
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_systems: string[];
  estimated_downtime_minutes: number;
  affected_users: number;
  revenue_impact?: number;
}

export interface ContinuityScore {
  score: number;
  total_plans: number;
  tested_plans: number;
  coverage_percentage: number;
  risk_level: 'low' | 'medium' | 'high';
}

export interface ReplicationConfig {
  id?: string;
  source_region: string;
  target_region: string;
  tables: string[];
  lag_seconds?: number;
  status?: ReplicationStatus;
}

export interface FailoverRecord {
  id: string;
  from_region: string;
  to_region: string;
  triggered_by: string;
  reason: string;
  status: FailoverStatus;
  started_at: string;
  completed_at?: string;
}

export interface RegionHealth {
  region: string;
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  last_check: string;
}

// ============ Request Types ============

export interface CreateRecoveryPointRequest {
  snapshot_type: SnapshotType;
  note?: string;
}

export interface CreateRecoveryPlanRequest {
  name: string;
  priority: RecoveryPlanPriority;
  snapshot_type: SnapshotType;
  description?: string;
  steps?: string[];
}

export interface CreateContinuityPlanRequest {
  name: string;
  critical_function: string;
  rto_minutes: number;
  rpo_minutes: number;
  dependencies?: string[];
}

export interface ConfigureReplicationRequest {
  source_region: string;
  target_region: string;
  tables: string[];
}

export interface InitiateFailoverRequest {
  from_region: string;
  to_region: string;
  reason: string;
}

// ============ API ============

export const disasterRecoveryApi = {
  // ===== 灾难恢复 =====
  async createRecoveryPoint(data: CreateRecoveryPointRequest): Promise<ApiResponse<RecoveryPoint>> {
    return apiClient.master.post<RecoveryPoint>('/mdm-v56/recovery/point', data);
  },

  async listRecoveryPoints(params?: { page?: number; pageSize?: number; type?: SnapshotType }): Promise<ApiResponse<{ items: RecoveryPoint[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    if (params?.type) qs.set('type', params.type);
    const s = qs.toString();
    return apiClient.master.get<{ items: RecoveryPoint[]; total: number }>(
      `/mdm-v56/recovery/points${s ? `?${s}` : ''}`
    );
  },

  async restoreFromPoint(data: { recovery_point_id: string }): Promise<ApiResponse<RecoveryPlanProgress>> {
    return apiClient.master.post<RecoveryPlanProgress>('/mdm-v56/recovery/restore', data);
  },

  async getRecoveryStatus(): Promise<ApiResponse<{ state: string; last_recovery_at?: string; pending_jobs: number }>> {
    return apiClient.master.get<{ state: string; last_recovery_at?: string; pending_jobs: number }>('/mdm-v56/recovery/status');
  },

  async createRecoveryPlan(data: CreateRecoveryPlanRequest): Promise<ApiResponse<RecoveryPlan>> {
    return apiClient.master.post<RecoveryPlan>('/mdm-v56/recovery/plan', data);
  },

  async executeRecoveryPlan(): Promise<ApiResponse<RecoveryPlanProgress>> {
    return apiClient.master.post<RecoveryPlanProgress>('/mdm-v56/recovery/plan/execute', {});
  },

  async getPlanProgress(id: string): Promise<ApiResponse<RecoveryPlanProgress>> {
    return apiClient.master.get<RecoveryPlanProgress>(`/mdm-v56/recovery/plan/${id}/progress`);
  },

  async testRecovery(data?: { plan_id?: string }): Promise<ApiResponse<RecoveryPlanProgress>> {
    return apiClient.master.post<RecoveryPlanProgress>('/mdm-v56/recovery/test', data || {});
  },

  // ===== 业务连续性 =====
  async createContinuityPlan(data: CreateContinuityPlanRequest): Promise<ApiResponse<ContinuityPlan>> {
    return apiClient.master.post<ContinuityPlan>('/mdm-v56/continuity/plan', data);
  },

  async listContinuityPlans(params?: { page?: number; pageSize?: number; status?: ContinuityPlanStatus }): Promise<ApiResponse<{ items: ContinuityPlan[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    if (params?.status) qs.set('status', params.status);
    const s = qs.toString();
    return apiClient.master.get<{ items: ContinuityPlan[]; total: number }>(
      `/mdm-v56/continuity/plans${s ? `?${s}` : ''}`
    );
  },

  async getContinuityPlan(id: string): Promise<ApiResponse<ContinuityPlan>> {
    return apiClient.master.get<ContinuityPlan>(`/mdm-v56/continuity/plan/${id}`);
  },

  async updateContinuityPlan(id: string, data: Partial<CreateContinuityPlanRequest>): Promise<ApiResponse<ContinuityPlan>> {
    return apiClient.master.put<ContinuityPlan>(`/mdm-v56/continuity/plan/${id}`, data);
  },

  async testContinuityPlan(id: string): Promise<ApiResponse<{ success: boolean; result: string }>> {
    return apiClient.master.post<{ success: boolean; result: string }>(`/mdm-v56/continuity/plan/${id}/test`, {});
  },

  async assessContinuityImpact(): Promise<ApiResponse<ContinuityImpact>> {
    return apiClient.master.get<ContinuityImpact>('/mdm-v56/continuity/impact');
  },

  async getContinuityScore(): Promise<ApiResponse<ContinuityScore>> {
    return apiClient.master.get<ContinuityScore>('/mdm-v56/continuity/score');
  },

  // ===== 跨地域容灾 =====
  async configureReplication(data: ConfigureReplicationRequest): Promise<ApiResponse<ReplicationConfig>> {
    return apiClient.master.post<ReplicationConfig>('/mdm-v56/dr/replication', data);
  },

  async startReplication(): Promise<ApiResponse<{ started: boolean }>> {
    return apiClient.master.post<{ started: boolean }>('/mdm-v56/dr/replication/start', {});
  },

  async stopReplication(): Promise<ApiResponse<{ stopped: boolean }>> {
    return apiClient.master.post<{ stopped: boolean }>('/mdm-v56/dr/replication/stop', {});
  },

  async getReplicationStatus(): Promise<ApiResponse<{ config: ReplicationConfig[]; lag_seconds: number }>> {
    return apiClient.master.get<{ config: ReplicationConfig[]; lag_seconds: number }>('/mdm-v56/dr/replication/status');
  },

  async initiateFailover(data: InitiateFailoverRequest): Promise<ApiResponse<FailoverRecord>> {
    return apiClient.master.post<FailoverRecord>('/mdm-v56/dr/failover', data);
  },

  async completeFailover(id: string): Promise<ApiResponse<FailoverRecord>> {
    return apiClient.master.post<FailoverRecord>(`/mdm-v56/dr/failover/${id}/complete`, {});
  },

  async getFailoverHistory(params?: { page?: number; pageSize?: number }): Promise<ApiResponse<{ items: FailoverRecord[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: FailoverRecord[]; total: number }>(
      `/mdm-v56/dr/failover/history${s ? `?${s}` : ''}`
    );
  },

  async switchRegions(data: { target_region: string }): Promise<ApiResponse<{ switched: boolean }>> {
    return apiClient.master.post<{ switched: boolean }>('/mdm-v56/dr/switch', data);
  },

  async getRegionHealth(): Promise<ApiResponse<RegionHealth[]>> {
    return apiClient.master.get<RegionHealth[]>('/mdm-v56/dr/region-health');
  },
};

export default disasterRecoveryApi;
