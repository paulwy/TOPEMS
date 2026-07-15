import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

import type {
  Feedback,
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
  FeedbackQueryParams,
} from './types';

export * from './types';

export const feedbackApi = {
  listFeedbacks: async (params?: FeedbackQueryParams): Promise<PaginatedResponse<Feedback>> => {
    return apiClient.core.get('/feedbacks', { params });
  },

  getFeedback: async (id: string): Promise<ApiResponse<Feedback>> => {
    return apiClient.core.get(`/feedbacks/${id}`);
  },

  createFeedback: async (data: CreateFeedbackRequest): Promise<ApiResponse<Feedback>> => {
    return apiClient.core.post('/feedbacks', data);
  },

  updateFeedback: async (
    id: string,
    data: UpdateFeedbackRequest
  ): Promise<ApiResponse<Feedback>> => {
    return apiClient.core.put(`/feedbacks/${id}`, data);
  },

  deleteFeedback: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.core.delete(`/feedbacks/${id}`);
  },

  batchDeleteFeedbacks: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.core.delete('/feedbacks/batch', { data: { ids } });
  },
};

export default feedbackApi;
