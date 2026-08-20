import apiClient from '../client';
import type { ApiResponse, PaginationParams as BasePaginationParams } from '../client';
import type { SelectOption } from '@topems/shared-types';

import { templateVersionApi } from './version';
import type {
  TemplateVersion,
  CreateVersionRequest,
  UpdateVersionRequest,
  VersionDiff,
  VersionCompareRequest,
  VersionHistoryEntry,
} from './version';

import { templateApprovalApi } from './approval';
import type {
  ApprovalStatus as TemplateApprovalStatus,
  ApprovalType,
  ApprovalRequest,
  CreateApprovalRequest,
  ApproveRequest,
  RejectRequest,
} from './approval';

import { templateAssignmentApi } from './assignment';
import type {
  AssignmentScope,
  AssignmentStatus,
  TemplateAssignment,
  CreateAssignmentRequest,
  UsageStats,
  TopTemplate,
  TemplateDependency,
  CloneTemplateRequest,
} from './assignment';

export type TemplateType = 'workflow' | 'document' | 'form' | 'report' | 'notification';

type VariableType =
  'string' | 'number' | 'date' | 'select' | 'multiselect' | 'lookup' | 'user' | 'now' | 'context';

export interface TemplateVariable {
  key: string;
  label: string;
  type: VariableType;
  required?: boolean;
  default_value?: unknown;
  options?: SelectOption[];
  data_source?: string;
  validation_rules?: Record<string, unknown>;
  placeholder?: string;
  description?: string;
}

export interface Template {
  id: string;
  name: string;
  code: string;
  template_type: TemplateType;
  category_id?: string;
  category_name?: string;
  module?: string;
  description?: string;
  content: string;
  variables: TemplateVariable[];
  isactive: boolean;
  is_system: boolean;
  is_public: boolean;
  ai_enabled: boolean;
  version: number;
  view_count: number;
  use_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  code: string;
  category_type?: TemplateType;
  icon?: string;
  description?: string;
  template_count: number;
  isactive: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  code: string;
  template_type?: TemplateType;
  category_id?: string;
  module: string;
  description?: string;
  content: string;
  variables?: TemplateVariable[];
  isactive?: boolean;
  is_public?: boolean;
  ai_enabled?: boolean;
  sort_order?: number;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

export interface PaginationParams extends BasePaginationParams {
  type?: TemplateType;
  category?: string;
  module?: string;
  isactive?: boolean;
  is_public?: boolean;
}

interface RenderTemplateRequest {
  variables: Record<string, unknown>;
}

export interface RenderTemplateResponse {
  content: string;
  missing_variables: string[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
}

export const templateApi = {
  // ==================== 核心 CRUD ====================

  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Template>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.module) searchParams.set('module', params.module);
    if (params?.isactive !== undefined) searchParams.set('isactive', String(params.isactive));
    if (params?.is_public !== undefined) searchParams.set('is_public', String(params.is_public));

    const queryString = searchParams.toString();
    return await apiClient.doc.get(`/templates${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Template>> {
    return await apiClient.doc.get(`/templates/${id}`);
  },

  async create(data: CreateTemplateRequest): Promise<ApiResponse<Template>> {
    return await apiClient.doc.post('/templates', data);
  },

  async update(id: string, data: Partial<CreateTemplateRequest>): Promise<ApiResponse<Template>> {
    return await apiClient.doc.put(`/templates/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return await apiClient.doc.delete(`/templates/${id}`);
  },

  async listCategories(
    params?: Pick<PaginationParams, 'isactive' | 'type'>
  ): Promise<ApiResponse<TemplateCategory[]>> {
    const searchParams = new URLSearchParams();
    if (params?.isactive !== undefined) searchParams.set('isactive', String(params.isactive));
    if (params?.type) searchParams.set('type', params.type);

    const queryString = searchParams.toString();
    return await apiClient.doc.get(`/templates/categories${queryString ? `?${queryString}` : ''}`);
  },

  async render(
    id: string,
    variables: Record<string, unknown>
  ): Promise<ApiResponse<RenderTemplateResponse>> {
    return await apiClient.doc.post(`/templates/${id}/render`, {
      variables,
    });
  },

  async duplicate(id: string): Promise<ApiResponse<Template>> {
    return await apiClient.doc.post(`/templates/${id}/duplicate`);
  },

  async toggleStatus(id: string): Promise<ApiResponse<Template>> {
    return await apiClient.doc.put(`/templates/${id}/toggle-status`);
  },

  // ==================== 子域：版本管理 ====================

  versions: templateVersionApi,

  // ==================== 子域：审批流 ====================

  approvals: templateApprovalApi,

  // ==================== 子域：分配与统计 ====================

  assignments: templateAssignmentApi,

  // ==================== 顶层快捷方法 ====================

  // 版本快捷方法
  listVersions: templateVersionApi.listVersions,
  createVersion: templateVersionApi.createVersion,
  activateVersion: templateVersionApi.activateVersion,
  rollbackVersion: templateVersionApi.rollbackVersion,
  getVersionDiff: templateVersionApi.getVersionDiff,

  // 审批快捷方法
  submitForApproval: templateApprovalApi.createApproval,
  listMyPendingApprovals: templateApprovalApi.listMyPending,
  listMySubmittedApprovals: templateApprovalApi.listMySubmitted,

  // 分配快捷方法
  assignToUsers: templateAssignmentApi.createAssignment,
  getUsage: templateAssignmentApi.getTemplateUsage,
  getTopTemplates: templateAssignmentApi.getTopTemplates,
  clone: templateAssignmentApi.cloneTemplate,
  export: templateAssignmentApi.exportTemplate,
  import: templateAssignmentApi.importTemplate,
};

// ==================== 类型导出 ====================

export type {
  TemplateVersion,
  CreateVersionRequest,
  UpdateVersionRequest,
  VersionDiff,
  VersionCompareRequest,
  VersionHistoryEntry,
  TemplateApprovalStatus,
  ApprovalType,
  ApprovalRequest,
  CreateApprovalRequest,
  ApproveRequest,
  RejectRequest,
  AssignmentScope,
  AssignmentStatus,
  TemplateAssignment,
  CreateAssignmentRequest,
  UsageStats,
  TopTemplate,
  TemplateDependency,
  CloneTemplateRequest,
};

export default templateApi;
