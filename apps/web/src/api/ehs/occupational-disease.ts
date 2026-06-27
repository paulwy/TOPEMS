import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateHazardDetectionRecordRequest,
  CreateHazardFactorRequest,
  CreateOccupationalDiseaseCaseRequest,
  CreateProtectionMeasureRequest,
  HazardDetectionRecord,
  HazardDetectionRecordListQueryParams,
  HazardFactor,
  HazardFactorListQueryParams,
  ListQueryParams,
  OccupationalDiseaseCase,
  OccupationalDiseaseCaseListQueryParams,
  PaginatedResponse,
  ProtectionMeasure,
  ProtectionMeasureListQueryParams,
  UpdateHazardDetectionRecordRequest,
  UpdateHazardFactorRequest,
  UpdateOccupationalDiseaseCaseRequest,
  UpdateProtectionMeasureRequest,
} from './types';

export const occupationalDiseaseApi = {
  listHazardFactors: async (
    params?: HazardFactorListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HazardFactor>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.hazard_level) queryParams.append('hazard_level', params.hazard_level);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<HazardFactor>>(
      `/api/ehs/occupational-diseases/factors?${queryParams.toString()}`
    );
  },

  getHazardFactor: async (id: string): Promise<ApiResponse<HazardFactor>> => {
    return apiClient.ehs.get<HazardFactor>(`/api/ehs/occupational-diseases/factors/${id}`);
  },

  createHazardFactor: async (
    data: CreateHazardFactorRequest
  ): Promise<ApiResponse<HazardFactor>> => {
    return apiClient.ehs.post<HazardFactor>('/api/ehs/occupational-diseases/factors', data);
  },

  updateHazardFactor: async (
    id: string,
    data: Partial<UpdateHazardFactorRequest>
  ): Promise<ApiResponse<HazardFactor>> => {
    return apiClient.ehs.put<HazardFactor>(`/api/ehs/occupational-diseases/factors/${id}`, data);
  },

  deleteHazardFactor: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/occupational-diseases/factors/${id}`);
  },

  listHazardDetectionRecords: async (
    params?: HazardDetectionRecordListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HazardDetectionRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.factor_id) queryParams.append('factor_id', params.factor_id);
    if (params?.result) queryParams.append('result', params.result);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.ehs.get<PaginatedResponse<HazardDetectionRecord>>(
      `/api/ehs/occupational-diseases/detection-records?${queryParams.toString()}`
    );
  },

  getHazardDetectionRecord: async (id: string): Promise<ApiResponse<HazardDetectionRecord>> => {
    return apiClient.ehs.get<HazardDetectionRecord>(
      `/api/ehs/occupational-diseases/detection-records/${id}`
    );
  },

  createHazardDetectionRecord: async (
    data: CreateHazardDetectionRecordRequest
  ): Promise<ApiResponse<HazardDetectionRecord>> => {
    return apiClient.ehs.post<HazardDetectionRecord>(
      '/api/ehs/occupational-diseases/detection-records',
      data
    );
  },

  updateHazardDetectionRecord: async (
    id: string,
    data: Partial<UpdateHazardDetectionRecordRequest>
  ): Promise<ApiResponse<HazardDetectionRecord>> => {
    return apiClient.ehs.put<HazardDetectionRecord>(
      `/api/ehs/occupational-diseases/detection-records/${id}`,
      data
    );
  },

  deleteHazardDetectionRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/occupational-diseases/detection-records/${id}`);
  },

  listOccupationalDiseaseCases: async (
    params?: OccupationalDiseaseCaseListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<OccupationalDiseaseCase>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);
    if (params?.disease_type) queryParams.append('disease_type', params.disease_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.severity) queryParams.append('severity', params.severity);

    return apiClient.ehs.get<PaginatedResponse<OccupationalDiseaseCase>>(
      `/api/ehs/occupational-diseases/cases?${queryParams.toString()}`
    );
  },

  getOccupationalDiseaseCase: async (id: string): Promise<ApiResponse<OccupationalDiseaseCase>> => {
    return apiClient.ehs.get<OccupationalDiseaseCase>(`/api/ehs/occupational-diseases/cases/${id}`);
  },

  createOccupationalDiseaseCase: async (
    data: CreateOccupationalDiseaseCaseRequest
  ): Promise<ApiResponse<OccupationalDiseaseCase>> => {
    return apiClient.ehs.post<OccupationalDiseaseCase>(
      '/api/ehs/occupational-diseases/cases',
      data
    );
  },

  updateOccupationalDiseaseCase: async (
    id: string,
    data: Partial<UpdateOccupationalDiseaseCaseRequest>
  ): Promise<ApiResponse<OccupationalDiseaseCase>> => {
    return apiClient.ehs.put<OccupationalDiseaseCase>(
      `/api/ehs/occupational-diseases/cases/${id}`,
      data
    );
  },

  deleteOccupationalDiseaseCase: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/occupational-diseases/cases/${id}`);
  },

  listProtectionMeasures: async (
    params?: ProtectionMeasureListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<ProtectionMeasure>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.factor_id) queryParams.append('factor_id', params.factor_id);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<ProtectionMeasure>>(
      `/api/ehs/occupational-diseases/protection-measures?${queryParams.toString()}`
    );
  },

  getProtectionMeasure: async (id: string): Promise<ApiResponse<ProtectionMeasure>> => {
    return apiClient.ehs.get<ProtectionMeasure>(
      `/api/ehs/occupational-diseases/protection-measures/${id}`
    );
  },

  createProtectionMeasure: async (
    data: CreateProtectionMeasureRequest
  ): Promise<ApiResponse<ProtectionMeasure>> => {
    return apiClient.ehs.post<ProtectionMeasure>(
      '/api/ehs/occupational-diseases/protection-measures',
      data
    );
  },

  updateProtectionMeasure: async (
    id: string,
    data: Partial<UpdateProtectionMeasureRequest>
  ): Promise<ApiResponse<ProtectionMeasure>> => {
    return apiClient.ehs.put<ProtectionMeasure>(
      `/api/ehs/occupational-diseases/protection-measures/${id}`,
      data
    );
  },

  deleteProtectionMeasure: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/occupational-diseases/protection-measures/${id}`);
  },
};

export default occupationalDiseaseApi;
