import apiClient from '../client';
import type { ApiResponse } from '../client';

/**
 * unified-core master 模块（/api/core/mdm/*）闭环接口。
 *
 * 权限：读写均沿用 system:read / system:write（仅 admin 角色持有）。
 */

const BASE = '/mdm';

export type MdmApprovalStatus = 'pending' | 'approved' | 'rejected';
export type MdmApprovalAction = 'create' | 'update' | 'delete';

export interface MdmApproval {
  id: string;
  tenant_id: string;
  master_data_id: string;
  domain: string;
  action: MdmApprovalAction | string;
  requested_by: string;
  requested_at: string;
  status: MdmApprovalStatus | string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_comment?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface CreateMdmApprovalPayload {
  master_data_id: string;
  domain: string;
  action: MdmApprovalAction;
  payload?: Record<string, unknown> | null;
}

export interface ReviewMdmApprovalPayload {
  approved: boolean;
  comment?: string;
}

export interface MdmDomainQuality {
  domain: string;
  total: number;
  active: number;
  duplicates: number;
  stale: number;
  inconsistencies: number;
  last_synced?: string | null;
  quality_score: number;
}

export interface MdmQualityReport {
  tenant_id: string;
  generated_at: string;
  overall_score: number;
  total_count: number;
  duplicate_count: number;
  stale_count: number;
  inconsistency_count: number;
  duplicate_rate: number;
  stale_rate: number;
  inconsistency_rate: number;
  by_domain: MdmDomainQuality[];
}

export interface MdmDuplicateRecord {
  domain: string;
  code: string;
  count: number;
  master_data_ids: string[];
}

export interface MdmStaleRecord {
  master_data_id: string;
  domain: string;
  code: string;
  name: string;
  source_service: string;
  last_synced_at: string;
  hours_since_sync: number;
}

export interface MdmReconciliationDetail {
  domain: string;
  source_service: string;
  mdm_count: number;
  /** 自洽检查口径下等于 mdm_count */
  checked_count: number;
  consistent: number;
  inconsistent: number;
  status: string;
}

export interface MdmReconciliationResult {
  tenant_id: string;
  reconciled_at: string;
  domains_checked: string[];
  total_checked: number;
  consistent: number;
  inconsistent: number;
  details: MdmReconciliationDetail[];
}

export interface MdmReconciliationLog {
  id: string;
  tenant_id: string;
  domain: string;
  master_data_id: string;
  issue_type: string;
  description: string;
  detected_at: string;
  resolved: boolean;
  resolved_at?: string | null;
}

interface ReconciliationLogParams {
  domain?: string;
  unresolved_only?: boolean;
  limit?: number;
}

const encodeId = (id: string) => encodeURIComponent(id);

export const mdmGovernanceApi = {
  // ---- 审批 ----
  listPendingApprovals: (): Promise<ApiResponse<MdmApproval[]>> =>
    apiClient.core.get<MdmApproval[]>(`${BASE}/approvals/pending`),

  listApprovalHistory: (masterDataId: string): Promise<ApiResponse<MdmApproval[]>> =>
    apiClient.core.get<MdmApproval[]>(`${BASE}/approvals/history/${encodeId(masterDataId)}`),

  createApproval: (data: CreateMdmApprovalPayload): Promise<ApiResponse<MdmApproval>> =>
    apiClient.core.post<MdmApproval>(`${BASE}/approvals`, data),

  reviewApproval: (
    approvalId: string,
    data: ReviewMdmApprovalPayload
  ): Promise<ApiResponse<MdmApproval>> =>
    apiClient.core.post<MdmApproval>(`${BASE}/approvals/${encodeId(approvalId)}/review`, data),

  // ---- 数据质量 ----
  getQualityReport: (): Promise<ApiResponse<MdmQualityReport>> =>
    apiClient.core.get<MdmQualityReport>(`${BASE}/quality/report`),

  listDuplicates: (): Promise<ApiResponse<MdmDuplicateRecord[]>> =>
    apiClient.core.get<MdmDuplicateRecord[]>(`${BASE}/quality/duplicates`),

  listStale: (): Promise<ApiResponse<MdmStaleRecord[]>> =>
    apiClient.core.get<MdmStaleRecord[]>(`${BASE}/quality/stale`),

  // ---- 对账 ----
  runReconciliation: (): Promise<ApiResponse<MdmReconciliationResult>> =>
    apiClient.core.post<MdmReconciliationResult>(`${BASE}/reconciliation/run`),

  listReconciliationLogs: (
    params?: ReconciliationLogParams
  ): Promise<ApiResponse<MdmReconciliationLog[]>> =>
    apiClient.core.get<MdmReconciliationLog[]>(`${BASE}/reconciliation/logs`, {
      params,
    }),

  resolveReconciliationIssue: (issueId: string): Promise<ApiResponse<boolean>> =>
    apiClient.core.post<boolean>(`${BASE}/reconciliation/logs/${encodeId(issueId)}/resolve`),
};
