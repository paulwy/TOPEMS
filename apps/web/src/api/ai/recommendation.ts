import apiClient from '../client';
import type { ApiResponse } from '../client';

export const recommendationApi = {
  getRecommendations: async (data: {
    user_id?: string;
    scene: string;
    context?: Record<string, any>;
    limit?: number;
  }): Promise<
    ApiResponse<{
      recommendations: Array<{
        id: string;
        title: string;
        description?: string;
        type: string;
        score: number;
        reason?: string;
      }>;
    }>
  > => {
    return apiClient.ai.post('/api/ai/recommendations', data);
  },

  getPersonalizedRecommendations: async (
    type: 'content' | 'products' | 'features',
    limit?: number
  ): Promise<
    ApiResponse<{
      items: Array<{
        id: string;
        title: string;
        description?: string;
        relevance_score: number;
        metadata?: Record<string, any>;
      }>;
    }>
  > => {
    return apiClient.ai.get(
      `/api/ai/recommendations/personalized?type=${type}&limit=${limit || 10}`
    );
  },

  recordRecommendationFeedback: async (data: {
    recommendation_id: string;
    action: 'click' | 'like' | 'dislike' | 'convert';
    user_id?: string;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.ai.post('/api/ai/recommendations/feedback', data);
  },
};
