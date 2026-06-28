import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateRiskControlMeasureRequest,
  CreateRiskMgmtAssessmentRequest,
  CreateRiskRequest,
  ListQueryParams,
  PaginatedResponse,
  Risk,
  RiskControlMeasure,
  RiskLevelMatrix,
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
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.risklevel) queryParams.append('risklevel', params.risklevel);
    if (params?.category) queryParams.append('category', params.category);

    return apiClient.ehs.get<PaginatedResponse<Risk>>(`/api/ehs/risks?${queryParams.toString()}`);
  },

  getRisk: async (id: string): Promise<ApiResponse<Risk>> => {
    return apiClient.ehs.get<Risk>(`/api/ehs/risks/${id}`);
  },

  createRisk: async (data: CreateRiskRequest): Promise<ApiResponse<Risk>> => {
    return apiClient.ehs.post<Risk>('/api/ehs/risks', data);
  },

  updateRisk: async (id: string, data: Partial<UpdateRiskRequest>): Promise<ApiResponse<Risk>> => {
    return apiClient.ehs.put<Risk>(`/api/ehs/risks/${id}`, data);
  },

  deleteRisk: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/risks/${id}`);
  },

  listRiskMgmtAssessments: async (
    riskId: string
  ): Promise<ApiResponse<PaginatedResponse<RiskMgmtAssessment>>> => {
    return apiClient.ehs.get<PaginatedResponse<RiskMgmtAssessment>>(
      `/api/ehs/risks/${riskId}/assessments`
    );
  },

  createRiskMgmtAssessment: async (
    riskId: string,
    data: CreateRiskMgmtAssessmentRequest
  ): Promise<ApiResponse<RiskMgmtAssessment>> => {
    return apiClient.ehs.post<RiskMgmtAssessment>(`/api/ehs/risks/${riskId}/assessments`, data);
  },

  listRiskControlMeasures: async (
    riskId: string
  ): Promise<ApiResponse<PaginatedResponse<RiskControlMeasure>>> => {
    return apiClient.ehs.get<PaginatedResponse<RiskControlMeasure>>(
      `/api/ehs/risks/${riskId}/controls`
    );
  },

  createRiskControlMeasure: async (
    riskId: string,
    data: CreateRiskControlMeasureRequest
  ): Promise<ApiResponse<RiskControlMeasure>> => {
    return apiClient.ehs.post<RiskControlMeasure>(`/api/ehs/risks/${riskId}/controls`, data);
  },

  updateRiskControlMeasure: async (
    riskId: string,
    measureId: string,
    data: Partial<UpdateRiskControlMeasureRequest>
  ): Promise<ApiResponse<RiskControlMeasure>> => {
    return apiClient.ehs.put<RiskControlMeasure>(
      `/api/ehs/risks/${riskId}/controls/${measureId}`,
      data
    );
  },

  deleteRiskControlMeasure: async (
    riskId: string,
    measureId: string
  ): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/risks/${riskId}/controls/${measureId}`);
  },
};

export default riskApi;
