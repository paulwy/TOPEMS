import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  QualityImprovement,
  CorrectiveActionBackend,
  ActionItem,
  ActionItemBackend,
} from './types';
import { adaptActionToFrontend, adaptActionItemToFrontend } from './adapters';

// ============================================================================
// 整改措施（Corrective Action）后端真实形状
// 与 svc/qms/src/modules/corrective_action.rs 及 models/corrective_action.rs 对齐。
// target_date / completed_at 在 DB 为 text，按 Option<String> 传输，避免时间戳类型错配。
// ============================================================================
export interface CorrectiveActionRecord {
  id: string;
  tenant_id?: string | null;
  action_no: string;
  issue_id?: string | null;
  title: string;
  description?: string | null;
  root_cause?: string | null;
  action_type?: string | null;
  status?: string | null;
  priority?: string | null;
  assignee?: string | null;
  target_date?: string | null;
  completed_at?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CorrectiveActionListItem {
  item_name: string;
  responsible?: string;
  due_date?: string;
  remark?: string;
}

export interface CreateCorrectiveActionPayload {
  issue_id?: string;
  title: string;
  description?: string;
  root_cause?: string;
  action_type?: string;
  priority?: string;
  assignee?: string;
  target_date?: string;
  created_by?: string;
  items?: CorrectiveActionListItem[];
}

export interface UpdateCorrectiveActionPayload {
  title?: string;
  description?: string;
  root_cause?: string;
  action_type?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  target_date?: string;
}

export interface CorrectiveActionListParams {
  page?: number;
  page_size?: number;
  status?: string;
  priority?: string;
  issue_id?: string;
  search?: string;
}

export interface CorrectiveActionListData {
  actions: CorrectiveActionRecord[];
  total: number;
  page: number;
  page_size: number;
}

export const correctiveActionApi = {
  /** GET /actions —— 服务端分页 */
  list: async (
    params: CorrectiveActionListParams = {}
  ): Promise<ApiResponse<CorrectiveActionListData>> => {
    const query: Record<string, string | number> = {};
    if (params.page != null) query.page = params.page;
    if (params.page_size != null) query.page_size = params.page_size;
    if (params.status) query.status = params.status;
    if (params.priority) query.priority = params.priority;
    if (params.issue_id) query.issue_id = params.issue_id;
    if (params.search) query.search = params.search;
    return apiClient.qms.get<CorrectiveActionListData>('/actions', { params: query });
  },

  /** GET /actions/{id} */
  get: async (id: string): Promise<ApiResponse<CorrectiveActionRecord>> =>
    apiClient.qms.get<CorrectiveActionRecord>(`/actions/${id}`),

  /** POST /actions —— 标题必填，后端空标题返回 400 */
  create: async (
    data: CreateCorrectiveActionPayload
  ): Promise<ApiResponse<CorrectiveActionRecord>> =>
    apiClient.qms.post<CorrectiveActionRecord>('/actions', data),

  /** PUT /actions/{id} */
  update: async (
    id: string,
    data: UpdateCorrectiveActionPayload
  ): Promise<ApiResponse<CorrectiveActionRecord>> =>
    apiClient.qms.put<CorrectiveActionRecord>(`/actions/${id}`, data),

  /** DELETE /actions/{id} —— 软删除 deleted_at */
  delete: async (id: string): Promise<ApiResponse<boolean>> =>
    apiClient.qms.delete<boolean>(`/actions/${id}`),

  /**
   * POST /actions/{id}/complete —— 后端无请求体，仅置 status=completed、completed_at=NOW()。
   * 保留旧签名以兼容既有调用，verification_result/verified_by/remark 后端不接收。
   */
  completeAction: async (
    id: string,
    _data?: { verificationResult?: string; verifiedBy?: string; remark?: string }
  ): Promise<ApiResponse<QualityImprovement | undefined>> => {
    const response = await apiClient.qms.post<CorrectiveActionBackend>(`/actions/${id}/complete`);
    return {
      ...response,
      data: response.data ? adaptActionToFrontend(response.data) : ({} as QualityImprovement),
    };
  },

  getActionItems: async (actionId: string): Promise<ApiResponse<ActionItem[]>> => {
    const response = await apiClient.qms.get<{ items?: ActionItemBackend[] }>(
      `/actions/${actionId}/items`
    );
    const adaptedData = (response.data?.items || []).map(adaptActionItemToFrontend);
    return { ...response, data: adaptedData };
  },
};
