import apiClient from '../client';
import type { ApiResponse } from '../client';

interface MaturityDimension {
  name: string;
  score: number;
  weight: number;
  details?: string;
}

interface MaturityAssessment {
  id: string;
  overall_score: number;
  level: 'initial' | 'managed' | 'defined' | 'quantitatively_managed' | 'optimized';
  dimensions: MaturityDimension[];
  assessed_at: string;
  assessed_by?: string;
}

interface ImprovementPlan {
  id: string;
  title: string;
  description?: string;
  dimension: string;
  target_score: number;
  current_score: number;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  tasks?: string[];
  created_at?: string;
}

interface GovernanceWorkflow {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  steps: Array<{
    id: string;
    name: string;
    type: 'review' | 'approval' | 'notification' | 'automation';
    order: number;
    assignee?: string;
    config?: Record<string, unknown>;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface DataProduct {
  id: string;
  name: string;
  description?: string;
  owner: string;
  domain: string;
  status: 'proposed' | 'active' | 'deprecated' | 'retired';
  contract?: DataContract;
  consumers?: string[];
  created_at?: string;
  updated_at?: string;
}

interface DataContract {
  id: string;
  version: string;
  schema: Record<string, unknown>;
  sla_terms?: Record<string, unknown>;
  data_quality_requirements?: string[];
  status: 'draft' | 'active' | 'expired';
  updated_at?: string;
}

export const governanceApi = {
  // ==================== 治理成熟度 ====================

  assessMaturity: async (data?: {
    dimensions?: string[];
    scope?: string;
  }): Promise<ApiResponse<MaturityAssessment>> => {
    return apiClient.master.post('/mdm-v58/maturity/assess', data || {});
  },

  getAssessment: async (id: string): Promise<ApiResponse<MaturityAssessment>> => {
    return apiClient.master.get(`/mdm-v58/maturity/assessment`);
  },

  getDimensionScores: async (): Promise<ApiResponse<MaturityDimension[]>> => {
    return apiClient.master.get('/mdm-v58/maturity/scores');
  },

  createImprovementPlan: async (
    data: Omit<ImprovementPlan, 'id'>
  ): Promise<ApiResponse<ImprovementPlan>> => {
    return apiClient.master.post('/mdm-v58/maturity/improvement-plan', data);
  },

  trackProgress: async (params?: {
    dimension?: string;
  }): Promise<
    ApiResponse<{
      current_score: number;
      target_score: number;
      progress_percentage: number;
      milestones: Array<{ date: string; score: number }>;
    }>
  > => {
    return apiClient.master.get('/mdm-v58/maturity/progress', { params });
  },

  getMaturityHistory: async (params?: {
    dimension?: string;
    limit?: number;
  }): Promise<ApiResponse<MaturityAssessment[]>> => {
    return apiClient.master.get('/mdm-v58/maturity/history', { params });
  },

  getBenchmark: async (data: {
    dimension?: string;
    industry?: string;
  }): Promise<
    ApiResponse<{
      benchmarks: Array<{ dimension: string; percentile: number; score: number }>;
    }>
  > => {
    return apiClient.master.get('/mdm-v58/maturity/benchmark', {
      params: data as unknown as Record<string, string>,
    });
  },

  // ==================== 自动化工作流 ====================

  createWorkflow: async (
    data: Omit<GovernanceWorkflow, 'id'>
  ): Promise<ApiResponse<GovernanceWorkflow>> => {
    return apiClient.master.post('/mdm-v58/workflow', data);
  },

  startWorkflow: async (id: string): Promise<ApiResponse<{ run_id: string; status: string }>> => {
    return apiClient.master.post(`/mdm-v58/workflow/${id}/start`, {});
  },

  advanceStep: async (
    id: string,
    data: {
      step_id: string;
      action: 'approve' | 'reject' | 'skip' | 'complete';
      comment?: string;
    }
  ): Promise<ApiResponse<GovernanceWorkflow>> => {
    return apiClient.master.post(`/mdm-v58/workflow/${id}/advance`, data);
  },

  getWorkflowStatus: async (
    id: string
  ): Promise<
    ApiResponse<{
      status: string;
      current_step?: string;
      completed_steps: string[];
      pending_steps: string[];
    }>
  > => {
    return apiClient.master.get(`/mdm-v58/workflow/${id}/status`);
  },

  listWorkflows: async (params?: {
    status?: string;
    type?: string;
  }): Promise<ApiResponse<GovernanceWorkflow[]>> => {
    return apiClient.master.get('/mdm-v58/workflows', { params });
  },

  getWorkflowTemplates: async (): Promise<
    ApiResponse<
      Array<{
        id: string;
        name: string;
        description?: string;
        category: string;
        steps_count: number;
      }>
    >
  > => {
    return apiClient.master.get('/mdm-v58/workflow/templates');
  },

  approveStep: async (id: string, data?: { comment?: string }): Promise<ApiResponse<void>> => {
    return apiClient.master.post(`/mdm-v58/workflow/step/${id}/approve`, data || {});
  },

  rejectStep: async (id: string, data?: { reason?: string }): Promise<ApiResponse<void>> => {
    return apiClient.master.post(`/mdm-v58/workflow/step/${id}/reject`, data || {});
  },

  // ==================== 数据产品化 ====================

  createDataProduct: async (data: Omit<DataProduct, 'id'>): Promise<ApiResponse<DataProduct>> => {
    return apiClient.master.post('/mdm-v58/data-product', data);
  },

  getDataProduct: async (id: string): Promise<ApiResponse<DataProduct>> => {
    return apiClient.master.get(`/mdm-v58/data-product/${id}`);
  },

  listDataProducts: async (params?: {
    domain?: string;
    status?: string;
  }): Promise<ApiResponse<DataProduct[]>> => {
    return apiClient.master.get('/mdm-v58/data-products', { params });
  },

  updateContract: async (
    id: string,
    data: Partial<DataContract>
  ): Promise<ApiResponse<DataContract>> => {
    return apiClient.master.put(`/mdm-v58/data-product/${id}/contract`, data);
  },

  getContractStatus: async (
    id: string
  ): Promise<
    ApiResponse<{
      contract_id: string;
      version: string;
      status: string;
      sla_compliance: number;
      data_quality_score: number;
    }>
  > => {
    return apiClient.master.get(`/mdm-v58/data-product/${id}/contract/status`);
  },

  exposeAsApi: async (
    id: string,
    data: {
      endpoint: string;
      authentication: string;
      rate_limit?: number;
    }
  ): Promise<ApiResponse<{ api_id: string; url: string }>> => {
    return apiClient.master.post(`/mdm-v58/data-product/${id}/expose`, data);
  },

  getConsumers: async (
    id: string
  ): Promise<
    ApiResponse<
      Array<{
        id: string;
        name: string;
        since: string;
        usage_count: number;
      }>
    >
  > => {
    return apiClient.master.get(`/mdm-v58/data-product/${id}/consumers`);
  },

  getProductLineage: async (
    id: string
  ): Promise<
    ApiResponse<{
      upstream_sources: Array<{ entity_type: string; entity_id: string }>;
      downstream_consumers: Array<{ entity_type: string; entity_id: string }>;
    }>
  > => {
    return apiClient.master.get(`/mdm-v58/data-product/${id}/lineage`);
  },
};

export default governanceApi;
