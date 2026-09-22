import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateRiskControlMeasureRequest,
  CreateRiskMgmtAssessmentRequest,
  CreateRiskRequest,
  PaginatedResponse,
  Risk,
  RiskControlMeasure,
  RiskListQueryParams,
  RiskMgmtAssessment,
  UpdateRiskControlMeasureRequest,
  UpdateRiskRequest,
} from './types';

export const riskApi = {
  listRisks: async (
    params?: RiskListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Risk>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('page_size', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.risklevel) queryParams.append('risk_level', params.risklevel);
    if (params?.category) queryParams.append('category', params.category);

    return apiClient.ehs.get<PaginatedResponse<Risk>>(`/hazards?${queryParams.toString()}`);
  },

  getRisk: async (id: string): Promise<ApiResponse<Risk>> => {
    return apiClient.ehs.get<Risk>(`/hazards/${id}`);
  },

  createRisk: async (data: CreateRiskRequest): Promise<ApiResponse<Risk>> => {
    return apiClient.ehs.post<Risk>('/hazards', data);
  },

  updateRisk: async (id: string, data: Partial<UpdateRiskRequest>): Promise<ApiResponse<Risk>> => {
    return apiClient.ehs.put<Risk>(`/hazards/${id}`, data);
  },

  deleteRisk: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/hazards/${id}`);
  },

  listRiskMgmtAssessments: async (
    riskId: string
  ): Promise<ApiResponse<PaginatedResponse<RiskMgmtAssessment>>> => {
    return apiClient.ehs.get<PaginatedResponse<RiskMgmtAssessment>>(
      `/hazards/${riskId}/assessments`
    );
  },

  createRiskMgmtAssessment: async (
    riskId: string,
    data: CreateRiskMgmtAssessmentRequest
  ): Promise<ApiResponse<RiskMgmtAssessment>> => {
    return apiClient.ehs.post<RiskMgmtAssessment>(`/hazards/${riskId}/assessments`, data);
  },

  listRiskControlMeasures: async (
    riskId: string
  ): Promise<ApiResponse<PaginatedResponse<RiskControlMeasure>>> => {
    return apiClient.ehs.get<PaginatedResponse<RiskControlMeasure>>(`/hazards/${riskId}/controls`);
  },

  createRiskControlMeasure: async (
    riskId: string,
    data: CreateRiskControlMeasureRequest
  ): Promise<ApiResponse<RiskControlMeasure>> => {
    return apiClient.ehs.post<RiskControlMeasure>(`/hazards/${riskId}/controls`, data);
  },

  updateRiskControlMeasure: async (
    riskId: string,
    measureId: string,
    data: Partial<UpdateRiskControlMeasureRequest>
  ): Promise<ApiResponse<RiskControlMeasure>> => {
    return apiClient.ehs.put<RiskControlMeasure>(`/hazards/${riskId}/controls/${measureId}`, data);
  },

  deleteRiskControlMeasure: async (
    riskId: string,
    measureId: string
  ): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/hazards/${riskId}/controls/${measureId}`);
  },
};

export default riskApi;
