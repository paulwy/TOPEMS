import apiClient from './client';
import type { ApiResponse } from './client';
import { API_PATHS } from '../utils/apiPath';

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  views: number;
  isActive: boolean;
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
  isActive?: boolean;
  sort_order?: number;
}

export interface Guide {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  lessons_count: number;
  isActive: boolean;
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
  isActive: boolean;
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
    return apiClient.get<FaqListResponse>(API_PATHS.help.faqs, { params });
  },

  async getFaq(id: string): Promise<ApiResponse<Faq>> {
    return apiClient.get<Faq>(API_PATHS.help.faq(id));
  },

  async createFaq(data: CreateFaqRequest): Promise<ApiResponse<Faq>> {
    return apiClient.post<Faq>(API_PATHS.help.faqs, data);
  },

  async updateFaq(id: string, data: UpdateFaqRequest): Promise<ApiResponse<Faq>> {
    return apiClient.put<Faq>(API_PATHS.help.faq(id), data);
  },

  async deleteFaq(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete<boolean>(API_PATHS.help.faq(id));
  },

  async getFaqCategories(): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(API_PATHS.help.faqCategories);
  },

  async listGuides(params?: GuideQuery): Promise<ApiResponse<GuideListResponse>> {
    return apiClient.get<GuideListResponse>(API_PATHS.help.guides, { params });
  },

  async getGuide(id: string): Promise<ApiResponse<GuideDetailResponse>> {
    return apiClient.get<GuideDetailResponse>(API_PATHS.help.guide(id));
  },

  async createGuide(data: CreateGuideRequest): Promise<ApiResponse<Guide>> {
    return apiClient.post<Guide>(API_PATHS.help.guides, data);
  },

  async addLesson(guideId: string, data: CreateLessonRequest): Promise<ApiResponse<GuideLesson>> {
    return apiClient.post<GuideLesson>(`${API_PATHS.help.guide(guideId)}/lessons`, data);
  },

  async getGuideCategories(): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(API_PATHS.help.guideCategories);
  },
};
