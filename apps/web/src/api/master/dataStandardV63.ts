import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

type StandardType = 'coding' | 'naming' | 'classification' | 'unit' | 'data_quality';
type StandardStatus = 'active' | 'inactive' | 'draft';
type CategoryNodeType = 'category' | 'subcategory' | 'value';

interface DataStandardV63 {
  id: string;
  name: string;
  code: string;
  type: StandardType;
  description?: string;
  version: string;
  status: StandardStatus;
  owner?: string;
  definitions: Array<{
    field: string;
    rule: string;
    example?: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface CategoryNode {
  id: string;
  code: string;
  name: string;
  type: CategoryNodeType;
  parent_id?: string;
  path?: string[];
  level: number;
  sort_order: number;
  attributes?: Record<string, string>;
  children?: CategoryNode[];
  created_at: string;
  updated_at: string;
}

interface MappingRule {
  id: string;
  source_standard_id: string;
  target_standard_id: string;
  source_value: string;
  target_value: string;
  confidence: number;
  status: 'active' | 'inactive' | 'review';
  created_at: string;
  updated_at: string;
}

interface StandardEvaluation {
  id: string;
  standard_id: string;
  entity_type: string;
  entity_id: string;
  score: number;
  issues: Array<{
    field: string;
    issue: string;
    severity: 'error' | 'warning';
    suggestion?: string;
  }>;
  evaluated_at: string;
  evaluator?: string;
}

interface StandardDashboardV63 {
  total_standards: number;
  by_type: Array<{ type: StandardType; count: number }>;
  active_standards: number;
  deprecated_standards: number;
  total_categories: number;
  total_mappings: number;
  compliance_rate: number;
  violations_30d: number;
}

// ============ Request Types ============

export interface CreateStandardRequest {
  name: string;
  code: string;
  type: StandardType;
  description?: string;
  definitions: Array<{
    field: string;
    rule: string;
    example?: string;
  }>;
}

export interface UpdateStandardRequest {
  name?: string;
  description?: string;
  definitions?: Array<{
    field: string;
    rule: string;
    example?: string;
  }>;
  status?: StandardStatus;
}

export interface CreateCategoryRequest {
  code: string;
  name: string;
  type: CategoryNodeType;
  parent_id?: string;
  attributes?: Record<string, string>;
}

interface AddMappingRequest {
  source_standard_id: string;
  target_standard_id: string;
  source_value: string;
  target_value: string;
  confidence?: number;
}

interface EvaluateRequest {
  entity_type: string;
  entity_id: string;
  standard_ids?: string[];
}

// ============ API ============

export const dataStandardApiV63 = {
  // ===== 标准管理 =====
  async createStandard(data: CreateStandardRequest): Promise<ApiResponse<DataStandardV63>> {
    return apiClient.master.post<DataStandardV63>('/mdm-v63/standards', data);
  },

  async getStandard(id: string): Promise<ApiResponse<DataStandardV63>> {
    return apiClient.master.get<DataStandardV63>(`/mdm-v63/standards/${id}`);
  },

  async listStandards(params?: {
    type?: StandardType;
    status?: StandardStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: DataStandardV63[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: DataStandardV63[]; total: number }>(
      `/mdm-v63/standards${s ? `?${s}` : ''}`
    );
  },

  async updateStandard(
    id: string,
    data: UpdateStandardRequest
  ): Promise<ApiResponse<DataStandardV63>> {
    return apiClient.master.put<DataStandardV63>(`/mdm-v63/standards/${id}`, data);
  },

  async deleteStandard(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v63/standards/${id}`);
  },

  async getStandardByCode(code: string): Promise<ApiResponse<DataStandardV63>> {
    return apiClient.master.get<DataStandardV63>(`/mdm-v63/standards/code/${code}`);
  },

  // ===== 分类体系 =====
  async createCategory(data: CreateCategoryRequest): Promise<ApiResponse<CategoryNode>> {
    return apiClient.master.post<CategoryNode>('/mdm-v63/categories', data);
  },

  async getCategory(id: string): Promise<ApiResponse<CategoryNode>> {
    return apiClient.master.get<CategoryNode>(`/mdm-v63/categories/${id}`);
  },

  async listCategoryChildren(parentId?: string): Promise<ApiResponse<CategoryNode[]>> {
    const qs = new URLSearchParams();
    if (parentId) qs.set('parent_id', parentId);
    const s = qs.toString();
    return apiClient.master.get<CategoryNode[]>(`/mdm-v63/categories${s ? `?${s}` : ''}`);
  },

  async getCategoryTree(rootId?: string): Promise<ApiResponse<CategoryNode>> {
    const qs = new URLSearchParams();
    if (rootId) qs.set('root_id', rootId);
    const s = qs.toString();
    return apiClient.master.get<CategoryNode>(`/mdm-v63/categories/tree${s ? `?${s}` : ''}`);
  },

  async updateCategory(
    id: string,
    data: Partial<CreateCategoryRequest>
  ): Promise<ApiResponse<CategoryNode>> {
    return apiClient.master.put<CategoryNode>(`/mdm-v63/categories/${id}`, data);
  },

  async deleteCategory(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v63/categories/${id}`);
  },

  async searchCategories(
    query: string,
    params?: { type?: CategoryNodeType; limit?: number }
  ): Promise<ApiResponse<CategoryNode[]>> {
    const qs = new URLSearchParams({ q: query });
    if (params?.type) qs.set('type', params.type);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    return apiClient.master.get<CategoryNode[]>(`/mdm-v63/categories/search?${qs.toString()}`);
  },

  // ===== 映射规则 =====
  async addMapping(data: AddMappingRequest): Promise<ApiResponse<MappingRule>> {
    return apiClient.master.post<MappingRule>('/mdm-v63/mappings', data);
  },

  async listMappings(
    sourceStandardId?: string,
    targetStandardId?: string
  ): Promise<ApiResponse<MappingRule[]>> {
    const qs = new URLSearchParams();
    if (sourceStandardId) qs.set('source', sourceStandardId);
    if (targetStandardId) qs.set('target', targetStandardId);
    const s = qs.toString();
    return apiClient.master.get<MappingRule[]>(`/mdm-v63/mappings${s ? `?${s}` : ''}`);
  },

  async deleteMapping(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v63/mappings/${id}`);
  },

  // ===== 标准评估 =====
  async evaluateCompliance(data: EvaluateRequest): Promise<ApiResponse<StandardEvaluation[]>> {
    return apiClient.master.post<StandardEvaluation[]>('/mdm-v63/evaluate', data);
  },

  async getEvaluation(id: string): Promise<ApiResponse<StandardEvaluation>> {
    return apiClient.master.get<StandardEvaluation>(`/mdm-v63/evaluations/${id}`);
  },

  async listEntityEvaluations(
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<StandardEvaluation[]>> {
    return apiClient.master.get<StandardEvaluation[]>(
      `/mdm-v63/entities/${entityType}/${entityId}/evaluations`
    );
  },

  async getDashboard(): Promise<ApiResponse<StandardDashboardV63>> {
    return apiClient.master.get<StandardDashboardV63>('/mdm-v63/dashboard');
  },
};

export default dataStandardApiV63;
