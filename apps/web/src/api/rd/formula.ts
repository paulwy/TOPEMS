import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  Formula,
  CreateFormulaRequest,
  UpdateFormulaRequest,
  FormulaVersion,
  CreateFormulaVersionRequest,
} from './types';

export const formulaApi = {
  listFormulas: async (params?: {
    project_id?: string;
    status?: string;
  }): Promise<ApiResponse<Formula[]>> => {
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

  approveFormula: async (id: string): Promise<ApiResponse<Formula>> => {
    return apiClient.rd.post(`/formulas/${id}/approve`, {});
  },
};
