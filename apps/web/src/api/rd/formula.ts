import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  Formula,
  CreateFormulaRequest,
  UpdateFormulaRequest,
  FormulaVersion,
  CreateFormulaVersionRequest,
} from './types';

export type FormulaApprovalAction = 'submit' | 'approve' | 'reject';

export interface FormulaReviewParams {
  action: FormulaApprovalAction;
  reviewer?: string;
  comment?: string;
}

export interface ListFormulasParams {
  project_id?: string;
  status?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  search?: string;
  page?: number;
  page_size?: number;
}

export const formulaApi = {
  listFormulas: async (
    params?: ListFormulasParams
  ): Promise<ApiResponse<{ items: Formula[]; total: number; page: number; page_size: number }>> => {
    let url = '/formulas';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return apiClient.rd.get(url);
  },

  getFormula: async (id: string): Promise<ApiResponse<Formula>> => {
    return apiClient.rd.get(`/formulas/${id}`);
  },

  createFormula: async (data: CreateFormulaRequest): Promise<ApiResponse<Formula>> => {
    return apiClient.rd.post('/formulas', data);
  },

  updateFormula: async (id: string, data: UpdateFormulaRequest): Promise<ApiResponse<Formula>> => {
    return apiClient.rd.put(`/formulas/${id}`, data);
  },

  deleteFormula: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.rd.delete(`/formulas/${id}`);
  },

  listVersions: async (formulaId: string): Promise<ApiResponse<FormulaVersion[]>> => {
    return apiClient.rd.get(`/formulas/${formulaId}/versions`);
  },

  listFormulaVersions: async (formulaId: string): Promise<ApiResponse<FormulaVersion[]>> => {
    return apiClient.rd.get(`/formulas/${formulaId}/versions`);
  },

  createVersion: async (
    formulaId: string,
    data: CreateFormulaVersionRequest
  ): Promise<ApiResponse<FormulaVersion>> => {
    return apiClient.rd.post(`/formulas/${formulaId}/versions`, data);
  },

  createFormulaVersion: async (
    formulaId: string,
    data: CreateFormulaVersionRequest
  ): Promise<ApiResponse<FormulaVersion>> => {
    return apiClient.rd.post(`/formulas/${formulaId}/versions`, data);
  },

  /**
   * 配方评审：提交 / 通过 / 驳回。
   * 后端契约：POST /api/rd/formulas/{id}/review
   * body: { action, reviewer?, comment? }
   * 批 38：原 approveFormula 已合并为本方法，不要另起一套。
   */
  reviewFormula: async (
    id: string,
    action: FormulaApprovalAction,
    reviewer?: string,
    comment?: string
  ): Promise<ApiResponse<Formula>> => {
    const body: FormulaReviewParams = { action };
    if (reviewer !== undefined) body.reviewer = reviewer;
    if (comment !== undefined) body.comment = comment;
    return apiClient.rd.post(`/formulas/${id}/review`, body);
  },
};
