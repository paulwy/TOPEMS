import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type MaturityLevel =
  'initial' | 'managed' | 'defined' | 'quantitatively_managed' | 'optimized';
export type WorkflowStatus = 'draft' | 'active' | 'completed' | 'failed' | 'archived';
export type StepStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'skipped';
export type ProductStatus = 'proposed' | 'designing' | 'active' | 'deprecated' | 'retired';

export interface MaturityDimensionScore {
  name: string;
  score: number;
  weight: number;
  level: MaturityLevel;
  details?: string;
}

export interface MaturityAssessmentResult {
  id: string;
  overall_score: number;
  level: MaturityLevel;
  dimensions: MaturityDimensionScore[];
  assessed_at: string;
  assessed_by?: string;
}

export interface MaturityHistoryEntry {
  date: string;
  score: number;
  level: MaturityLevel;
  change: number;
}

export interface BenchmarkComparison {
  dimension: string;
  our_score: number;
  industry_avg: number;
  top_quartile: number;
  gap: number;
}

export interface ImprovementPlan {
  id: string;
  title: string;
  dimension: string;
  target_score: number;
  current_score: number;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  tasks: Array<{ id: string; title: string; status: 'todo' | 'doing' | 'done'; owner?: string }>;
  start_date?: string;
  end_date?: string;
  progress_percentage: number;
}

export interface GovernanceWorkflow {
  id: string;
  name: string;
  trigger_type: 'event' | 'scheduled' | 'manual';
  entity_type: string;
  status: WorkflowStatus;
  steps: Array<{
    id: string;
    name: string;
    status: StepStatus;
    approvers?: string[];
    condition?: string;
    completed_at?: string;
  }>;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  trigger_type: 'event' | 'scheduled' | 'manual';
  entity_type: string;
  steps: Array<{ id: string; name: string; approvers?: string[]; condition?: string }>;
  is_default: boolean;
  created_at: string;
}

export interface DataProduct {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: ProductStatus;
  source_system: string;
  consumers: number;
  contracts_count: number;
  created_at: string;
  updated_at: string;
}

export interface DataContract {
  id: string;
  product_id: string;
  version: string;
  schema: Record<string, unknown>;
  sla_terms?: string;
  status: 'active' | 'draft' | 'deprecated';
  updated_at: string;
}

export interface ProductLineage {
  product_id: string;
  upstream: Array<{ entity_type: string; entity_id: string; role: string }>;
  downstream: Array<{ entity_type: string; entity_id: string; role: string }>;
}

// ============ Request Types ============

export interface AssessMaturityRequest {
  scope?: 'full' | 'domain' | 'entity';
  domain?: string;
  dimensions?: string[];
}

export interface CreateImprovementPlanRequest {
  title: string;
  dimension: string;
  target_score: number;
  tasks?: Array<{ title: string; owner?: string }>;
  start_date?: string;
  end_date?: string;
}

export interface CreateWorkflowRequest {
  name: string;
  trigger_type: 'event' | 'scheduled' | 'manual';
  entity_type: string;
  steps?: Array<{ name: string; approvers?: string[]; condition?: string }>;
}

export interface AdvanceStepRequest {
  action: 'approve' | 'reject' | 'skip';
  comment?: string;
  approver?: string;
}

export interface CreateDataProductRequest {
  name: string;
  description: string;
  owner: string;
  source_system: string;
}

export interface UpdateContractRequest {
  schema?: Record<string, unknown>;
  sla_terms?: string;
  status?: 'active' | 'draft' | 'deprecated';
}

// ============ API ============

