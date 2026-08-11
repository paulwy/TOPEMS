import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

import type {
  Feedback,
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
  FeedbackQueryParams,
} from './types';

export * from './types';

export interface FeedbackComment {
  id: string;
  feedback_id: string;
  author_id: string;
  content: string;
  is_private?: boolean;
  created_at?: string;
}

export interface FeedbackStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  resolved_this_month: number;
  avg_resolution_days?: number;
}

export const feedbackApi = {
  // ==================== 反馈 CRUD ====================

  list: async (params?: FeedbackQueryParams): Promise<ApiResponse<PaginatedResponse<Feedback>>> => {
    return apiClient.feedback.get('/feedbacks', { params });
  },

  listFeedbacks: async (
    params?: FeedbackQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Feedback>>> => {
    return apiClient.feedback.get('/feedbacks', { params });
  },

  get: async (id: string): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.get(`/feedbacks/${id}`);
  },

  getFeedback: async (id: string): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.get(`/feedbacks/${id}`);
  },

  create: async (data: CreateFeedbackRequest): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.post('/feedbacks', data);
  },

  createFeedback: async (data: CreateFeedbackRequest): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.post('/feedbacks', data);
  },

  update: async (id: string, data: UpdateFeedbackRequest): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.put(`/feedbacks/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.feedback.delete(`/feedbacks/${id}`);
  },

  deleteFeedback: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.feedback.delete(`/feedbacks/${id}`);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.feedback.delete('/feedbacks/batch', { data: { ids } });
  },

  // ==================== 反馈操作 ====================

  respond: async (
    id: string,
    data: {
      response_type: 'acknowledgment' | 'update' | 'resolution' | 'rejection';
      content: string;
    }
  ): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.post(`/feedbacks/${id}/respond`, data);
  },

  changeStatus: async (
    id: string,
    status: string,
    reason?: string
  ): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.put(`/feedbacks/${id}/status`, { status, reason });
  },

  assign: async (id: string, assigneeId: string): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.post(`/feedbacks/${id}/assign`, { assignee_id: assigneeId });
  },

  addComment: async (
    id: string,
    data: {
      content: string;
      is_private?: boolean;
    }
  ): Promise<ApiResponse<FeedbackComment>> => {
    return apiClient.feedback.post(`/feedbacks/${id}/comments`, data);
  },

  listComments: async (id: string): Promise<ApiResponse<FeedbackComment[]>> => {
    return apiClient.feedback.get(`/feedbacks/${id}/comments`);
  },

  // ==================== 统计 ====================

  getStats: async (params?: {
    period?: 'month' | 'quarter' | 'year';
  }): Promise<ApiResponse<FeedbackStats>> => {
    return apiClient.feedback.get('/feedbacks/stats', { params });
  },

  getMy: async (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Feedback>>> => {
    return apiClient.feedback.get('/feedbacks/my', { params });
  },
};

export default feedbackApi;
