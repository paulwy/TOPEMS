import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { DocumentQAAnswer, DocumentQAQuestionRequest, QAHistoryItem } from './types';

export const qaApi = {
  documentQA: async (data: DocumentQAQuestionRequest): Promise<ApiResponse<DocumentQAAnswer>> => {
    return apiClient.ai.post<DocumentQAAnswer>('/api/v1/documents/qa', data);
  },

  ask: async (data: {
    question: string;
    top_k?: number;
  }): Promise<
    ApiResponse<{
      answer: string;
      sources: Array<{
        title: string;
        url?: string;
        content?: string;
      }>;
      qa_id: string;
      confidence: number;
    }>
  > => {
    return apiClient.ai.post('/api/ai/qa/ask', data);
  },

  askWithContext: async (data: {
    question: string;
    document_ids: string[];
    top_k?: number;
  }): Promise<
    ApiResponse<{
      answer: string;
      sources: Array<{
        title: string;
        url?: string;
        content?: string;
      }>;
      qa_id: string;
      confidence: number;
    }>
  > => {
    return apiClient.ai.post('/api/ai/qa/ask-with-context', data);
  },

  askStructured: async (data: {
    question: string;
    document_ids?: string[];
    top_k?: number;
  }): Promise<
    ApiResponse<{
      answer: string;
      question_type: string;
      confidence: number;
      sources: string[];
      follow_up_questions: string[];
    }>
  > => {
    return apiClient.ai.post('/api/ai/qa/ask-structured', data);
  },

  askConversation: async (data: {
    question: string;
    history: { question: string; answer: string }[];
    document_ids?: string[];
    top_k?: number;
  }): Promise<
    ApiResponse<{
      answer: string;
      sources: Array<{
        title: string;
        url?: string;
        content?: string;
      }>;
      qa_id: string;
      confidence: number;
    }>
  > => {
    return apiClient.ai.post('/api/ai/qa/ask-conversation', data);
  },

  classifyQuestion: async (data: {
    question: string;
  }): Promise<ApiResponse<{ question_type: string }>> => {
    return apiClient.ai.post('/api/ai/qa/classify', data);
  },

  getQAHistory: async (params?: {
    page?: number;
    pagesize?: number;
    query?: string;
  }): Promise<ApiResponse<{ history: QAHistoryItem[]; total: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.query) searchParams.set('query', params.query);

    const queryString = searchParams.toString();
    return apiClient.ai.get(`/api/ai/qa/history${queryString ? `?${queryString}` : ''}`);
  },

  deleteQAHistory: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/api/ai/qa/history/${id}`);
  },

  batchDeleteQAHistory: async (
    ids: string[]
  ): Promise<ApiResponse<{ deleted_count: number; message: string }>> => {
    return apiClient.ai.post('/api/ai/qa/history/batch-delete', { ids });
  },

  submitFeedback: async (data: {
    qa_id: string;
    feedback: string;
    rating?: number;
  }): Promise<ApiResponse<{ qa_id: string; message: string }>> => {
    return apiClient.ai.post('/api/ai/qa/feedback', data);
  },
};
