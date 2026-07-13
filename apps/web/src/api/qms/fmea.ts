import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  FmeaAnalysis,
  CreateFmeaAnalysisRequest,
  FmeaAnalysisBackend,
  UpdateFmeaAnalysisRequestBackend,
  FmeaItem,
  FmeaItemBackend,
  CreateFmeaItemRequestBackend,
  UpdateFmeaItemRequestBackend,
  FmeaStatistics,
  FmeaStatisticsBackend,
} from './types';
import {
  adaptFmeaAnalysisToFrontend,
  adaptFmeaAnalysisToBackend,
  adaptFmeaItemToFrontend,
  adaptFmeaItemToBackend,
  adaptFmeaStatisticsToFrontend,
} from './adapters';

export const fmeaApi = {
  listFmeaAnalyses: async (): Promise<ApiResponse<FmeaAnalysis[]>> => {
    const response = await apiClient.qms.get<{ fmeas?: FmeaAnalysisBackend[] }>('/fmea');
    const adaptedData = (response.data?.fmeas || []).map(adaptFmeaAnalysisToFrontend);
    return { ...response, data: adaptedData };
  },

  getFmeaAnalysis: async (id: string): Promise<ApiResponse<FmeaAnalysis | undefined>> => {
    const response = await apiClient.qms.get<FmeaAnalysisBackend>(`/fmea/${id}`);
    return {
      ...response,
      data: response.data ? adaptFmeaAnalysisToFrontend(response.data) : ({} as FmeaAnalysis),
    };
  },

  createFmeaAnalysis: async (
    data: CreateFmeaAnalysisRequest
  ): Promise<ApiResponse<FmeaAnalysis | undefined>> => {
    const backendData = adaptFmeaAnalysisToBackend(data);
    const response = await apiClient.qms.post<FmeaAnalysisBackend>('/fmea', backendData);
    return {
      ...response,
      data: response.data ? adaptFmeaAnalysisToFrontend(response.data) : ({} as FmeaAnalysis),
    };
  },

  updateFmeaAnalysis: async (
    id: string,
    data: Partial<CreateFmeaAnalysisRequest>
  ): Promise<ApiResponse<FmeaAnalysis | undefined>> => {
    const backendData: UpdateFmeaAnalysisRequestBackend = {
      fmea_name: data.fmeaName,
      fmea_type: data.fmeaType,
      product_id: data.productId,
      product_name: data.productName,
      process_id: data.processId,
      process_name: data.processName,
      version: data.version,
      status: data.status,
      scope: data.scope,
      team_leader: data.teamLeader,
      team_members: data.teamMembers,
      description: data.description,
    };
    const response = await apiClient.qms.put<FmeaAnalysisBackend>(`/fmea/${id}`, backendData);
    return {
      ...response,
      data: response.data ? adaptFmeaAnalysisToFrontend(response.data) : ({} as FmeaAnalysis),
    };
  },

  deleteFmeaAnalysis: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/fmea/${id}`);
  },

  getFmeaStatistics: async (fmeaId: string): Promise<ApiResponse<FmeaStatistics | undefined>> => {
    const response = await apiClient.qms.get<FmeaStatisticsBackend>(`/fmea/${fmeaId}/statistics`);
    return {
      ...response,
      data: response.data ? adaptFmeaStatisticsToFrontend(response.data) : ({} as FmeaStatistics),
    };
  },

  listFmeaItems: async (fmeaId: string): Promise<ApiResponse<FmeaItem[]>> => {
    const response = await apiClient.qms.get<{ items?: FmeaItemBackend[] }>(
      `/fmea-items?fmea_id=${fmeaId}`
    );
    const adaptedData = (response.data?.items || []).map(adaptFmeaItemToFrontend);
    return { ...response, data: adaptedData };
  },

  getFmeaItem: async (id: string): Promise<ApiResponse<FmeaItem | undefined>> => {
    const response = await apiClient.qms.get<FmeaItemBackend>(`/fmea-items/${id}`);
    return {
      ...response,
      data: response.data ? adaptFmeaItemToFrontend(response.data) : ({} as FmeaItem),
    };
  },

  createFmeaItem: async (
    data: Omit<
      FmeaItem,
      | 'id'
      | 'rpn'
      | 'rpnRevised'
      | 'createdAt'
      | 'updatedAt'
      | 'actionsTaken'
      | 'severityRevised'
      | 'occurrenceRevised'
      | 'detectionRevised'
    >
  ): Promise<ApiResponse<FmeaItem | undefined>> => {
    const backendData = adaptFmeaItemToBackend(data);
    const response = await apiClient.qms.post<FmeaItemBackend>('/fmea-items', backendData);
    return {
      ...response,
      data: response.data ? adaptFmeaItemToFrontend(response.data) : ({} as FmeaItem),
    };
  },

  updateFmeaItem: async (
    id: string,
    data: Partial<
      Omit<FmeaItem, 'id' | 'fmeaId' | 'createdAt' | 'updatedAt' | 'rpn' | 'rpnRevised'>
    >
  ): Promise<ApiResponse<FmeaItem | undefined>> => {
    const backendData: UpdateFmeaItemRequestBackend = {
      function_description: data.functionDescription,
      failure_mode: data.failureMode,
      failure_effect: data.failureEffect,
      severity: data.severity,
      failure_cause: data.failureCause,
      occurrence: data.occurrence,
      current_controls: data.currentControls,
      detection: data.detection,
      recommended_actions: data.recommendedActions,
      responsibility: data.responsibility,
      target_date: data.targetDate,
      actions_taken: data.actionsTaken,
      severity_revised: data.severityRevised,
      occurrence_revised: data.occurrenceRevised,
      detection_revised: data.detectionRevised,
      status: data.status,
    };
    const response = await apiClient.qms.put<FmeaItemBackend>(`/fmea-items/${id}`, backendData);
    return {
      ...response,
      data: response.data ? adaptFmeaItemToFrontend(response.data) : ({} as FmeaItem),
    };
  },

  deleteFmeaItem: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/fmea-items/${id}`);
  },
};
