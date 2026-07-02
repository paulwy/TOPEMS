import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  SentimentAnalysisRequest,
  SentimentAnalysisResponse,
  ClassifyTextRequest,
  ClassifyTextResponse,
  ExtractEntitiesRequest,
  ExtractEntitiesResponse,
  ExtractKeywordsRequest,
  ExtractKeywordsResponse,
} from './types';

export const analysisApi = {
  analyzeSentiment: async (
    data: SentimentAnalysisRequest
  ): Promise<ApiResponse<SentimentAnalysisResponse>> => {
    return apiClient.ai.post<SentimentAnalysisResponse>('/analysis/sentiment', data);
  },

  classifyText: async (data: ClassifyTextRequest): Promise<ApiResponse<ClassifyTextResponse>> => {
    return apiClient.ai.post<ClassifyTextResponse>('/analysis/classify', data);
  },

  extractEntities: async (
    data: ExtractEntitiesRequest
  ): Promise<ApiResponse<ExtractEntitiesResponse>> => {
    return apiClient.ai.post<ExtractEntitiesResponse>('/analysis/entities', data);
  },

  extractKeywords: async (
    data: ExtractKeywordsRequest
  ): Promise<ApiResponse<ExtractKeywordsResponse>> => {
    return apiClient.ai.post<ExtractKeywordsResponse>('/analysis/keywords', data);
  },
};
