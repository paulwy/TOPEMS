import apiClient from './client';
import type { ApiResponse } from './client';

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  views: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FaqQuery {
  category?: string;
  keyword?: string;
  page?: number;
  page_size?: number;
}

export interface FaqListResponse {
  items: Faq[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateFaqRequest {
  question: string;
  answer: string;
  category: string;
  sort_order?: number;
}

export interface UpdateFaqRequest {
  question?: string;
  answer?: string;
  category?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface Guide {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  lessons_count: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GuideLesson {
  id: string;
  guide_id: string;
  title: string;
  content: string;
  duration: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface GuideProgress {
  guide_id: string;
  user_id: string;
  completed_lessons: string[];
  progress: number;
  completed_at?: string;
  updated_at: string;
}

export interface GuideQuery {
  category?: string;
  keyword?: string;
  page?: number;
  page_size?: number;
}

export interface GuideListResponse {
  items: Guide[];
  total: number;
  page: number;
  page_size: number;
}

export interface GuideDetailResponse {
  guide: Guide;
  lessons: GuideLesson[];
  progress?: GuideProgress;
}

export interface CreateGuideRequest {
  title: string;
  description: string;
  category: string;
  duration: string;
  lessons_count: number;
  sort_order?: number;
}

export interface CreateLessonRequest {
  title: string;
  content: string;
  duration: string;
  sort_order?: number;
}

export const helpApi = {
  async listFaqs(params?: FaqQuery): Promise<ApiResponse<FaqListResponse>> {
    return apiClient.get<FaqListResponse>('/api/core/help/faqs', { params });
  },

  async getFaq(id: string): Promise<ApiResponse<Faq>> {
    return apiClient.get<Faq>(`/api/core/help/faqs/${id}`);
  },

  async createFaq(data: CreateFaqRequest): Promise<ApiResponse<Faq>> {
    return apiClient.post<Faq>('/api/core/help/faqs', data);
  },

  async updateFaq(id: string, data: UpdateFaqRequest): Promise<ApiResponse<Faq>> {
    return apiClient.put<Faq>(`/api/core/help/faqs/${id}`, data);
  },

  async deleteFaq(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete<boolean>(`/api/core/help/faqs/${id}`);
  },

  async getFaqCategories(): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>('/api/core/help/faqs/categories');
  },

  async listGuides(params?: GuideQuery): Promise<ApiResponse<GuideListResponse>> {
    return apiClient.get<GuideListResponse>('/api/core/help/guides', { params });
  },

  async getGuide(id: string): Promise<ApiResponse<GuideDetailResponse>> {
    return apiClient.get<GuideDetailResponse>(`/api/core/help/guides/${id}`);
  },

  async createGuide(data: CreateGuideRequest): Promise<ApiResponse<Guide>> {
    return apiClient.post<Guide>('/api/core/help/guides', data);
  },

  async addLesson(guideId: string, data: CreateLessonRequest): Promise<ApiResponse<GuideLesson>> {
    return apiClient.post<GuideLesson>(`/api/core/help/guides/${guideId}/lessons`, data);
  },

  async getGuideCategories(): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>('/api/core/help/guides/categories');
  },
};
