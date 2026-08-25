import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

// ==================== 类型定义 ====================

export type SyncStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'partially_failed'
  | 'compensating'
  | 'compensated';

interface SyncStep {
  id: string;
  step_name: string;
  target_system: string;
  status: SyncStatus;
  order: number;
  retry_count: number;
  max_retries: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  compensation_status?: SyncStatus;
}

export interface SyncJob {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  status: SyncStatus;
  source_system: string;
  target_systems: string[];
  steps: SyncStep[];
  current_step: number;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error_message?: string;
}

interface SystemSyncStats {
  system_name: string;
  total: number;
  successful: number;
  failed: number;
  avg_latency_ms: number;
}

export interface SyncStats {
  total_jobs: number;
  successful: number;
  failed: number;
  compensating: number;
  success_rate: number;
  avg_duration_ms: number;
  total_compensations: number;
  dead_letter_count: number;
  sync_per_system: Record<string, SystemSyncStats>;
}

interface DeadLetterEntry {
  id: string;
  job_id: string;
  step_id: string;
  entity_type: string;
  operation: string;
  error_message: string;
  retry_count: number;
  created_at: string;
  last_retry_at?: string;
}

// ==================== 请求/查询类型 ====================

export interface CreateSyncJobRequest {
  entity_type: string;
  entity_id: string;
  operation: string;
  source_system: string;
  target_systems: string[];
  max_retries?: number;
}

interface ListSyncJobsParams {
  entity_type?: string;
  status?: string;
  source_system?: string;
  page?: number;
  page_size?: number;
}

interface ListDeadLettersParams {
  entity_type?: string;
  job_id?: string;
  page?: number;
  page_size?: number;
}

// ==================== API 方法 ====================

const masterDataSyncApi = {
  // --- 同步任务 ---

  async createSyncJob(data: CreateSyncJobRequest): Promise<ApiResponse<SyncJob>> {
    return apiClient.erp.post<SyncJob>('/master-data/sync/jobs', data);
  },

  async getSyncJob(id: string): Promise<ApiResponse<SyncJob>> {
    return apiClient.erp.get<SyncJob>(`/master-data/sync/jobs/${id}`);
  },

  async listSyncJobs(
    params?: ListSyncJobsParams
  ): Promise<ApiResponse<PaginatedResponse<SyncJob>>> {
    return apiClient.erp.get<PaginatedResponse<SyncJob>>('/master-data/sync/jobs', { params });
  },

  async retrySyncJob(id: string): Promise<ApiResponse<SyncJob>> {
    return apiClient.erp.post<SyncJob>(`/master-data/sync/jobs/${id}/retry`);
  },

  async cancelSyncJob(id: string): Promise<ApiResponse<SyncJob>> {
    return apiClient.erp.post<SyncJob>(`/master-data/sync/jobs/${id}/cancel`);
  },

  async triggerCompensation(id: string): Promise<ApiResponse<SyncJob>> {
    return apiClient.erp.post<SyncJob>(`/master-data/sync/jobs/${id}/compensate`);
  },

  // --- 同步统计 ---

  async getSyncStats(): Promise<ApiResponse<SyncStats>> {
    return apiClient.erp.get<SyncStats>('/master-data/sync/stats');
  },

  // --- 死信队列 ---

  async listDeadLetters(params?: ListDeadLettersParams): Promise<ApiResponse<DeadLetterEntry[]>> {
    return apiClient.erp.get<DeadLetterEntry[]>('/master-data/sync/dead-letters', { params });
  },

  async replayDeadLetter(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.erp.post<boolean>(`/master-data/sync/dead-letters/${id}/replay`);
  },

  async batchReplayDeadLetters(ids: string[]): Promise<ApiResponse<number>> {
    return apiClient.erp.post<number>('/master-data/sync/dead-letters/batch-replay', ids);
  },

  async deleteDeadLetter(id: string): Promise<void> {
    return apiClient.erp.delete(`/master-data/sync/dead-letters/${id}`);
  },
};

export default masterDataSyncApi;

// ==================== V42.0 AC-14: 质量闭环管理类型 ====================

type QualityTicketStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'pending_review'
  | 'resolved'
  | 'verified'
  | 'closed'
  | 'rejected';

interface TicketHistoryEntry {
  action: string;
  actor: string;
  comment?: string;
  timestamp: string;
}

export interface QualityTicket {
  id: string;
  issue_id: string;
  entity_type: string;
  entity_id: string;
  rule_id: string;
  severity: string;
  status: QualityTicketStatus;
  assigned_to?: string;
  assigned_at?: string;
  resolution?: string;
  resolved_at?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  history: TicketHistoryEntry[];
}

export interface CreateQualityTicketRequest {
  issue_id: string;
  entity_type: string;
  entity_id: string;
  rule_id: string;
  severity: string;
  assigned_to?: string;
}

