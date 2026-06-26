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
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
  
    return apiClient.ehs.get<PaginatedResponse<SafetyHazard>>(
      `/api/ehs/hazards?${queryParams.toString()}`
    );
  },

  getHazard: async (id: string): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.get<SafetyHazard>(`/api/ehs/hazards/${id}`);
  },

  createHazard: async (data: CreateSafetyHazardRequest): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.post<SafetyHazard>('/api/ehs/hazards', data);
  },

  updateHazard: async (
    id: string,
    data: Partial<CreateSafetyHazardRequest>
  ): Promise<ApiResponse<SafetyHazard>> => {
    return apiClient.ehs.put<SafetyHazard>(`/api/ehs/hazards/${id}`, data);
  },

  deleteHazard: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/hazards/${id}`);
  },

  listRiskAssessments: async (
    hazardId: string
  ): Promise<ApiResponse<PaginatedResponse<RiskAssessment>>> => {
    return apiClient.ehs.get<PaginatedResponse<RiskAssessment>>(
      `/api/ehs/hazards/${hazardId}/assessments`
    );
  },

  createRiskAssessment: async (
    hazardId: string,
    data: CreateRiskAssessmentRequest
  ): Promise<ApiResponse<RiskAssessment>> => {
    return apiClient.ehs.post<RiskAssessment>(`/api/ehs/hazards/${hazardId}/assessments`, data);
  },

  updateRiskAssessment: async (
    hazardId: string,
    assessmentId: string,
    data: Partial<CreateRiskAssessmentRequest>
  ): Promise<ApiResponse<RiskAssessment>> => {
    return apiClient.ehs.put<RiskAssessment>(
      `/api/ehs/hazards/${hazardId}/assessments/${assessmentId}`,
      data
    );
  },

  listControlMeasures: async (
    hazardId: string
  ): Promise<ApiResponse<PaginatedResponse<ControlMeasure>>> => {
    return apiClient.ehs.get<PaginatedResponse<ControlMeasure>>(
      `/api/ehs/hazards/${hazardId}/controls`
    );
  },

  createControlMeasure: async (
    hazardId: string,
    data: CreateControlMeasureRequest
  ): Promise<ApiResponse<ControlMeasure>> => {
    return apiClient.ehs.post<ControlMeasure>(`/api/ehs/hazards/${hazardId}/controls`, data);
  },

  updateControlMeasure: async (
    hazardId: string,
    measureId: string,
    data: Partial<CreateControlMeasureRequest>
  ): Promise<ApiResponse<ControlMeasure>> => {
    return apiClient.ehs.put<ControlMeasure>(
      `/api/ehs/hazards/${hazardId}/controls/${measureId}`,
      data
    );
  },

  deleteControlMeasure: async (hazardId: string, measureId: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/hazards/${hazardId}/controls/${measureId}`);
  },
};

export default hazardApi;
