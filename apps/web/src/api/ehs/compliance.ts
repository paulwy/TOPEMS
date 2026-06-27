import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  ComplianceAssessment,
  ComplianceAssessmentListQueryParams,
  CreateComplianceAssessmentRequest,
  CreateDischargePermitRequest,
  CreateEnvironmentalEventRequest,
  CreateEnvironmentalRegulationRequest,
  DischargeLimit,
  DischargePermit,
  DischargePermitListQueryParams,
  EnvironmentalEvent,
  EnvironmentalEventListQueryParams,
  EnvironmentalRegulation,
  EnvironmentalRegulationListQueryParams,
  ListQueryParams,
  PaginatedResponse,
  UpdateComplianceAssessmentRequest,
  UpdateDischargePermitRequest,
  UpdateEnvironmentalEventRequest,
  UpdateEnvironmentalRegulationRequest,
} from './types';

export const complianceApi = {
  listEnvironmentalRegulations: async (
    params?: EnvironmentalRegulationListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EnvironmentalRegulation>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.regulation_type) queryParams.append('regulation_type', params.regulation_type);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<EnvironmentalRegulation>>(
      `/api/ehs/environmental-compliance/regulations?${queryParams.toString()}`
    );
  },

  getEnvironmentalRegulation: async (id: string): Promise<ApiResponse<EnvironmentalRegulation>> => {
    return apiClient.ehs.get<EnvironmentalRegulation>(
      `/api/ehs/environmental-compliance/regulations/${id}`
    );
  },

  createEnvironmentalRegulation: async (
    data: CreateEnvironmentalRegulationRequest
  ): Promise<ApiResponse<EnvironmentalRegulation>> => {
    return apiClient.ehs.post<EnvironmentalRegulation>(
      '/api/ehs/environmental-compliance/regulations',
      data
    );
  },

  updateEnvironmentalRegulation: async (
    id: string,
    data: Partial<UpdateEnvironmentalRegulationRequest>
  ): Promise<ApiResponse<EnvironmentalRegulation>> => {
    return apiClient.ehs.put<EnvironmentalRegulation>(
      `/api/ehs/environmental-compliance/regulations/${id}`,
      data
    );
  },

  deleteEnvironmentalRegulation: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/environmental-compliance/regulations/${id}`);
  },

  listComplianceAssessments: async (
    params?: ComplianceAssessmentListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<ComplianceAssessment>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.assessment_type) queryParams.append('assessment_type', params.assessment_type);
    if (params?.result) queryParams.append('result', params.result);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<ComplianceAssessment>>(
      `/api/ehs/environmental-compliance/assessments?${queryParams.toString()}`
    );
  },

  getComplianceAssessment: async (id: string): Promise<ApiResponse<ComplianceAssessment>> => {
    return apiClient.ehs.get<ComplianceAssessment>(
      `/api/ehs/environmental-compliance/assessments/${id}`
    );
  },

  createComplianceAssessment: async (
    data: CreateComplianceAssessmentRequest
  ): Promise<ApiResponse<ComplianceAssessment>> => {
    return apiClient.ehs.post<ComplianceAssessment>(
      '/api/ehs/environmental-compliance/assessments',
      data
    );
  },

  updateComplianceAssessment: async (
    id: string,
    data: Partial<UpdateComplianceAssessmentRequest>
  ): Promise<ApiResponse<ComplianceAssessment>> => {
    return apiClient.ehs.put<ComplianceAssessment>(
      `/api/ehs/environmental-compliance/assessments/${id}`,
      data
    );
  },

  deleteComplianceAssessment: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/environmental-compliance/assessments/${id}`);
  },

  listDischargePermits: async (
    params?: DischargePermitListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<DischargePermit>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.permit_type) queryParams.append('permit_type', params.permit_type);
    if (params?.permit_category) queryParams.append('permit_category', params.permit_category);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<DischargePermit>>(
      `/api/ehs/environmental-compliance/permits?${queryParams.toString()}`
    );
  },

  getDischargePermit: async (id: string): Promise<ApiResponse<DischargePermit>> => {
    return apiClient.ehs.get<DischargePermit>(`/api/ehs/environmental-compliance/permits/${id}`);
  },

  createDischargePermit: async (
    data: CreateDischargePermitRequest
  ): Promise<ApiResponse<DischargePermit>> => {
    return apiClient.ehs.post<DischargePermit>('/api/ehs/environmental-compliance/permits', data);
  },

  updateDischargePermit: async (
    id: string,
    data: Partial<UpdateDischargePermitRequest>
  ): Promise<ApiResponse<DischargePermit>> => {
    return apiClient.ehs.put<DischargePermit>(
      `/api/ehs/environmental-compliance/permits/${id}`,
      data
    );
  },

  deleteDischargePermit: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/environmental-compliance/permits/${id}`);
  },

  listEnvironmentalEvents: async (
    params?: EnvironmentalEventListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EnvironmentalEvent>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.event_type) queryParams.append('event_type', params.event_type);
    if (params?.event_category) queryParams.append('event_category', params.event_category);
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.ehs.get<PaginatedResponse<EnvironmentalEvent>>(
      `/api/ehs/environmental-compliance/events?${queryParams.toString()}`
    );
  },

  getEnvironmentalEvent: async (id: string): Promise<ApiResponse<EnvironmentalEvent>> => {
    return apiClient.ehs.get<EnvironmentalEvent>(`/api/ehs/environmental-compliance/events/${id}`);
  },

  createEnvironmentalEvent: async (
    data: CreateEnvironmentalEventRequest
  ): Promise<ApiResponse<EnvironmentalEvent>> => {
    return apiClient.ehs.post<EnvironmentalEvent>('/api/ehs/environmental-compliance/events', data);
  },

  updateEnvironmentalEvent: async (
    id: string,
    data: Partial<UpdateEnvironmentalEventRequest>
  ): Promise<ApiResponse<EnvironmentalEvent>> => {
    return apiClient.ehs.put<EnvironmentalEvent>(
      `/api/ehs/environmental-compliance/events/${id}`,
      data
    );
  },

  deleteEnvironmentalEvent: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/environmental-compliance/events/${id}`);
  },
};

export default complianceApi;
