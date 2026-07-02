import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  ControlMeasure,
  CreateControlMeasureRequest,
  CreateRiskAssessmentRequest,
  CreateSafetyHazardRequest,
  Hazard,
  ListQueryParams,
  PaginatedResponse,
  RiskAssessment,
  SafetyHazard,
} from './types';

export const hazardApi = {
  listHazards: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SafetyHazard>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<SafetyHazard>>(`/hazards?${queryParams.toString()}`);
  },

  getHazard: async (id: string): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.get<SafetyHazard>(`/hazards/${id}`);
  },

  createHazard: async (data: CreateSafetyHazardRequest): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.post<SafetyHazard>('/hazards', data);
  },

  updateHazard: async (
    id: string,
    data: Partial<CreateSafetyHazardRequest>
  ): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.put<SafetyHazard>(`/hazards/${id}`, data);
  },

  deleteHazard: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/hazards/${id}`);
  },

  listRiskAssessments: async (
    hazardId: string
  ): Promise<ApiResponse<PaginatedResponse<RiskAssessment>>> => {
    return apiClient.ehs.get<PaginatedResponse<RiskAssessment>>(`/hazards/${hazardId}/assessments`);
  },

  createRiskAssessment: async (
    hazardId: string,
    data: CreateRiskAssessmentRequest
  ): Promise<ApiResponse<RiskAssessment>> => {
    return apiClient.ehs.post<RiskAssessment>(`/hazards/${hazardId}/assessments`, data);
  },

  updateRiskAssessment: async (
    hazardId: string,
    assessmentId: string,
    data: Partial<CreateRiskAssessmentRequest>
  ): Promise<ApiResponse<RiskAssessment>> => {
    return apiClient.ehs.put<RiskAssessment>(
      `/hazards/${hazardId}/assessments/${assessmentId}`,
      data
    );
  },

  listControlMeasures: async (
    hazardId: string
  ): Promise<ApiResponse<PaginatedResponse<ControlMeasure>>> => {
    return apiClient.ehs.get<PaginatedResponse<ControlMeasure>>(`/hazards/${hazardId}/controls`);
  },

  createControlMeasure: async (
    hazardId: string,
    data: CreateControlMeasureRequest
  ): Promise<ApiResponse<ControlMeasure>> => {
    return apiClient.ehs.post<ControlMeasure>(`/hazards/${hazardId}/controls`, data);
  },

  updateControlMeasure: async (
    hazardId: string,
    measureId: string,
    data: Partial<CreateControlMeasureRequest>
  ): Promise<ApiResponse<ControlMeasure>> => {
    return apiClient.ehs.put<ControlMeasure>(`/hazards/${hazardId}/controls/${measureId}`, data);
  },

  deleteControlMeasure: async (hazardId: string, measureId: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/hazards/${hazardId}/controls/${measureId}`);
  },
};

export default hazardApi;
