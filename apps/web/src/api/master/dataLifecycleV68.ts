import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type LifecycleState =
  'active' | 'inactive' | 'archived' | 'destroyed' | 'retained' | 'compliance_hold';
export type LifecycleEvent =
  | 'create'
  | 'activate'
  | 'inactivate'
  | 'archive'
  | 'restore'
  | 'destroy'
  | 'retain'
  | 'compliance_hold'
  | 'release';
export type ArchiveFormat = 'parquet' | 'avro' | 'json' | 'csv' | 'orc';
export type StorageTier = 'hot' | 'warm' | 'cold' | 'archive' | 'glacier';
export type RetentionType = 'permanent' | 'fixed_term' | 'event_based' | 'compliance';
export type DestructionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type VersionAction = 'create' | 'publish' | 'deprecate' | 'archive' | 'restore' | 'destroy';

export interface LifecyclePolicy {
  id: string;
  name: string;
  description?: string;
  entity_type: string;
  entity_id?: string;
  policy_type: 'retention' | 'archive' | 'destruction' | 'transition';
  status: 'active' | 'inactive' | 'draft';
  priority: number;
  conditions?: {
    age_days?: number;
    event?: string;
    custom_expression?: string;
  };
  target_state: LifecycleState;
  actions?: LifecycleEvent[];
  schedule?: {
    type: 'immediate' | 'scheduled' | 'event_driven';
    cron?: string;
    event?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  description?: string;
  entity_type: string;
  entity_id?: string;
  retention_type: RetentionType;
  duration_days?: number;
  start_condition?: 'creation' | 'last_modification' | 'last_access' | 'event';
  event_trigger?: string;
  action_on_expiry: 'archive' | 'destroy' | 'retain' | 'compliance_hold';
  legal_hold?: boolean;
  legal_hold_reason?: string;
  apply_to_subtypes?: string[];
  exclude_entities?: string[];
  created_at: string;
  updated_at: string;
}

export interface ArchiveStrategy {
  id: string;
  name: string;
  description?: string;
  entity_type: string;
  entity_id?: string;
  age_days: number;
  archive_format: ArchiveFormat;
  storage_tier: StorageTier;
  target_path?: string;
  compression?: 'none' | 'gzip' | 'snappy' | 'zstd';
  partition_by?: string[];
  include_metadata?: boolean;
  compress_before_archive?: boolean;
  validate_after_archive?: boolean;
  retention_after_archive_days?: number;
  created_at: string;
  updated_at: string;
}

export interface DestructionPolicy {
  id: string;
  name: string;
  description?: string;
  entity_type: string;
  entity_id?: string;
  destruction_method: 'physical' | 'logical' | 'crypto_shred';
  age_days?: number;
  require_approval?: boolean;
  approval_roles?: string[];
  notify_on_complete?: boolean;
  notify_channels?: string[];
  legal_requirements?: string[];
  audit_trail?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LifecycleTransition {
  id: string;
  entity_type: string;
  entity_id: string;
  from_state: LifecycleState;
  to_state: LifecycleState;
  event: LifecycleEvent;
  reason?: string;
  actor_id: string;
  actor_name?: string;
  actor_type: 'user' | 'system' | 'service' | 'policy';
  related_policy_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface LifecycleHistory {
  id: string;
  entity_type: string;
  entity_id: string;
  current_state: LifecycleState;
  state_history: Array<{
    state: LifecycleState;
    event: LifecycleEvent;
    changed_at: string;
    actor_id?: string;
    actor_name?: string;
    reason?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface ArchiveJob {
  id: string;
  strategy_id: string;
  strategy_name?: string;
  entity_type: string;
  entity_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  target_path?: string;
  archive_format: ArchiveFormat;
  size_bytes?: number;
  record_count?: number;
  error_message?: string;
  created_by?: string;
  created_at: string;
}

export interface DestructionJob {
  id: string;
  policy_id: string;
  policy_name?: string;
  entity_type: string;
  entity_ids: string[];
  status: DestructionStatus;
  destruction_method: 'physical' | 'logical' | 'crypto_shred';
  approved_by?: string;
  approved_at?: string;
  completed_at?: string;
  destroyed_count?: number;
  error_message?: string;
  verification_hash?: string;
  created_by: string;
  created_at: string;
}

export interface LifecycleVersion {
  id: string;
  entity_type: string;
  entity_id: string;
  version_number: string;
  action: VersionAction;
  state: 'published' | 'draft' | 'archived' | 'deprecated';
  change_summary?: string;
  change_details?: Record<string, unknown>;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  expires_at?: string;
  storage_tier?: StorageTier;
  size_bytes?: number;
}

export interface LifecycleDashboard {
  total_entities: number;
  by_state: Array<{ state: LifecycleState; count: number; percentage: number }>;
  by_entity_type: Array<{ entity_type: string; count: number }>;
  pending_retention_expiry: Array<{ entity_type: string; count: number; days_until: number }>;
  recent_archives: Array<{ entity_type: string; count: number; archived_at: string }>;
  recent_destructions: Array<{ entity_type: string; count: number; destroyed_at: string }>;
  active_policies: number;
  archived_data_size_bytes: number;
  destroyed_data_size_bytes: number;
  legal_hold_count: number;
  compliance_score: number;
  upcoming_expiry_events: Array<{
    entity_type: string;
    entity_id: string;
    event: string;
    scheduled_at: string;
  }>;
}

export interface ComplianceReport {
  id: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  summary: {
    total_policies: number;
    active_policies: number;
    violations: number;
    warnings: number;
    compliant_items: number;
    non_compliant_items: number;
  };
  violations: Array<{
    policy_id: string;
    policy_name: string;
    entity_type: string;
    entity_id?: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    detected_at: string;
    remediation?: string;
  }>;
  recommendations: string[];
}

// ============ Request Types ============

export interface CreateLifecyclePolicyRequest {
  name: string;
  description?: string;
  entity_type: string;
  entity_id?: string;
  policy_type: 'retention' | 'archive' | 'destruction' | 'transition';
  priority?: number;
  conditions?: {
    age_days?: number;
    event?: string;
    custom_expression?: string;
  };
  target_state: LifecycleState;
  actions?: LifecycleEvent[];
  schedule?: {
    type: 'immediate' | 'scheduled' | 'event_driven';
    cron?: string;
    event?: string;
  };
}

export interface CreateRetentionPolicyRequest {
  name: string;
  description?: string;
  entity_type: string;
  entity_id?: string;
  retention_type: RetentionType;
  duration_days?: number;
  start_condition?: 'creation' | 'last_modification' | 'last_access' | 'event';
  event_trigger?: string;
  action_on_expiry: 'archive' | 'destroy' | 'retain' | 'compliance_hold';
  legal_hold?: boolean;
  legal_hold_reason?: string;
  apply_to_subtypes?: string[];
  exclude_entities?: string[];
}

export interface CreateArchiveStrategyRequest {
  name: string;
  description?: string;
  entity_type: string;
  entity_id?: string;
  age_days: number;
  archive_format: ArchiveFormat;
  storage_tier: StorageTier;
  target_path?: string;
  compression?: 'none' | 'gzip' | 'snappy' | 'zstd';
  partition_by?: string[];
  include_metadata?: boolean;
  compress_before_archive?: boolean;
  validate_after_archive?: boolean;
  retention_after_archive_days?: number;
}

export interface CreateDestructionPolicyRequest {
  name: string;
  description?: string;
  entity_type: string;
  entity_id?: string;
  destruction_method: 'physical' | 'logical' | 'crypto_shred';
  age_days?: number;
  require_approval?: boolean;
  approval_roles?: string[];
  notify_on_complete?: boolean;
  notify_channels?: string[];
  legal_requirements?: string[];
  audit_trail?: boolean;
}

export interface ExecuteTransitionRequest {
  entity_type: string;
  entity_id: string;
  target_state: LifecycleState;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecuteArchiveRequest {
  strategy_id: string;
  entity_ids?: string[];
  entity_type?: string;
  dry_run?: boolean;
}

export interface ExecuteDestructionRequest {
  policy_id: string;
  entity_ids: string[];
  reason?: string;
  approval_token?: string;
  verify_only?: boolean;
}

export interface VersionEntityRequest {
  entity_type: string;
  entity_id: string;
  action: VersionAction;
  version_number?: string;
  change_summary?: string;
  expires_at?: string;
}

// ============ API ============

export const dataLifecycleApiV68 = {
  // ===== 生命周期策略管理 =====
  async createPolicy(data: CreateLifecyclePolicyRequest): Promise<ApiResponse<LifecyclePolicy>> {
    return apiClient.master.post<LifecyclePolicy>('/mdm-v68/policies', data);
  },

  async getPolicy(id: string): Promise<ApiResponse<LifecyclePolicy>> {
    return apiClient.master.get<LifecyclePolicy>(`/mdm-v68/policies/${id}`);
  },

  async listPolicies(params?: {
    entity_type?: string;
    policy_type?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: LifecyclePolicy[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.policy_type) qs.set('policy_type', params.policy_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: LifecyclePolicy[]; total: number }>(
      `/mdm-v68/policies${s ? `?${s}` : ''}`
    );
  },

  async updatePolicy(
    id: string,
    data: Partial<CreateLifecyclePolicyRequest>
  ): Promise<ApiResponse<LifecyclePolicy>> {
    return apiClient.master.put<LifecyclePolicy>(`/mdm-v68/policies/${id}`, data);
  },

  async deletePolicy(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v68/policies/${id}`);
  },

  async activatePolicy(id: string): Promise<ApiResponse<LifecyclePolicy>> {
    return apiClient.master.patch<LifecyclePolicy>(`/mdm-v68/policies/${id}/activate`, {});
  },

  async deactivatePolicy(id: string): Promise<ApiResponse<LifecyclePolicy>> {
    return apiClient.master.patch<LifecyclePolicy>(`/mdm-v68/policies/${id}/deactivate`, {});
  },

  // ===== 保留策略管理 =====
  async createRetentionPolicy(
    data: CreateRetentionPolicyRequest
  ): Promise<ApiResponse<RetentionPolicy>> {
    return apiClient.master.post<RetentionPolicy>('/mdm-v68/retention-policies', data);
  },

  async getRetentionPolicy(id: string): Promise<ApiResponse<RetentionPolicy>> {
    return apiClient.master.get<RetentionPolicy>(`/mdm-v68/retention-policies/${id}`);
  },

  async listRetentionPolicies(params?: {
    entity_type?: string;
    retention_type?: string;
    action?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: RetentionPolicy[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.retention_type) qs.set('retention_type', params.retention_type);
    if (params?.action) qs.set('action', params.action);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: RetentionPolicy[]; total: number }>(
      `/mdm-v68/retention-policies${s ? `?${s}` : ''}`
    );
  },

  async updateRetentionPolicy(
    id: string,
    data: Partial<CreateRetentionPolicyRequest>
  ): Promise<ApiResponse<RetentionPolicy>> {
    return apiClient.master.put<RetentionPolicy>(`/mdm-v68/retention-policies/${id}`, data);
  },

  async deleteRetentionPolicy(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v68/retention-policies/${id}`);
  },

  // ===== 归档策略管理 =====
  async createArchiveStrategy(
    data: CreateArchiveStrategyRequest
  ): Promise<ApiResponse<ArchiveStrategy>> {
    return apiClient.master.post<ArchiveStrategy>('/mdm-v68/archive-strategies', data);
  },

  async getArchiveStrategy(id: string): Promise<ApiResponse<ArchiveStrategy>> {
    return apiClient.master.get<ArchiveStrategy>(`/mdm-v68/archive-strategies/${id}`);
  },

  async listArchiveStrategies(params?: {
    entity_type?: string;
    storage_tier?: StorageTier;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: ArchiveStrategy[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.storage_tier) qs.set('storage_tier', params.storage_tier);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: ArchiveStrategy[]; total: number }>(
      `/mdm-v68/archive-strategies${s ? `?${s}` : ''}`
    );
  },

  async updateArchiveStrategy(
    id: string,
    data: Partial<CreateArchiveStrategyRequest>
  ): Promise<ApiResponse<ArchiveStrategy>> {
    return apiClient.master.put<ArchiveStrategy>(`/mdm-v68/archive-strategies/${id}`, data);
  },

  async deleteArchiveStrategy(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v68/archive-strategies/${id}`);
  },

  // ===== 销毁策略管理 =====
  async createDestructionPolicy(
    data: CreateDestructionPolicyRequest
  ): Promise<ApiResponse<DestructionPolicy>> {
    return apiClient.master.post<DestructionPolicy>('/mdm-v68/destruction-policies', data);
  },

  async getDestructionPolicy(id: string): Promise<ApiResponse<DestructionPolicy>> {
    return apiClient.master.get<DestructionPolicy>(`/mdm-v68/destruction-policies/${id}`);
  },

  async listDestructionPolicies(params?: {
    entity_type?: string;
    method?: string;
    require_approval?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: DestructionPolicy[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.method) qs.set('method', params.method);
    if (params?.require_approval !== undefined)
      qs.set('require_approval', String(params.require_approval));
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: DestructionPolicy[]; total: number }>(
      `/mdm-v68/destruction-policies${s ? `?${s}` : ''}`
    );
  },

  async updateDestructionPolicy(
    id: string,
    data: Partial<CreateDestructionPolicyRequest>
  ): Promise<ApiResponse<DestructionPolicy>> {
    return apiClient.master.put<DestructionPolicy>(`/mdm-v68/destruction-policies/${id}`, data);
  },

  async deleteDestructionPolicy(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v68/destruction-policies/${id}`);
  },

  // ===== 生命周期流转 =====
  async executeTransition(
    data: ExecuteTransitionRequest
  ): Promise<ApiResponse<LifecycleTransition>> {
    return apiClient.master.post<LifecycleTransition>('/mdm-v68/transitions', data);
  },

  async getTransition(id: string): Promise<ApiResponse<LifecycleTransition>> {
    return apiClient.master.get<LifecycleTransition>(`/mdm-v68/transitions/${id}`);
  },

  async listTransitions(params?: {
    entity_type?: string;
    entity_id?: string;
    from_state?: LifecycleState;
    to_state?: LifecycleState;
    actor_id?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: LifecycleTransition[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.entity_id) qs.set('entity_id', params.entity_id);
    if (params?.from_state) qs.set('from_state', params.from_state);
    if (params?.to_state) qs.set('to_state', params.to_state);
    if (params?.actor_id) qs.set('actor_id', params.actor_id);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: LifecycleTransition[]; total: number }>(
      `/mdm-v68/transitions${s ? `?${s}` : ''}`
    );
  },

  async getLifecycleHistory(
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<LifecycleHistory>> {
    return apiClient.master.get<LifecycleHistory>(`/mdm-v68/history/${entityType}/${entityId}`);
  },

  async bulkTransition(
    data: Array<{
      entity_type: string;
      entity_id: string;
      target_state: LifecycleState;
      reason?: string;
    }>
  ): Promise<ApiResponse<{ processed: number; failed: number; errors?: string[] }>> {
    return apiClient.master.post<{ processed: number; failed: number; errors?: string[] }>(
      '/mdm-v68/transitions/bulk',
      { items: data }
    );
  },

  // ===== 归档执行 =====
  async executeArchive(data: ExecuteArchiveRequest): Promise<ApiResponse<ArchiveJob>> {
    return apiClient.master.post<ArchiveJob>('/mdm-v68/archive/execute', data);
  },

  async getArchiveJob(id: string): Promise<ApiResponse<ArchiveJob>> {
    return apiClient.master.get<ArchiveJob>(`/mdm-v68/archive/jobs/${id}`);
  },

  async listArchiveJobs(params?: {
    strategy_id?: string;
    entity_type?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: ArchiveJob[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.strategy_id) qs.set('strategy_id', params.strategy_id);
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: ArchiveJob[]; total: number }>(
      `/mdm-v68/archive/jobs${s ? `?${s}` : ''}`
    );
  },

  async restoreFromArchive(jobId: string, entityIds?: string[]): Promise<ApiResponse<ArchiveJob>> {
    const data = entityIds ? { entity_ids: entityIds } : {};
    return apiClient.master.post<ArchiveJob>(`/mdm-v68/archive/jobs/${jobId}/restore`, data);
  },

  async verifyArchiveJob(
    id: string
  ): Promise<ApiResponse<{ verified: boolean; record_count: number; checksum: string }>> {
    return apiClient.master.post<{ verified: boolean; record_count: number; checksum: string }>(
      `/mdm-v68/archive/jobs/${id}/verify`,
      {}
    );
  },

  // ===== 销毁执行 =====
  async executeDestruction(data: ExecuteDestructionRequest): Promise<ApiResponse<DestructionJob>> {
    return apiClient.master.post<DestructionJob>('/mdm-v68/destruction/execute', data);
  },

  async getDestructionJob(id: string): Promise<ApiResponse<DestructionJob>> {
    return apiClient.master.get<DestructionJob>(`/mdm-v68/destruction/jobs/${id}`);
  },

  async listDestructionJobs(params?: {
    policy_id?: string;
    entity_type?: string;
    status?: DestructionStatus;
    date_from?: string;
    date_to?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: DestructionJob[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.policy_id) qs.set('policy_id', params.policy_id);
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: DestructionJob[]; total: number }>(
      `/mdm-v68/destruction/jobs${s ? `?${s}` : ''}`
    );
  },

  async approveDestructionJob(
    id: string,
    data?: { reason?: string }
  ): Promise<ApiResponse<DestructionJob>> {
    return apiClient.master.post<DestructionJob>(
      `/mdm-v68/destruction/jobs/${id}/approve`,
      data || {}
    );
  },

  async cancelDestructionJob(id: string): Promise<ApiResponse<DestructionJob>> {
    return apiClient.master.post<DestructionJob>(`/mdm-v68/destruction/jobs/${id}/cancel`, {});
  },

  async verifyDestructionJob(
    id: string
  ): Promise<ApiResponse<{ verified: boolean; hash: string; audit_trail: string }>> {
    return apiClient.master.post<{ verified: boolean; hash: string; audit_trail: string }>(
      `/mdm-v68/destruction/jobs/${id}/verify`,
      {}
    );
  },

  // ===== 版本管理增强 =====
  async createVersion(data: VersionEntityRequest): Promise<ApiResponse<LifecycleVersion>> {
    return apiClient.master.post<LifecycleVersion>('/mdm-v68/versions', data);
  },

  async getVersion(id: string): Promise<ApiResponse<LifecycleVersion>> {
    return apiClient.master.get<LifecycleVersion>(`/mdm-v68/versions/${id}`);
  },

  async listVersions(params: {
    entity_type: string;
    entity_id: string;
    action?: VersionAction;
    state?: 'published' | 'draft' | 'archived' | 'deprecated';
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: LifecycleVersion[]; total: number }>> {
    const qs = new URLSearchParams();
    qs.set('entity_type', params.entity_type);
    qs.set('entity_id', params.entity_id);
    if (params?.action) qs.set('action', params.action);
    if (params?.state) qs.set('state', params.state);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    return apiClient.master.get<{ items: LifecycleVersion[]; total: number }>(
      `/mdm-v68/versions${qs.toString() ? `?${qs.toString()}` : ''}`
    );
  },

  async promoteVersion(id: string): Promise<ApiResponse<LifecycleVersion>> {
    return apiClient.master.post<LifecycleVersion>(`/mdm-v68/versions/${id}/promote`, {});
  },

  async archiveVersion(id: string): Promise<ApiResponse<LifecycleVersion>> {
    return apiClient.master.post<LifecycleVersion>(`/mdm-v68/versions/${id}/archive`, {});
  },

  async restoreVersion(id: string): Promise<ApiResponse<LifecycleVersion>> {
    return apiClient.master.post<LifecycleVersion>(`/mdm-v68/versions/${id}/restore`, {});
  },

  async destroyVersion(
    id: string
  ): Promise<ApiResponse<{ destroyed: boolean; audit_hash: string }>> {
    return apiClient.master.post<{ destroyed: boolean; audit_hash: string }>(
      `/mdm-v68/versions/${id}/destroy`,
      {}
    );
  },

  async compareVersions(
    sourceId: string,
    targetId: string
  ): Promise<
    ApiResponse<{ added: string[]; removed: string[]; modified: string[]; summary: string }>
  > {
    const qs = new URLSearchParams();
    qs.set('source_id', sourceId);
    qs.set('target_id', targetId);
    return apiClient.master.get<{
      added: string[];
      removed: string[];
      modified: string[];
      summary: string;
    }>(`/mdm-v68/versions/compare?${qs.toString()}`);
  },

  // ===== 合规检查与报告 =====
  async checkCompliance(params?: {
    entity_type?: string;
    policy_id?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<ApiResponse<ComplianceReport>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.policy_id) qs.set('policy_id', params.policy_id);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    return apiClient.master.get<ComplianceReport>(
      `/mdm-v68/compliance/check${qs.toString() ? `?${qs.toString()}` : ''}`
    );
  },

  async getComplianceReport(id: string): Promise<ApiResponse<ComplianceReport>> {
    return apiClient.master.get<ComplianceReport>(`/mdm-v68/compliance/reports/${id}`);
  },

  async listComplianceReports(params?: {
    entity_type?: string;
    severity?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: ComplianceReport[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: ComplianceReport[]; total: number }>(
      `/mdm-v68/compliance/reports${s ? `?${s}` : ''}`
    );
  },

  // ===== 生命周期仪表盘 =====
  async getDashboard(): Promise<ApiResponse<LifecycleDashboard>> {
    return apiClient.master.get<LifecycleDashboard>('/mdm-v68/dashboard');
  },

  async getPolicyComplianceStats(): Promise<
    ApiResponse<{
      compliant: number;
      non_compliant: number;
      violations: Array<{ policy_id: string; policy_name: string; violation_count: number }>;
    }>
  > {
    return apiClient.master.get<{
      compliant: number;
      non_compliant: number;
      violations: Array<{ policy_id: string; policy_name: string; violation_count: number }>;
    }>('/mdm-v68/dashboard/compliance');
  },

  async getRetentionStats(): Promise<
    ApiResponse<{
      by_type: Array<{ type: string; expiring_soon: number; overdue: number }>;
      total_expiring_30d: number;
    }>
  > {
    return apiClient.master.get<{
      by_type: Array<{ type: string; expiring_soon: number; overdue: number }>;
      total_expiring_30d: number;
    }>('/mdm-v68/dashboard/retention');
  },

  async getArchiveStats(days?: number): Promise<
    ApiResponse<{
      total_archived: number;
      total_size_bytes: number;
      by_tier: Array<{ tier: string; count: number; size_bytes: number }>;
      trend: Array<{ date: string; count: number; size_bytes: number }>;
    }>
  > {
    const qs = new URLSearchParams();
    if (days !== undefined) qs.set('days', String(days));
    return apiClient.master.get<{
      total_archived: number;
      total_size_bytes: number;
      by_tier: Array<{ tier: string; count: number; size_bytes: number }>;
      trend: Array<{ date: string; count: number; size_bytes: number }>;
    }>(`/mdm-v68/dashboard/archive${qs.toString() ? `?${qs.toString()}` : ''}`);
  },

  async getDestructionStats(days?: number): Promise<
    ApiResponse<{
      total_destroyed: number;
      total_size_bytes: number;
      by_method: Array<{ method: string; count: number }>;
      pending_approvals: number;
      trend: Array<{ date: string; count: number }>;
    }>
  > {
    const qs = new URLSearchParams();
    if (days !== undefined) qs.set('days', String(days));
    return apiClient.master.get<{
      total_destroyed: number;
      total_size_bytes: number;
      by_method: Array<{ method: string; count: number }>;
      pending_approvals: number;
      trend: Array<{ date: string; count: number }>;
    }>(`/mdm-v68/dashboard/destruction${qs.toString() ? `?${qs.toString()}` : ''}`);
  },
};

export default dataLifecycleApiV68;
