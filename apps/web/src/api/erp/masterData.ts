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

export interface SyncStep {
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

export interface CompensationAction {
  step_id: string;
  action: string;
  status: SyncStatus;
  executed_at?: string;
}

export interface SystemSyncStats {
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

export interface DeadLetterEntry {
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

export interface ListSyncJobsParams {
  entity_type?: string;
  status?: string;
  source_system?: string;
  page?: number;
  page_size?: number;
}

export interface ListDeadLettersParams {
  entity_type?: string;
  job_id?: string;
  page?: number;
  page_size?: number;
}

// ==================== API 方法 ====================

export const masterDataSyncApi = {
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

export type QualityTicketStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'pending_review'
  | 'resolved'
  | 'verified'
  | 'closed'
  | 'rejected';

export interface TicketHistoryEntry {
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

export interface AssignTicketRequest {
  assigned_to: string;
  comment?: string;
}

export interface SubmitTicketRequest {
  resolution: string;
  actor: string;
  comment?: string;
}

export interface VerifyTicketRequest {
  verified_by: string;
  comment?: string;
}

export interface RejectTicketRequest {
  actor: string;
  comment?: string;
}

export interface CloseTicketRequest {
  actor: string;
  comment?: string;
}

export interface EscalateTicketRequest {
  actor: string;
  comment?: string;
}

export interface ListQualityTicketsParams {
  status?: string;
  severity?: string;
  entity_type?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedTickets {
  items: QualityTicket[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ==================== 自动修复工作流类型 ====================

export type RepairStrategy = 'auto_fix' | 'manual_fix' | 'escalate' | 'ignore';

export interface RepairStep {
  step_id: string;
  step_name: string;
  action: string;
  target_field: string;
  new_value?: unknown;
  status: string;
  error_message?: string;
  executed_at?: string;
}

export interface RepairResult {
  success: boolean;
  fields_changed: number;
  before_value: unknown;
  after_value: unknown;
  verification_passed: boolean;
  message: string;
}

export interface RepairWorkflow {
  id: string;
  ticket_id: string;
  strategy: RepairStrategy;
  status: string;
  steps: RepairStep[];
  current_step: number;
  auto_execute: boolean;
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: string;
  executed_at?: string;
  result?: RepairResult;
  created_at: string;
}

export interface CreateRepairStepRequest {
  step_name: string;
  action: string;
  target_field: string;
  new_value?: unknown;
}

export interface CreateRepairWorkflowRequest {
  ticket_id: string;
  strategy: RepairStrategy;
  steps: CreateRepairStepRequest[];
  auto_execute?: boolean;
  requires_approval?: boolean;
}

export interface ApproveRepairRequest {
  approved_by: string;
  comment?: string;
}

export interface ListRepairWorkflowsParams {
  status?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedRepairWorkflows {
  items: RepairWorkflow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ==================== 数据所有权管理类型 ====================

export interface DataDomain {
  id: string;
  name: string;
  description: string;
  owner: string;
  owner_email?: string;
  stewards: string[];
  entities: string[];
  sla_hours: number;
  created_at: string;
}

export interface DataOwnershipMatrix {
  entity_type: string;
  data_domain: string;
  data_owner: string;
  data_steward: string;
  approvers: string[];
  viewers: string[];
  auto_repair_enabled: boolean;
  escalation_path: string[];
}

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

export interface EntityOwnerInfo {
  entity_type: string;
  data_owner: string;
  data_steward: string;
  data_domain: string;
  domain_info?: DataDomain;
  auto_repair_enabled: boolean;
  escalation_path: string[];
}

// ==================== 质量闭环统计类型 ====================

export interface QualityLoopStats {
  total_tickets: number;
  open_tickets: number;
  in_progress: number;
  resolved: number;
  verified: number;
  closed: number;
  rejected: number;
  auto_repair_count: number;
  auto_repair_success_rate: number;
  avg_resolution_time_hours: number;
  sla_compliance_rate: number;
  tickets_by_severity: Record<string, number>;
  tickets_by_domain: Record<string, number>;
}

// ==================== V42.0 AC-14: 质量闭环 API 方法 ====================

const qualityTicketApi = {
  // --- 质量工单 ---

  async createQualityTicket(data: CreateQualityTicketRequest): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.post<QualityTicket>('/master-data/quality/tickets', data);
  },

  async listQualityTickets(
    params?: ListQualityTicketsParams
  ): Promise<ApiResponse<PaginatedTickets>> {
    return apiClient.erp.get<PaginatedTickets>('/master-data/quality/tickets', { params });
  },

  async getQualityTicket(id: string): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.get<QualityTicket>(`/master-data/quality/tickets/${id}`);
  },

  async getQualityTicketHistory(id: string): Promise<ApiResponse<TicketHistoryEntry[]>> {
    return apiClient.erp.get<TicketHistoryEntry[]>(`/master-data/quality/tickets/${id}/history`);
  },

  async assignQualityTicket(
    id: string,
    data: AssignTicketRequest
  ): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.post<QualityTicket>(`/master-data/quality/tickets/${id}/assign`, data);
  },

  async startQualityTicket(
    id: string,
    data: AssignTicketRequest
  ): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.post<QualityTicket>(`/master-data/quality/tickets/${id}/start`, data);
  },

  async submitQualityTicket(
    id: string,
    data: SubmitTicketRequest
  ): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.post<QualityTicket>(`/master-data/quality/tickets/${id}/submit`, data);
  },

  async verifyQualityTicket(
    id: string,
    data: VerifyTicketRequest
  ): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.post<QualityTicket>(`/master-data/quality/tickets/${id}/verify`, data);
  },

  async closeQualityTicket(
    id: string,
    data: CloseTicketRequest
  ): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.post<QualityTicket>(`/master-data/quality/tickets/${id}/close`, data);
  },

  async rejectQualityTicket(
    id: string,
    data: RejectTicketRequest
  ): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.post<QualityTicket>(`/master-data/quality/tickets/${id}/reject`, data);
  },

