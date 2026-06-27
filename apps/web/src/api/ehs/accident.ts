import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  Accident,
  AccidentDetail,
  CreateAccidentRequest,
  CreateInvestigationRequest,
  CreateReviewRequest,
  CreateTreatmentActionRequest,
  CreateTreatmentRequest,
  Event,
  Investigation,
  ListQueryParams,
  PaginatedResponse,
  Review,
  Treatment,
  TreatmentAction,
} from './types';

export const accidentApi = {
  listAccidents: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Accident>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<Accident>>(
      `/api/ehs/incidents?${queryParams.toString()}`
    );
  },

  getAccident: async (id: string): Promise<ApiResponse<AccidentDetail>> => {
    return apiClient.ehs.get<AccidentDetail>(`/api/ehs/incidents/${id}`);
  },

  createAccident: async (data: CreateAccidentRequest): Promise<ApiResponse<Accident>> => {
    return apiClient.ehs.post<Accident>('/api/ehs/incidents', data);
  },

  updateAccident: async (
    id: string,
    data: Partial<CreateAccidentRequest>
  ): Promise<ApiResponse<Accident>> => {
    return apiClient.ehs.put<Accident>(`/api/ehs/incidents/${id}`, data);
  },

  deleteAccident: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/incidents/${id}`);
  },

  startInvestigation: async (
    accidentId: string,
    data: CreateInvestigationRequest
  ): Promise<ApiResponse<Investigation>> => {
    return apiClient.ehs.post<Investigation>(
      `/api/ehs/incidents/${accidentId}/investigation`,
      data
    );
  },

  updateInvestigation: async (
    accidentId: string,
    data: Partial<CreateInvestigationRequest>
  ): Promise<ApiResponse<Investigation>> => {
    return apiClient.ehs.put<Investigation>(`/api/ehs/incidents/${accidentId}/investigation`, data);
  },

  completeInvestigation: async (accidentId: string): Promise<ApiResponse<Investigation>> => {
    return apiClient.ehs.post<Investigation>(
      `/api/ehs/incidents/${accidentId}/investigation/complete`,
      {}
    );
  },

  createTreatment: async (
    accidentId: string,
    data: CreateTreatmentRequest
  ): Promise<ApiResponse<Treatment>> => {
    return apiClient.ehs.post<Treatment>(`/api/ehs/incidents/${accidentId}/treatment`, data);
  },

  updateTreatmentAction: async (
    accidentId: string,
    actionId: string,
    data: { status?: string; completed_at?: string }
  ): Promise<ApiResponse<TreatmentAction>> => {
    return apiClient.ehs.put<TreatmentAction>(
      `/api/ehs/incidents/${accidentId}/treatment/actions/${actionId}`,
      data
    );
  },

  completeTreatment: async (accidentId: string): Promise<ApiResponse<Treatment>> => {
    return apiClient.ehs.post<Treatment>(`/api/ehs/incidents/${accidentId}/treatment/complete`, {});
  },

  createReview: async (
    accidentId: string,
    data: CreateReviewRequest
  ): Promise<ApiResponse<Review>> => {
    return apiClient.ehs.post<Review>(`/api/ehs/incidents/${accidentId}/review`, data);
  },

  closeAccident: async (id: string): Promise<ApiResponse<Accident>> => {
    return apiClient.ehs.post<Accident>(`/api/ehs/incidents/${id}/close`, {});
  },
};

export default accidentApi;
