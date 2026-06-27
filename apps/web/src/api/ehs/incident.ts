import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateIncidentActionRequest,
  CreateIncidentRequest,
  Incident,
  IncidentAction,
  ListQueryParams,
  PaginatedResponse,
} from './types';

export const incidentApi = {
  listIncidents: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Incident>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<Incident>>(
      `/api/ehs/incidents?${queryParams.toString()}`
    );
  },

  getIncident: async (id: string): Promise<ApiResponse<Incident>> => {
    return apiClient.ehs.get<Incident>(`/api/ehs/incidents/${id}`);
  },

  createIncident: async (data: CreateIncidentRequest): Promise<ApiResponse<Incident>> => {
    return apiClient.ehs.post<Incident>('/api/ehs/incidents', data);
  },

  updateIncident: async (
    id: string,
    data: Partial<CreateIncidentRequest>
  ): Promise<ApiResponse<Incident>> => {
    return apiClient.ehs.put<Incident>(`/api/ehs/incidents/${id}`, data);
  },

  deleteIncident: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/incidents/${id}`);
  },

  listIncidentActions: async (
    incidentId: string
  ): Promise<ApiResponse<PaginatedResponse<IncidentAction>>> => {
    return apiClient.ehs.get<PaginatedResponse<IncidentAction>>(
      `/api/ehs/incidents/${incidentId}/actions`
    );
  },

  createIncidentAction: async (
    incidentId: string,
    data: CreateIncidentActionRequest
  ): Promise<ApiResponse<IncidentAction>> => {
    return apiClient.ehs.post<IncidentAction>(`/api/ehs/incidents/${incidentId}/actions`, data);
  },

  updateIncidentAction: async (
    incidentId: string,
    actionId: string,
    data: Partial<CreateIncidentActionRequest>
  ): Promise<ApiResponse<IncidentAction>> => {
    return apiClient.ehs.put<IncidentAction>(
      `/api/ehs/incidents/${incidentId}/actions/${actionId}`,
      data
    );
  },
};

export default incidentApi;
