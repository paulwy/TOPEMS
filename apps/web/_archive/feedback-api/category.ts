/**
 * Feedback · 分类与标签 API 绑定
 *
 * 后端: svc/feedback/src/handlers.rs
 * 路由:
 *   GET    /feedback/categories
 *   POST   /feedback/categories
 *   GET    /feedback/categories/{id}
 *   PUT    /feedback/categories/{id}
 *   DELETE /feedback/categories/{id}
 *   GET    /feedback/tags
 *   POST   /feedback/tags
 *   PUT    /feedback/tags/{id}
 *   DELETE /feedback/tags/{id}
 *   POST   /feedbacks/{id}/tags
 *   DELETE /feedbacks/{id}/tags/{tag_id}
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface FeedbackCategory {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedbackTag {
  id: string;
  tenant_id: string;
  name: string;
  color?: string;
  description?: string;
  usage_count: number;
  created_at: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  sort_order?: number;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
  description?: string;
}

export const categoryApi = {
  // ==================== 分类管理 ====================

  listCategories: async (): Promise<ApiResponse<FeedbackCategory[]>> => {
    return apiClient.feedback.get('/feedback/categories');
  },

  getCategory: async (id: string): Promise<ApiResponse<FeedbackCategory>> => {
    return apiClient.feedback.get(`/feedback/categories/${id}`);
  },

  createCategory: async (data: CreateCategoryRequest): Promise<ApiResponse<FeedbackCategory>> => {
    return apiClient.feedback.post('/feedback/categories', data);
  },

  updateCategory: async (
    id: string,
    data: Partial<CreateCategoryRequest>
  ): Promise<ApiResponse<FeedbackCategory>> => {
    return apiClient.feedback.put(`/feedback/categories/${id}`, data);
  },

  deleteCategory: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.feedback.delete(`/feedback/categories/${id}`);
  },

  // ==================== 标签管理 ====================

  listTags: async (): Promise<ApiResponse<FeedbackTag[]>> => {
    return apiClient.feedback.get('/feedback/tags');
  },

  createTag: async (data: CreateTagRequest): Promise<ApiResponse<FeedbackTag>> => {
    return apiClient.feedback.post('/feedback/tags', data);
  },

  updateTag: async (
    id: string,
    data: Partial<CreateTagRequest>
  ): Promise<ApiResponse<FeedbackTag>> => {
    return apiClient.feedback.put(`/feedback/tags/${id}`, data);
  },

  deleteTag: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.feedback.delete(`/feedback/tags/${id}`);
  },

  addTagToFeedback: async (feedbackId: string, tagId: string): Promise<ApiResponse<void>> => {
    return apiClient.feedback.post(`/feedbacks/${feedbackId}/tags`, {
      tag_id: tagId,
    });
  },

  removeTagFromFeedback: async (feedbackId: string, tagId: string): Promise<ApiResponse<void>> => {
    return apiClient.feedback.delete(`/feedbacks/${feedbackId}/tags/${tagId}`);
  },

  bulkAddTagsToFeedback: async (
    feedbackId: string,
    tagIds: string[]
  ): Promise<ApiResponse<void>> => {
    return apiClient.feedback.post(`/feedbacks/${feedbackId}/tags/bulk`, {
      tag_ids: tagIds,
    });
  },
};

export default categoryApi;
