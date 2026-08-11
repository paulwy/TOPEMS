import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

// ============ Types ============

export interface MasterDataRef {
  master_data_id: string;
  tenant_id: string;
  domain: string;
  code: string;
  name?: string;
  status: string;
  source_service: string;
  local_entity_type?: string;
  local_entity_id?: string;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  archived_by?: string;
  archive_reason?: string;
  destroy_scheduled_at?: string;
  destroy_reason?: string;
  destroy_scheduled_by?: string;
  destroyed_at?: string;
  destroyed_by?: string;
}

export interface AuditTrailEntry {
  id: string;
  master_data_id: string;
  action: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  source_service: string;
  operator?: string;
  timestamp: string;
}

export interface DataLineage {
  master_data_id: string;
  refs: DataLineageRef[];
}

export interface DataLineageRef {
  target_service: string;
  target_entity_type: string;
  target_entity_id: string;
  target_entity_name?: string;
  sync_status: string;
  last_synced_at?: string;
}

export interface MasterDataVersion {
  id: string;
  master_data_id: string;
  version: number;
  snapshot: Record<string, unknown>;
  created_at: string;
  created_by?: string;
  change_summary?: string;
}

export interface QualityRule {
  id: string;
  code: string;
  name: string;
  domain: string;
  rule_type: string;
  expression: string;
  severity: string;
  description?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface GovernanceDashboard {
  total_refs: number;
  active_refs: number;
  archived_refs: number;
  pending_destruction: number;
  by_domain: Record<string, number>;
  quality_score: number;
  sync_lag_avg: number;
}

export interface MasterDataRefListResponse {
  items: MasterDataRef[];
  total: number;
}

export interface QualityRuleListResponse {
  items: QualityRule[];
  total: number;
}

export interface SyncJob {
  id: string;
  job_type: string;
  source_service: string;
  target_service: string;
  status: string;
  records_processed: number;
  records_failed: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface SyncJobListResponse {
  items: SyncJob[];
  total: number;
}

export interface QualityTicket {
  id: string;
  title: string;
  domain: string;
  ticket_type: string;
  priority: string;
  status: string;
  assignee?: string;
  master_data_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface QualityTicketListResponse {
  items: QualityTicket[];
  total: number;
}

// ============ Request Types ============

export interface RecordAuditEventRequest {
  master_data_id: string;
  action: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  source_service: string;
}

export interface CreateQualityRuleRequest {
  code: string;
  name: string;
  domain: string;
  rule_type: string;
  expression: string;
  severity?: string;
  description?: string;
}

export interface UpdateQualityRuleRequest {
  name?: string;
  expression?: string;
  severity?: string;
  description?: string;
  enabled?: boolean;
}

export interface DetectConflictsRequest {
  master_data_ids: string[];
}

export interface CreateSyncJobRequest {
  job_type: string;
  source_service: string;
  target_service: string;
  config?: Record<string, unknown>;
}

export interface CreateQualityTicketRequest {
  title: string;
  domain: string;
  ticket_type: string;
  priority?: string;
  master_data_id?: string;
  description?: string;
}

export interface CreateDataDomainRequest {
  name: string;
  code: string;
  description?: string;
  owner?: string;
}

export interface UpdateDataDomainRequest {
  name?: string;
  description?: string;
  owner?: string;
}

export interface SetOwnershipMatrixRequest {
  owners: Array<{
    entity_type: string;
    owner: string;
    steward?: string;
  }>;
}

export interface ArchiveRequest {
  archive_reason?: string;
}

export interface RestoreRequest {
  restore_reason?: string;
}

export interface ScheduleDestructionRequest {
  destroy_reason: string;
  destroy_scheduled_at?: string;
}

export interface RollbackRequest {
  reason?: string;
}

// ============ Query Types ============

export interface MasterDataRefQueryParams extends PaginationParams {
  domain?: string;
}

export interface ConflictQueryParams extends PaginationParams {
  status?: string;
  domain?: string;
}

export interface SyncJobQueryParams extends PaginationParams {
  job_type?: string;
  status?: string;
}

export interface QualityTicketQueryParams extends PaginationParams {
  domain?: string;
  status?: string;
  priority?: string;
}

// ============ Helper ============

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps = (params as { pageSize?: number } | undefined)?.pageSize
    ?? (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

const buildSearchParams = (params?: PaginationParams): URLSearchParams => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', params.page.toString());
  const ps = resolvePageSize(params);
  if (ps) sp.set('pagesize', ps);
  return sp;
};

// ============ API ============

export const mdmRefsApi = {
  // ===== Master Data Refs CRUD =====
  async list(params?: MasterDataRefQueryParams): Promise<ApiResponse<MasterDataRefListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.domain) sp.set('domain', params.domain);
    const qs = sp.toString();
    return apiClient.erp.get<MasterDataRefListResponse>(`/master-data-refs${qs ? `?${qs}` : ''}`);
  },