export const governanceApiV2 = {
  // ===== 治理成熟度 =====
  async assessMaturity(
    data?: AssessMaturityRequest
  ): Promise<ApiResponse<MaturityAssessmentResult>> {
    return apiClient.master.post<MaturityAssessmentResult>('/mdm-v58/maturity/assess', data || {});
  },

  async getAssessment(): Promise<ApiResponse<MaturityAssessmentResult>> {
    return apiClient.master.get<MaturityAssessmentResult>('/mdm-v58/maturity/assessment');
  },

  async getDimensionScores(): Promise<ApiResponse<MaturityDimensionScore[]>> {
    return apiClient.master.get<MaturityDimensionScore[]>('/mdm-v58/maturity/scores');
  },

  async createImprovementPlan(
    data: CreateImprovementPlanRequest
  ): Promise<ApiResponse<ImprovementPlan>> {
    return apiClient.master.post<ImprovementPlan>('/mdm-v58/maturity/improvement-plan', data);
  },

  async trackProgress(params?: {
    dimension?: string;
    status?: ImprovementPlan['status'];
  }): Promise<ApiResponse<{ items: ImprovementPlan[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.dimension) qs.set('dimension', params.dimension);
    if (params?.status) qs.set('status', params.status);
    const s = qs.toString();
    return apiClient.master.get<{ items: ImprovementPlan[]; total: number }>(
      `/mdm-v58/maturity/progress${s ? `?${s}` : ''}`
    );
  },

  async getMaturityHistory(params?: {
    dimension?: string;
    days?: number;
  }): Promise<ApiResponse<MaturityHistoryEntry[]>> {
    const qs = new URLSearchParams();
    if (params?.dimension) qs.set('dimension', params.dimension);
    if (params?.days !== undefined) qs.set('days', String(params.days));
    const s = qs.toString();
    return apiClient.master.get<MaturityHistoryEntry[]>(
      `/mdm-v58/maturity/history${s ? `?${s}` : ''}`
    );
  },

  async getBenchmark(domain?: string): Promise<ApiResponse<BenchmarkComparison[]>> {
    const qs = new URLSearchParams();
    if (domain) qs.set('domain', domain);
    const s = qs.toString();
    return apiClient.master.get<BenchmarkComparison[]>(
      `/mdm-v58/maturity/benchmark${s ? `?${s}` : ''}`
    );
  },

  // ===== 自动化工作流 =====
  async createWorkflow(data: CreateWorkflowRequest): Promise<ApiResponse<GovernanceWorkflow>> {
    return apiClient.master.post<GovernanceWorkflow>('/mdm-v58/workflow', data);
  },

  async startWorkflow(id: string): Promise<ApiResponse<GovernanceWorkflow>> {
    return apiClient.master.post<GovernanceWorkflow>(`/mdm-v58/workflow/${id}/start`, {});
  },

  async advanceStep(
    id: string,
    stepId: string,
    data: AdvanceStepRequest
  ): Promise<ApiResponse<GovernanceWorkflow>> {
    return apiClient.master.post<GovernanceWorkflow>(`/mdm-v58/workflow/${id}/advance`, {
      step_id: stepId,
      ...data,
    });
  },

  async getWorkflowStatus(id: string): Promise<ApiResponse<GovernanceWorkflow>> {
    return apiClient.master.get<GovernanceWorkflow>(`/mdm-v58/workflow/${id}/status`);
  },

  async listWorkflows(params?: {
    status?: WorkflowStatus;
    entity_type?: string;
  }): Promise<ApiResponse<{ items: GovernanceWorkflow[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    const s = qs.toString();
    return apiClient.master.get<{ items: GovernanceWorkflow[]; total: number }>(
      `/mdm-v58/workflows${s ? `?${s}` : ''}`
    );
  },

  async getWorkflowTemplates(): Promise<ApiResponse<WorkflowTemplate[]>> {
    return apiClient.master.get<WorkflowTemplate[]>('/mdm-v58/workflow/templates');
  },

  async approveStep(
    id: string,
    stepId: string,
    data?: { comment?: string; approver?: string }
  ): Promise<ApiResponse<GovernanceWorkflow>> {
    return apiClient.master.post<GovernanceWorkflow>(
      `/mdm-v58/workflow/step/${stepId}/approve`,
      data || {}
    );
  },

  async rejectStep(
    id: string,
    stepId: string,
    data?: { reason?: string; approver?: string }
  ): Promise<ApiResponse<GovernanceWorkflow>> {
    return apiClient.master.post<GovernanceWorkflow>(
      `/mdm-v58/workflow/step/${stepId}/reject`,
      data || {}
    );
  },

  // ===== 数据产品化 =====
  async createDataProduct(data: CreateDataProductRequest): Promise<ApiResponse<DataProduct>> {
    return apiClient.master.post<DataProduct>('/mdm-v58/data-product', data);
  },

  async getDataProduct(id: string): Promise<ApiResponse<DataProduct>> {
    return apiClient.master.get<DataProduct>(`/mdm-v58/data-product/${id}`);
  },

  async listDataProducts(params?: {
    status?: ProductStatus;
    owner?: string;
  }): Promise<ApiResponse<{ items: DataProduct[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.owner) qs.set('owner', params.owner);
    const s = qs.toString();
    return apiClient.master.get<{ items: DataProduct[]; total: number }>(
      `/mdm-v58/data-products${s ? `?${s}` : ''}`
    );
  },

  async updateContract(
    id: string,
    data: UpdateContractRequest
  ): Promise<ApiResponse<DataContract>> {
    return apiClient.master.put<DataContract>(`/mdm-v58/data-product/${id}/contract`, data);
  },

  async getContractStatus(id: string): Promise<ApiResponse<DataContract>> {
    return apiClient.master.get<DataContract>(`/mdm-v58/data-product/${id}/contract/status`);
  },

  async exposeAsApi(
    id: string,
    data?: { endpoint?: string; auth_type?: string }
  ): Promise<ApiResponse<{ url: string; api_key: string }>> {
    return apiClient.master.post<{ url: string; api_key: string }>(
      `/mdm-v58/data-product/${id}/expose`,
      data || {}
    );
  },

  async getProductConsumers(
    id: string
  ): Promise<ApiResponse<Array<{ consumer: string; since: string; last_accessed_at: string }>>> {
    return apiClient.master.get<
      Array<{ consumer: string; since: string; last_accessed_at: string }>
    >(`/mdm-v58/data-product/${id}/consumers`);
  },

  async getProductLineage(id: string): Promise<ApiResponse<ProductLineage>> {
    return apiClient.master.get<ProductLineage>(`/mdm-v58/data-product/${id}/lineage`);
  },
};

export default governanceApiV2;