  async escalateTicket(
    id: string,
    data: EscalateTicketRequest
  ): Promise<ApiResponse<QualityTicket>> {
    return apiClient.erp.post<QualityTicket>(`/master-data/quality/tickets/${id}/escalate`, data);
  },

  // --- 质量闭环统计 ---

  async getQualityLoopStats(): Promise<ApiResponse<QualityLoopStats>> {
    return apiClient.erp.get<QualityLoopStats>('/master-data/quality/loop-stats');
  },
};

// ==================== V42.0 AC-14: 修复工作流 API 方法 ====================

const repairWorkflowApi = {
  async createRepairWorkflow(
    data: CreateRepairWorkflowRequest
  ): Promise<ApiResponse<RepairWorkflow>> {
    return apiClient.erp.post<RepairWorkflow>('/master-data/quality/repair-workflows', data);
  },

  async listRepairWorkflows(
    params?: ListRepairWorkflowsParams
  ): Promise<ApiResponse<PaginatedRepairWorkflows>> {
    return apiClient.erp.get<PaginatedRepairWorkflows>('/master-data/quality/repair-workflows', {
      params,
    });
  },

  async getRepairWorkflow(id: string): Promise<ApiResponse<RepairWorkflow>> {
    return apiClient.erp.get<RepairWorkflow>(`/master-data/quality/repair-workflows/${id}`);
  },

  async executeRepairWorkflow(id: string): Promise<ApiResponse<RepairWorkflow>> {
    return apiClient.erp.post<RepairWorkflow>(
      `/master-data/quality/repair-workflows/${id}/execute`
    );
  },

  async approveRepairWorkflow(
    id: string,
    data: ApproveRepairRequest
  ): Promise<ApiResponse<RepairWorkflow>> {
    return apiClient.erp.post<RepairWorkflow>(
      `/master-data/quality/repair-workflows/${id}/approve`,
      data
    );
  },

  async verifyRepair(id: string): Promise<ApiResponse<RepairWorkflow>> {
    return apiClient.erp.post<RepairWorkflow>(`/master-data/quality/repair-workflows/${id}/verify`);
  },

  async executeRepairStep(workflowId: string, stepIndex: number): Promise<ApiResponse<RepairStep>> {
    return apiClient.erp.post<RepairStep>(
      `/master-data/quality/repair-workflows/${workflowId}/steps/${stepIndex}/execute`
    );
  },
};

// ==================== V42.0 AC-14: 数据所有权 API 方法 ====================

const dataOwnershipApi = {
  // --- 数据域 ---

  async createDataDomain(data: CreateDataDomainRequest): Promise<ApiResponse<DataDomain>> {
    return apiClient.erp.post<DataDomain>('/master-data/domains', data);
  },

  async listDataDomains(): Promise<ApiResponse<DataDomain[]>> {
    return apiClient.erp.get<DataDomain[]>('/master-data/domains');
  },

  async getDataDomain(id: string): Promise<ApiResponse<DataDomain>> {
    return apiClient.erp.get<DataDomain>(`/master-data/domains/${id}`);
  },

  async updateDataDomain(
    id: string,
    data: UpdateDataDomainRequest
  ): Promise<ApiResponse<DataDomain>> {
    return apiClient.erp.put<DataDomain>(`/master-data/domains/${id}`, data);
  },

  // --- 责任矩阵 ---

  async getOwnershipMatrix(entityType: string): Promise<ApiResponse<DataOwnershipMatrix>> {
    return apiClient.erp.get<DataOwnershipMatrix>(`/master-data/ownership-matrix/${entityType}`);
  },

  async setOwnershipMatrix(
    entityType: string,
    data: SetOwnershipMatrixRequest
  ): Promise<ApiResponse<DataOwnershipMatrix>> {
    return apiClient.erp.put<DataOwnershipMatrix>(
      `/master-data/ownership-matrix/${entityType}`,
      data
    );
  },

  // --- 实体所有者 ---

  async getEntityOwner(entityType: string): Promise<ApiResponse<EntityOwnerInfo>> {
    return apiClient.erp.get<EntityOwnerInfo>(`/master-data/entities/${entityType}/owner`);
  },
};

// ==================== V43.0 AC-15: 主数据图谱类型 ====================

export interface GraphNode {
  id: string;
  label: string;
  entity_type: string;
  domain: string;
  properties: Record<string, unknown>;
  degree: number;
  centrality: number;
  cluster?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation_type: string;
  label: string;
  weight: number;
  properties: Record<string, unknown>;
}

export interface MasterDataGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  node_count: number;
  edge_count: number;
  avg_degree: number;
  density: number;
  connected_components: number;
}

export interface GraphStats {
  node_count: number;
  edge_count: number;
  avg_degree: number;
  density: number;
  connected_components: number;
  nodes_by_domain: Record<string, number>;
  edges_by_relation: Record<string, number>;
  top_degree_nodes: [string, string, number][];
  avg_clustering_coefficient: number;
}

export interface GraphQueryParams {
  domain?: string;
  entity_type?: string;
  limit?: number;
}

export interface NeighborQueryParams {
  relation_type?: string;
  direction?: string;
  limit?: number;
}

export interface ShortestPathParams {
  source: string;
  target: string;
}

export interface MultiHopQueryParams {
  max_hops?: number;
  relation_type?: string;
}

// ==================== V43.0 AC-15: 知识图谱类型 ====================

export interface Concept {
  id: string;
  name: string;
  concept_type: string;
  description: string;
  parentId?: string;
  properties: Record<string, unknown>;
  synonyms: string[];
}

export interface KnowledgeTriple {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  source: string;
  created_at: string;
}

export interface InferenceRule {
  id: string;
  name: string;
  description: string;
  condition_pattern: string;
  conclusion_pattern: string;
  confidence: number;
  enabled: boolean;
}

export interface ConceptQueryParams {
  concept_type?: string;
  parentId?: string;
  keyword?: string;
  page?: number;
  page_size?: number;
}

export interface TripleQueryParams {
  subject?: string;
  predicate?: string;
  object?: string;
  min_confidence?: number;
  page?: number;
  page_size?: number;
}

export interface InferenceRequest {
  entity_id: string;
  rule_ids?: string[];
  max_depth?: number;
}

export interface InferenceResult {
  entity_id: string;
  inferred_triples: KnowledgeTriple[];
  used_rules: string[];
  inference_depth: number;
  total_inferred: number;
}

// ==================== V43.0 AC-15: 智能推荐类型 ====================

export interface SimilarEntity {
  entity_id: string;
  entity_type: string;
  entity_name: string;
  similarity: number;
  similarity_reasons: string[];
  shared_attributes: string[];
}

export interface AssociationRecommendation {
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

export interface SimilarEntityQueryParams {
  entity_id: string;
  entity_type?: string;
  top_k?: number;
  min_similarity?: number;
}

export interface AssociationQueryParams {
  entity_id: string;
  relation_type?: string;
  top_k?: number;
  min_confidence?: number;
}

export interface CompletionQueryParams {
  entity_id: string;
  field_name?: string;
  top_k?: number;
  min_confidence?: number;
}

// ==================== V43.0 AC-15: 主数据图谱 API 方法 ====================

const masterDataGraphApi = {
  async getMasterDataGraph(params?: GraphQueryParams): Promise<ApiResponse<MasterDataGraph>> {
    return apiClient.erp.get<MasterDataGraph>('/master-data/graph', { params });
  },

  async getGraphNode(nodeId: string): Promise<ApiResponse<GraphNode>> {
    return apiClient.erp.get<GraphNode>(`/master-data/graph/nodes/${nodeId}`);
  },

  async getNodeNeighbors(
    nodeId: string,
    params?: NeighborQueryParams
  ): Promise<ApiResponse<GraphNode[]>> {
    return apiClient.erp.get<GraphNode[]>(`/master-data/graph/nodes/${nodeId}/neighbors`, {
      params,
    });
  },

  async getShortestPath(params: ShortestPathParams): Promise<ApiResponse<string[]>> {
    return apiClient.erp.get<string[]>('/master-data/graph/shortest-path', {
      params,
    });
  },

  async multiHopTraversal(
    nodeId: string,
    params?: MultiHopQueryParams
  ): Promise<ApiResponse<[string, number][]>> {
    return apiClient.erp.get<[string, number][]>(`/master-data/graph/nodes/${nodeId}/multi-hop`, {
      params,
    });
  },

  async getGraphStats(): Promise<ApiResponse<GraphStats>> {
    return apiClient.erp.get<GraphStats>('/master-data/graph/stats');
  },
};

// ==================== V43.0 AC-15: 知识图谱 API 方法 ====================

const knowledgeGraphApi = {
  async listConcepts(
    params?: ConceptQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Concept>>> {
    return apiClient.erp.get<PaginatedResponse<Concept>>('/master-data/knowledge/concepts', {
      params,
    });
  },

  async getConcept(conceptId: string): Promise<ApiResponse<Concept>> {
    return apiClient.erp.get<Concept>(`/master-data/knowledge/concepts/${conceptId}`);
  },

  async listTriples(
    params?: TripleQueryParams
  ): Promise<ApiResponse<PaginatedResponse<KnowledgeTriple>>> {
    return apiClient.erp.get<PaginatedResponse<KnowledgeTriple>>('/master-data/knowledge/triples', {
      params,
    });
  },

  async listInferenceRules(): Promise<ApiResponse<InferenceRule[]>> {
    return apiClient.erp.get<InferenceRule[]>('/master-data/knowledge/inference-rules');
  },

  async runInference(data: InferenceRequest): Promise<ApiResponse<InferenceResult>> {
    return apiClient.erp.post<InferenceResult>('/master-data/knowledge/inference', data);
  },
};

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

export interface MasterDataEntity {
  id: string;
  code: string;
  name: string;
  domain: string;
  status: string;
  source_service: string;
  created_at: string;
  updated_at: string;
  properties: Record<string, unknown>;
}

export interface MasterDataEdge {
  node: MasterDataEntity;
  cursor: string;
}

export interface PageInfo {
  has_next_page: boolean;
  has_previous_page: boolean;
  start_cursor?: string;
  end_cursor?: string;
}

export interface MasterDataConnection {
  total_count: number;
  page_info: PageInfo;
  edges: MasterDataEdge[];
}

export interface QualityInfo {
  score: number;
  issues_count: number;
  last_check_at: string;
}

export interface LineageInfo {
  upstream_count: number;
  downstream_count: number;
  lineage_depth: number;
}

export interface GraphInfo {
  degree: number;
  centrality: number;
  community_id: string;
}

export interface GraphqlRequest {
  query: string;
  variables?: Record<string, unknown>;
  operation_name?: string;
}

export interface GraphqlResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

export interface MdmStats {
  total_entities: number;
  by_domain: Record<string, number>;
  avg_quality_score: number;
  active_services: number;
  sync_jobs_today: number;
  data_quality_trend: number[];
}

// ==================== V44.0 AC-16: MDM GraphQL API 方法 ====================

const mdmGraphqlApi = {
  async execute<T = unknown>(req: GraphqlRequest): Promise<ApiResponse<GraphqlResponse<T>>> {
    return apiClient.erp.post<GraphqlResponse<T>>('/master-data/graphql', req);
  },

  async getMasterData(params: {
    domain?: string;
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<GraphqlResponse<{ masterData: MasterDataConnection }>>> {
    return apiClient.erp.post<GraphqlResponse<{ masterData: MasterDataConnection }>>(
      '/master-data/graphql',
      {
        query: `
          query MasterData($domain: String, $status: String, $search: String, $page: Int, $page_size: Int) {
            masterData(domain: $domain, status: $status, search: $search, page: $page, page_size: $page_size) {
              total_count
              page_info { has_next_page has_previous_page start_cursor end_cursor }
              edges { cursor node { id code name domain status source_service created_at updated_at properties } }
            }
          }
        `,
        variables: params,
      }
    );
  },

  async getMasterDataById(
    id: string
  ): Promise<ApiResponse<GraphqlResponse<{ masterDataById: MasterDataEntity }>>> {
    return apiClient.erp.post<GraphqlResponse<{ masterDataById: MasterDataEntity }>>(
      '/master-data/graphql',
      {
        query: `query MasterDataById($id: ID!) { masterDataById(id: $id) { id code name domain status source_service created_at updated_at properties } }`,
        variables: { id },
      }
    );
  },

  async getMdmStats(): Promise<ApiResponse<GraphqlResponse<{ mdmStats: MdmStats }>>> {
    return apiClient.erp.post<GraphqlResponse<{ mdmStats: MdmStats }>>('/master-data/graphql', {
      query: `{ mdmStats { total_entities by_domain avg_quality_score active_services sync_jobs_today data_quality_trend } }`,
    });
  },
};

// ==================== V44.0 AC-16: 同步编排引擎 V2 类型 ====================

export type SyncJobPriority = 'high' | 'normal' | 'low';

export interface SyncJobV2 {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  status: string;
  source_system: string;
  target_systems: string[];
  priority: SyncJobPriority;
  tags: string[];
  scheduled_at?: string;
  retries_exhausted: boolean;
  dead_letter_reason?: string;
  current_step: number;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface TenantSyncStats {
  total_jobs: number;
  successful: number;
  failed: number;
  in_progress: number;
  pending: number;
  dead_letter_count: number;
}

export interface SyncEngineStatsV2 {
  total_jobs: number;
  by_priority: Record<string, number>;
  by_status: Record<string, number>;
  by_tenant: Record<string, TenantSyncStats>;
  dead_letter_count: number;
  avg_processing_time_ms: number;
  queue_size: number;
}

export interface DeadLetterV2 {
  id: string;
  job_id: string;
  tenant_id: string;
  entity_type: string;
  operation: string;
  error_message: string;
  retry_count: number;
  last_retry_at?: string;
  retryable: boolean;
  category: string;
  created_at: string;
  payload?: Record<string, unknown>;
}

export interface CreateSyncJobV2Request {
  tenant_id?: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  source_system: string;
  target_systems: string[];
  priority?: SyncJobPriority;
  tags?: string[];
  scheduled_at?: string;
  max_retries?: number;
}

export interface ListSyncJobsV2Params {
  tenant_id?: string;
  status?: string;
  priority?: string;
  entity_type?: string;
  tag?: string;
  page?: number;
  page_size?: number;
}

export interface BatchRetryDeadLettersRequest {
  ids: string[];
  category?: string;
}

// ==================== V44.0 AC-16: 同步编排引擎 V2 API 方法 ====================

const syncEngineV2Api = {
  async createSyncJob(data: CreateSyncJobV2Request): Promise<ApiResponse<SyncJobV2>> {
    return apiClient.erp.post<SyncJobV2>('/master-data/sync/v2/jobs', data);
  },

  async getSyncJob(id: string): Promise<ApiResponse<SyncJobV2>> {
    return apiClient.erp.get<SyncJobV2>(`/master-data/sync/v2/jobs/${id}`);
  },

  async listSyncJobs(
    params?: ListSyncJobsV2Params
  ): Promise<ApiResponse<PaginatedResponse<SyncJobV2>>> {
    return apiClient.erp.get<PaginatedResponse<SyncJobV2>>('/master-data/sync/v2/jobs', { params });
  },

  async retryDeadLetter(id: string): Promise<ApiResponse<SyncJobV2>> {
    return apiClient.erp.post<SyncJobV2>(`/master-data/sync/v2/dead-letters/${id}/retry`);
  },

  async batchRetryDeadLetters(
    data: BatchRetryDeadLettersRequest
  ): Promise<ApiResponse<{ retried_count: number; requested_count: number; category?: string }>> {
    return apiClient.erp.post('/master-data/sync/v2/dead-letters/batch-retry', data);
  },

  async getStats(): Promise<ApiResponse<SyncEngineStatsV2>> {
    return apiClient.erp.get<SyncEngineStatsV2>('/master-data/sync/v2/stats');
  },
};

// ==================== V44.0 AC-16: MDM 服务注册与健康检查类型 ====================

export interface MdmServiceInfo {
  service_id: string;
  service_name: string;
  endpoint: string;
  domains: string[];
  status: string;
  last_heartbeat: string;
  capabilities: string[];
}

export interface MdmServiceRegisterRequest {
  service_id?: string;
  service_name: string;
  endpoint: string;
  domains: string[];
  capabilities?: string[];
}

export interface MdmServiceQueryParams {
  status?: string;
  domain?: string;
}

// ==================== V44.0 AC-16: MDM 服务注册 API 方法 ====================

const mdmServiceApi = {
  async register(data: MdmServiceRegisterRequest): Promise<ApiResponse<MdmServiceInfo>> {
    return apiClient.erp.post<MdmServiceInfo>('/master-data/services/register', data);
  },

  async deregister(
    serviceId: string
  ): Promise<ApiResponse<{ service_id: string; deregistered: boolean }>> {
    return apiClient.erp.post(`/master-data/services/${serviceId}/deregister`);
  },

  async heartbeat(serviceId: string): Promise<ApiResponse<MdmServiceInfo>> {
    return apiClient.erp.post<MdmServiceInfo>(`/master-data/services/${serviceId}/heartbeat`);
  },

  async list(params?: MdmServiceQueryParams): Promise<ApiResponse<MdmServiceInfo[]>> {
    return apiClient.erp.get<MdmServiceInfo[]>('/master-data/services', { params });
  },

  async getHealth(serviceId: string): Promise<ApiResponse<MdmServiceInfo>> {
    return apiClient.erp.get<MdmServiceInfo>(`/master-data/services/${serviceId}/health`);
  },
};

// ==================== V44.0 AC-16: MDM API 网关层类型 ====================

export interface GatewayApiRequest {
  path: string;
  method: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface GatewayApiResponse {
  status: number;
  body?: Record<string, unknown>;
  headers: Record<string, string>;
  latency_ms: number;
}

export interface GatewayBatchRequest {
  requests: GatewayApiRequest[];
}

export interface GatewayAggregateRequest {
  entities: string[];
  fields?: string[];
}

export interface GatewayRoute {
  path: string;
  target_service: string;
  methods: string[];
  transformations: string[];
  rate_limit: number;
}

export interface GatewayStats {
  total_requests: number;
  error_count: number;
  error_rate: number;
  avg_latency_ms: number;
  routes_count: number;
  routes: GatewayRoute[];
}

// ==================== V44.0 AC-16: MDM API 网关 API 方法 ====================

const mdmGatewayApi = {
  async route(data: GatewayApiRequest): Promise<ApiResponse<GatewayApiResponse>> {
    return apiClient.erp.post<GatewayApiResponse>('/master-data/gateway/route', data);
  },

  async batch(data: GatewayBatchRequest): Promise<ApiResponse<GatewayApiResponse[]>> {
    return apiClient.erp.post<GatewayApiResponse[]>('/master-data/gateway/batch', data);
  },

  async aggregate(data: GatewayAggregateRequest): Promise<ApiResponse<Record<string, unknown>>> {
    return apiClient.erp.post<Record<string, unknown>>('/master-data/gateway/aggregate', data);
  },

  async getStats(): Promise<ApiResponse<GatewayStats>> {
    return apiClient.erp.get<GatewayStats>('/master-data/gateway/stats');
  },
};

// ==================== V45.0 AC-17: 主数据质量 AI 类型 ====================

export type QualityRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface QualityAiScore {
  entity_id: string;
  domain: string;
  overall_score: number;
  completeness_score: number;
  accuracy_score: number;
  consistency_score: number;
  timeliness_score: number;
  uniqueness_score: number;
  validity_score: number;
  risk_level: QualityRiskLevel;
  risk_factors: string[];
  recommendations: string[];
  scored_at: string;
}

export interface QualityAnomaly {
  id: string;
  entity_id: string;
  domain: string;
  anomaly_type: string;
  severity: string;
  description: string;
  detected_value: string;
  expected_range: string;
  confidence: number;
  detected_at: string;
}

export interface QualityPrediction {
  entity_id: string;
  domain: string;
  predicted_quality_trend: 'improving' | 'stable' | 'declining';
  predicted_issues: string[];
  confidence: number;
  factors: string[];
  prediction_date: string;
}

export interface BatchScoreRequest {
  domain?: string;
  entity_ids?: string[];
}

export interface QualityAnomalyQueryParams {
  domain?: string;
  entity_id?: string;
  severity?: string;
  anomaly_type?: string;
  page?: number;
  page_size?: number;
}

export interface PredictQualityParams {
  horizon_days?: number;
}

export interface QualityAiStatsParams {
  domain?: string;
}

export interface QualityAiStats {
  total_entities: number;
  avg_overall_score: number;
  avg_completeness: number;
  avg_accuracy: number;
  avg_consistency: number;
  avg_timeliness: number;
  avg_uniqueness: number;
  avg_validity: number;
  by_risk_level: Record<string, number>;
  anomaly_count: number;
  by_anomaly_type: Record<string, number>;
  bySeverity: Record<string, number>;
}

// ==================== V45.0 AC-17: 质量 AI API 方法 ====================

const qualityAiApi = {
  async scoreEntity(id: string): Promise<ApiResponse<QualityAiScore>> {
    return apiClient.erp.post<QualityAiScore>(`/master-data/quality-ai/score/${id}`);
  },

  async batchScore(data: BatchScoreRequest): Promise<ApiResponse<QualityAiScore[]>> {
    return apiClient.erp.post<QualityAiScore[]>('/master-data/quality-ai/batch-score', data);
  },

  async getAnomalies(
    params?: QualityAnomalyQueryParams
  ): Promise<ApiResponse<PaginatedResponse<QualityAnomaly>>> {
    return apiClient.erp.get<PaginatedResponse<QualityAnomaly>>(
      '/master-data/quality-ai/anomalies',
      { params }
    );
  },

  async predictQuality(
    id: string,
    params?: PredictQualityParams
  ): Promise<ApiResponse<QualityPrediction>> {
    return apiClient.erp.post<QualityPrediction>(
      `/master-data/quality-ai/predict/${id}`,
      {},
      { params }
    );
  },

  async getStats(params?: QualityAiStatsParams): Promise<ApiResponse<QualityAiStats>> {
    return apiClient.erp.get<QualityAiStats>('/master-data/quality-ai/stats', { params });
  },
};

// ==================== V45.0 AC-17: 智能匹配类型 ====================

export type MatchType = 'exact' | 'fuzzy' | 'phonetic' | 'abbreviation' | 'synonym' | 'partial';

export interface MatchField {
  field_name: string;
  source_value: string;
  target_value: string;
  similarity: number;
  match_type: MatchType;
}

export interface MatchResult {
  source_id: string;
  target_id: string;
  target_name: string;
  match_score: number;
  match_fields: MatchField[];
  match_details: string;
  confidence: number;
  recommendation: 'merge' | 'review' | 'skip';
}

export interface DuplicateGroup {
  group_id: string;
  domain: string;
  entities: string[];
  confidence: number;
  primary_entity_id: string;
  merge_recommendation: 'auto_merge' | 'manual_review' | 'no_action';
}

export interface FindMatchesRequest {
  domain?: string;
  threshold?: number;
  limit?: number;
}

export interface FindDuplicatesParams {
  domain?: string;
  min_confidence?: number;
  page?: number;
  page_size?: number;
}

export interface DuplicateGroupsParams {
  domain?: string;
}

export interface SuggestMergeRequest {
  group_id: string;
  primary_entity_id?: string;
}

export interface MergeSuggestion {
  group_id: string;
  domain: string;
  primary_entity_id: string;
  entities_to_merge: string[];
  merge_strategy: string;
  confidence: number;
  steps: string[];
  estimated_fields_to_resolve: number;
}

// ==================== V45.0 AC-17: 智能匹配 API 方法 ====================

const smartMatcherApi = {
  async findMatches(id: string, data: FindMatchesRequest): Promise<ApiResponse<MatchResult[]>> {
    return apiClient.erp.post<MatchResult[]>(`/master-data/matching/find-matches/${id}`, data);
  },

  async findDuplicates(
    params?: FindDuplicatesParams
  ): Promise<ApiResponse<PaginatedResponse<MatchResult>>> {
    return apiClient.erp.get<PaginatedResponse<MatchResult>>('/master-data/matching/duplicates', {
      params,
    });
  },

  async getDuplicateGroups(params?: DuplicateGroupsParams): Promise<ApiResponse<DuplicateGroup[]>> {
    return apiClient.erp.get<DuplicateGroup[]>('/master-data/matching/duplicate-groups', {
      params,
    });
  },

  async suggestMerge(data: SuggestMergeRequest): Promise<ApiResponse<MergeSuggestion>> {
    return apiClient.erp.post<MergeSuggestion>('/master-data/matching/suggest-merge', data);
  },
};

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

export interface ClassificationRule {
  id: string;
  name: string;
  domain: string;
  conditions: string[];
  category_id: string;
  priority: number;
  confidence: number;
  enabled: boolean;
  learned: boolean;
}

export interface ClassificationModel {
  categories: Category[];
  rules: ClassificationRule[];
  accuracy: number;
  trained_at: string;
  training_samples: number;
}

export interface BatchClassifyRequest {
  domain?: string;
  entity_ids?: string[];
}

export interface ListCategoriesParams {
  domain?: string;
  parentId?: string;
}

export interface LearnRuleRequest {
  name: string;
  domain: string;
  conditions: string[];
  category_id: string;
  priority?: number;
  confidence?: number;
}

export interface ClassificationStatsParams {
  domain?: string;
}

export interface ClassificationStats {
  total_categories: number;
  total_rules: number;
  learned_rules: number;
  classified_entities: number;
  by_category: Record<string, number>;
  model: ClassificationModel;
}

export interface SuggestTagsResult {
  entity_id: string;
  domain: string;
  tags: string[];
  tag_count: number;
}

// ==================== V45.0 AC-17: 自动分类 API 方法 ====================

const autoClassifierApi = {
  async classifyEntity(id: string): Promise<ApiResponse<ClassificationResult>> {
    return apiClient.erp.post<ClassificationResult>(`/master-data/classification/classify/${id}`);
  },

  async batchClassify(data: BatchClassifyRequest): Promise<ApiResponse<ClassificationResult[]>> {
    return apiClient.erp.post<ClassificationResult[]>(
      '/master-data/classification/batch-classify',
      data
    );
  },

  async suggestTags(id: string): Promise<ApiResponse<SuggestTagsResult>> {
    return apiClient.erp.get<SuggestTagsResult>(`/master-data/classification/suggest-tags/${id}`);
  },

  async listCategories(params?: ListCategoriesParams): Promise<ApiResponse<Category[]>> {
    return apiClient.erp.get<Category[]>('/master-data/classification/categories', { params });
  },

  async learnRule(data: LearnRuleRequest): Promise<ApiResponse<ClassificationRule>> {
    return apiClient.erp.post<ClassificationRule>('/master-data/classification/learn-rule', data);
  },

  async getStats(params?: ClassificationStatsParams): Promise<ApiResponse<ClassificationStats>> {
    return apiClient.erp.get<ClassificationStats>('/master-data/classification/stats', {
      params,
    });
  },
};
