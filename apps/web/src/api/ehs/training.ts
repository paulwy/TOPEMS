import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateTrainingCertificateRequest,
  CreateTrainingPlanRequest,
  CreateTrainingRecordRequest,
  ListQueryParams,
  PaginatedResponse,
  TrainingCertificate,
  TrainingCertificateListQueryParams,
  TrainingPlan,
  TrainingPlanListQueryParams,
  TrainingRecord,
  TrainingRecordListQueryParams,
  UpdateTrainingCertificateRequest,
  UpdateTrainingPlanRequest,
  UpdateTrainingRecordRequest,
} from './types';

export const trainingApi = {
  listTrainingPlans: async (
    params?: TrainingPlanListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<TrainingPlan>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.training_type) queryParams.append('training_type', params.training_type);
    if (params?.category) queryParams.append('category', params.category);

    return apiClient.ehs.get<PaginatedResponse<TrainingPlan>>(
      `/api/ehs/training/plans?${queryParams.toString()}`
    );
  },

  getTrainingPlan: async (id: string): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.ehs.get<TrainingPlan>(`/api/ehs/training/plans/${id}`);
  },

  createTrainingPlan: async (
    data: CreateTrainingPlanRequest
  ): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.ehs.post<TrainingPlan>('/api/ehs/training/plans', data);
  },

  updateTrainingPlan: async (
    id: string,
    data: Partial<UpdateTrainingPlanRequest>
  ): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.ehs.put<TrainingPlan>(`/api/ehs/training/plans/${id}`, data);
  },

  deleteTrainingPlan: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/training/plans/${id}`);
  },

  listTrainingRecords: async (
    params?: TrainingRecordListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<TrainingRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.training_type) queryParams.append('training_type', params.training_type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);

    return apiClient.ehs.get<PaginatedResponse<TrainingRecord>>(
      `/api/ehs/training/records?${queryParams.toString()}`
    );
  },

  getTrainingRecord: async (id: string): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.ehs.get<TrainingRecord>(`/api/ehs/training/records/${id}`);
  },

  createTrainingRecord: async (
    data: CreateTrainingRecordRequest
  ): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.ehs.post<TrainingRecord>('/api/ehs/training/records', data);
  },

  updateTrainingRecord: async (
    id: string,
    data: Partial<UpdateTrainingRecordRequest>
  ): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.ehs.put<TrainingRecord>(`/api/ehs/training/records/${id}`, data);
  },

  deleteTrainingRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/training/records/${id}`);
  },

  listTrainingCertificates: async (
    params?: TrainingCertificateListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<TrainingCertificate>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.training_type) queryParams.append('training_type', params.training_type);

    return apiClient.ehs.get<PaginatedResponse<TrainingCertificate>>(
      `/api/ehs/training/certificates?${queryParams.toString()}`
    );
  },

  getTrainingCertificate: async (id: string): Promise<ApiResponse<TrainingCertificate>> => {
    return apiClient.ehs.get<TrainingCertificate>(`/api/ehs/training/certificates/${id}`);
  },

  createTrainingCertificate: async (
    data: CreateTrainingCertificateRequest
  ): Promise<ApiResponse<TrainingCertificate>> => {
    return apiClient.ehs.post<TrainingCertificate>('/api/ehs/training/certificates', data);
  },

  updateTrainingCertificate: async (
    id: string,
    data: Partial<UpdateTrainingCertificateRequest>
  ): Promise<ApiResponse<TrainingCertificate>> => {
    return apiClient.ehs.put<TrainingCertificate>(`/api/ehs/training/certificates/${id}`, data);
  },

  deleteTrainingCertificate: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/training/certificates/${id}`);
  },
};

export default trainingApi;
