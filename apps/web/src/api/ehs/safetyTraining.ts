import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type { PaginatedResponse } from './types';

export interface SafetyTrainingItem {
  id: string;
  training_no: string;
  title: string;
  content?: string;
  trainer?: string;
  training_type?: string;
  duration_hours?: number;
  scheduled_at?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface SafetyTrainingListQuery {
  page?: number;
  page_size?: number;
  status?: string;
  training_type?: string;
  trainer?: string;
  keyword?: string;
}

export interface CreateSafetyTrainingRequest {
  title: string;
  content?: string;
  trainer?: string;
  training_type?: string;
  duration_hours?: number;
  scheduled_at?: string;
  status?: string;
}

export interface UpdateSafetyTrainingRequest {
  title?: string;
  content?: string;
  trainer?: string;
  training_type?: string;
  duration_hours?: number;
  scheduled_at?: string;
  status?: string;
}

export interface SafetyTrainingStatistics {
  total_trainings: number;
  scheduled_count: number;
  completed_count: number;
  in_progress_count: number;
  cancelled_count: number;
  total_hours: number;
  by_type: Record<string, unknown>[];
  by_status: Record<string, unknown>[];
  completion_rate?: number;
}

export const safetyTrainingApi = {
  async listTrainings(params?: SafetyTrainingListQuery): Promise<ApiResponse<PaginatedResponse<SafetyTrainingItem>>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    if (params?.status) qs.set('status', params.status);
    if (params?.training_type) qs.set('training_type', params.training_type);
    if (params?.trainer) qs.set('trainer', params.trainer);
    if (params?.keyword) qs.set('q', params.keyword);
    const s = qs.toString();
    return apiClient.ehs.get<PaginatedResponse<SafetyTrainingItem>>(`/training${s ? `?${s}` : ''}`);
  },

  async getTraining(id: string): Promise<ApiResponse<SafetyTrainingItem>> {
    return apiClient.ehs.get<SafetyTrainingItem>(`/training/${id}`);
  },

  async createTraining(data: CreateSafetyTrainingRequest): Promise<ApiResponse<SafetyTrainingItem>> {
    return apiClient.ehs.post<SafetyTrainingItem>('/training', data);
  },

  async updateTraining(id: string, data: UpdateSafetyTrainingRequest): Promise<ApiResponse<SafetyTrainingItem>> {
    return apiClient.ehs.put<SafetyTrainingItem>(`/training/${id}`, data);
  },

  async deleteTraining(id: string): Promise<ApiResponse<null>> {
    return apiClient.ehs.delete<null>(`/training/${id}`);
  },

  async getTrainingStatistics(): Promise<ApiResponse<SafetyTrainingStatistics>> {
    return apiClient.ehs.get<SafetyTrainingStatistics>('/training/statistics');
  },
};