  async get(masterDataId: string): Promise<ApiResponse<MasterDataRef>> {
    return apiClient.erp.get<MasterDataRef>(`/master-data-refs/${masterDataId}`);
  },

  async getByCode(domain: string, code: string): Promise<ApiResponse<MasterDataRef>> {
    return apiClient.erp.get<MasterDataRef>(`/master-data-refs/by-code/${domain}/${code}`);
  },

  // ===== Audit Trail =====
  async getAuditTrail(masterDataId: string): Promise<ApiResponse<AuditTrailEntry[]>> {
    return apiClient.erp.get<AuditTrailEntry[]>(`/master-data-refs/${masterDataId}/audit-trail`);
  },

  async recordAuditEvent(data: RecordAuditEventRequest): Promise<ApiResponse<AuditTrailEntry>> {
    return apiClient.erp.post<AuditTrailEntry>('/master-data-refs/audit-trail', data);
  },

  // ===== Data Lineage =====
  async getLineage(masterDataId: string): Promise<ApiResponse<DataLineage>> {
    return apiClient.erp.get<DataLineage>(`/master-data-refs/${masterDataId}/lineage`);
  },

  // ===== Version Management =====
  async listVersions(masterDataId: string): Promise<ApiResponse<MasterDataVersion[]>> {
    return apiClient.erp.get<MasterDataVersion[]>(`/master-data-refs/${masterDataId}/versions`);
  },

  async getVersion(masterDataId: string, versionId: string): Promise<ApiResponse<MasterDataVersion>> {
    return apiClient.erp.get<MasterDataVersion>(`/master-data-refs/${masterDataId}/versions/${versionId}`);
  },

  async rollbackVersion(masterDataId: string, versionId: string, data?: RollbackRequest): Promise<ApiResponse<MasterDataRef>> {
    return apiClient.erp.post<MasterDataRef>(
      `/master-data-refs/${masterDataId}/versions/${versionId}/rollback`,
      data || {}
    );
  },

  // ===== Conflict Detection =====
  async detectConflicts(data: DetectConflictsRequest): Promise<ApiResponse<{ conflicts: number }>> {
    return apiClient.erp.post<{ conflicts: number }>('/master-data-refs/conflicts/detect', data);
  },

  async listConflicts(params?: ConflictQueryParams): Promise<ApiResponse<{ items: Array<{ id: string }>; total: number }>> {
    const sp = buildSearchParams(params);
    if (params?.status) sp.set('status', params.status);
    if (params?.domain) sp.set('domain', params.domain);
    const qs = sp.toString();
    return apiClient.erp.get<{ items: Array<{ id: string }>; total: number }>(
      `/master-data-refs/conflicts${qs ? `?${qs}` : ''}`
    );
  },

  async autoMergeConflict(conflictId: string): Promise<ApiResponse<MasterDataRef>> {
    return apiClient.erp.post<MasterDataRef>(
      `/master-data-refs/conflicts/${conflictId}/auto-merge`,
      {}
    );
  },

  // ===== Lifecycle Management =====
  async listArchived(params?: PaginationParams): Promise<ApiResponse<MasterDataRefListResponse>> {
    const sp = buildSearchParams(params);
    const qs = sp.toString();
    return apiClient.erp.get<MasterDataRefListResponse>(
      `/master-data-refs/archived${qs ? `?${qs}` : ''}`
    );
  },

  async listPendingDestruction(params?: PaginationParams): Promise<ApiResponse<MasterDataRefListResponse>> {
    const sp = buildSearchParams(params);
    const qs = sp.toString();
    return apiClient.erp.get<MasterDataRefListResponse>(
      `/master-data-refs/pending-destruction${qs ? `?${qs}` : ''}`
    );
  },

  async archive(masterDataId: string, data?: ArchiveRequest): Promise<ApiResponse<MasterDataRef>> {
    return apiClient.erp.post<MasterDataRef>(`/master-data-refs/${masterDataId}/archive`, data || {});
  },

  async restore(masterDataId: string, data?: RestoreRequest): Promise<ApiResponse<MasterDataRef>> {
    return apiClient.erp.post<MasterDataRef>(`/master-data-refs/${masterDataId}/restore`, data || {});
  },