// ==================== 自动修复工作流类型 ====================

// ==================== 数据所有权管理类型 ====================

export interface CreateDataDomainRequest {
  name: string;
  description?: string;
  owner: string;
  owner_email?: string;
  stewards?: string[];
  entities?: string[];
  sla_hours?: number;
}

export interface UpdateDataDomainRequest {
  name?: string;
  description?: string;
  owner?: string;
  owner_email?: string;
  stewards?: string[];
  entities?: string[];
  sla_hours?: number;
}

export interface SetOwnershipMatrixRequest {
  data_domain: string;
  data_owner: string;
  data_steward: string;
  approvers: string[];
  viewers: string[];
  auto_repair_enabled?: boolean;
  escalation_path: string[];
}

// ==================== 质量闭环统计类型 ====================

// ==================== V42.0 AC-14: 质量闭环 API 方法 ====================

// ==================== V42.0 AC-14: 修复工作流 API 方法 ====================

// ==================== V42.0 AC-14: 数据所有权 API 方法 ====================

// ==================== V43.0 AC-15: 主数据图谱类型 ====================

// ==================== V43.0 AC-15: 知识图谱类型 ====================

// ==================== V43.0 AC-15: 智能推荐类型 ====================

interface SimilarEntity {
  entity_id: string;
  entity_type: string;
  entity_name: string;
  similarity: number;
  similarity_reasons: string[];
  shared_attributes: string[];
}

interface AssociationRecommendation {
  source_entity_id: string;
  target_entity_id: string;
  target_entity_name: string;
  relation_type: string;
  confidence: number;
  evidence: string[];
  support: number;
}

export interface CompletionSuggestion {
  entity_id: string;
  entity_type: string;
  field_name: string;
  suggested_value: string;
  confidence: number;
  source: string;
  reasoning: string;
}

interface SimilarEntityQueryParams {
  entity_id: string;
  entity_type?: string;
  top_k?: number;
  min_similarity?: number;
}

interface AssociationQueryParams {
  entity_id: string;
  relation_type?: string;
  top_k?: number;
  min_confidence?: number;
}

interface CompletionQueryParams {
  entity_id: string;
  field_name?: string;
  top_k?: number;
  min_confidence?: number;
}

// ==================== V43.0 AC-15: 主数据图谱 API 方法 ====================

// ==================== V43.0 AC-15: 知识图谱 API 方法 ====================

// ==================== V43.0 AC-15: 智能推荐 API 方法 ====================

export const recommendationApi = {
  async getSimilarEntities(
    params: SimilarEntityQueryParams
  ): Promise<ApiResponse<SimilarEntity[]>> {
    return apiClient.erp.get<SimilarEntity[]>('/master-data/recommendations/similar', { params });
  },

  async getAssociationRecommendations(
    params: AssociationQueryParams
  ): Promise<ApiResponse<AssociationRecommendation[]>> {
    return apiClient.erp.get<AssociationRecommendation[]>(
      '/master-data/recommendations/associations',
      { params }
    );
  },

  async getCompletionSuggestions(
    params: CompletionQueryParams
  ): Promise<ApiResponse<CompletionSuggestion[]>> {
    return apiClient.erp.get<CompletionSuggestion[]>('/master-data/recommendations/completions', {
      params,
    });
  },
};

// ==================== V44.0 AC-16: MDM GraphQL API 类型 ====================

// ==================== V44.0 AC-16: MDM GraphQL API 方法 ====================

// ==================== V44.0 AC-16: 同步编排引擎 V2 类型 ====================

// ==================== V44.0 AC-16: 同步编排引擎 V2 API 方法 ====================

// ==================== V44.0 AC-16: MDM 服务注册与健康检查类型 ====================

// ==================== V44.0 AC-16: MDM 服务注册 API 方法 ====================

// ==================== V44.0 AC-16: MDM API 网关层类型 ====================

// ==================== V44.0 AC-16: MDM API 网关 API 方法 ====================

// ==================== V45.0 AC-17: 主数据质量 AI 类型 ====================

// ==================== V45.0 AC-17: 质量 AI API 方法 ====================

// ==================== V45.0 AC-17: 智能匹配类型 ====================

// ==================== V45.0 AC-17: 智能匹配 API 方法 ====================

// ==================== V45.0 AC-17: 自动分类类型 ====================

export interface ClassificationResult {
  entity_id: string;
  domain: string;
  suggested_category: string;
  category_path: string;
  confidence: number;
  alternative_categories: string[];
  features_used: string[];
  reasoning: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  domain: string;
  description: string;
  keywords: string[];
  rules: string[];
  entity_count: number;
}

// ==================== V45.0 AC-17: 自动分类 API 方法 ====================