  async scheduleDestruction(masterDataId: string, data: ScheduleDestructionRequest): Promise<ApiResponse<MasterDataRef>> {
    return apiClient.erp.post<MasterDataRef>(
      `/master-data-refs/${masterDataId}/schedule-destruction`,
      data
    );
  },

  async cancelDestruction(masterDataId: string): Promise<ApiResponse<MasterDataRef>> {
    return apiClient.erp.post<MasterDataRef>(`/master-data-refs/${masterDataId}/cancel-destruction`, {});
  },

  // ===== Quality Rules =====
  async listQualityRules(params?: PaginationParams): Promise<ApiResponse<QualityRuleListResponse>> {
    const sp = buildSearchParams(params);
    const qs = sp.toString();
    return apiClient.erp.get<QualityRuleListResponse>(
      `/master-data-refs/quality-rules${qs ? `?${qs}` : ''}`
    );
  },

  async createQualityRule(data: CreateQualityRuleRequest): Promise<ApiResponse<QualityRule>> {
    return apiClient.erp.post<QualityRule>('/master-data-refs/quality-rules', data);
  },

  async runQualityCheck(): Promise<ApiResponse<{ total: number; passed: number; failed: number }>> {
    return apiClient.erp.post<{ total: number; passed: number; failed: number }>(
      '/master-data-refs/quality-check',
      {}
    );
  },

  // ===== Governance =====
  async getGovernanceDashboard(): Promise<ApiResponse<GovernanceDashboard>> {
    return apiClient.erp.get<GovernanceDashboard>('/master-data-refs/governance/dashboard');
  },

  // ===== Sync Jobs =====
  async listSyncJobs(params?: SyncJobQueryParams): Promise<ApiResponse<SyncJobListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.job_type) sp.set('job_type', params.job_type);
    if (params?.status) sp.set('status', params.status);
    const qs = sp.toString();
    return apiClient.erp.get<SyncJobListResponse>(`/master-data/sync/jobs${qs ? `?${qs}` : ''}`);
  },

  async createSyncJob(data: CreateSyncJobRequest): Promise<ApiResponse<SyncJob>> {
    return apiClient.erp.post<SyncJob>('/master-data/sync/jobs', data);
  },

  async getSyncJob(id: string): Promise<ApiResponse<SyncJob>> {
    return apiClient.erp.get<SyncJob>(`/master-data/sync/jobs/${id}`);
  },

  async retrySyncJob(id: string): Promise<ApiResponse<SyncJob>> {
    return apiClient.erp.post<SyncJob>(`/master-data/sync/jobs/${id}/retry`, {});
  },

  async cancelSyncJob(id: string): Promise<ApiResponse<SyncJob>> {
    return apiClient.erp.post<SyncJob>(`/master-data/sync/jobs/${id}/cancel`, {});
  },

  async getSyncStats(): Promise<ApiResponse<{ total_jobs: number; success_rate: number; avg_duration_ms: number }>> {
    return apiClient.erp.get<{ total_jobs: number; success_rate: number; avg_duration_ms: number }>(
      '/master-data/sync/stats'
    );
  },

  // ===== Quality Tickets =====
  async listQualityTickets(params?: QualityTicketQueryParams): Promise<ApiResponse<QualityTicketListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.domain) sp.set('domain', params.domain);
    if (params?.status) sp.set('status', params.status);
    if (params?.priority) sp.set('priority', params.priority);
    const qs = sp.toString();
    return apiClient.erp.get<QualityTicketListResponse>(
      `/master-data/quality/tickets${qs ? `?${qs}` : ''}`
    );
  },

  async createQualityTicket(data: CreateQualityTicketRequest): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.post<QualityTicket>('/master-data/quality/tickets', data);
  },

  async getQualityTicket(id: string): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.get<QualityTicket>(`/master-data/quality/tickets/${id}`);
  },

  async assignQualityTicket(id: string, assignee: string): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.post<QualityTicket>(`/master-data/quality/tickets/${id}/assign`, { assignee });
  },

  async closeQualityTicket(id: string): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.post<QualityTicket>(`/master-data/quality/tickets/${id}/close`, {});
  },

  async getQualityLoopStats(): Promise<ApiResponse<{ total: number; resolved: number; avg_resolution_hours: number }>> {
    return apiClient.erp.get<{ total: number; resolved: number; avg_resolution_hours: number }>(
      '/master-data/quality/loop-stats'
    );
  },
};
