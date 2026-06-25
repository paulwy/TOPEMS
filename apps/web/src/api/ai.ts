import apiClient from './client';
import type { ApiResponse } from './client';
import type {
  ValidateRequest,
  ValidateResponse,
  CompleteRequest,
  CompleteResponse,
  SummarizeRequest,
  SummarizeResponse,
  AITemplate,
} from '@/types/ai';

export interface Document {
  id: string;
  title: string;
  content: string;
  filename: string;
  path: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  status?: string;
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  description?: string;
  error_message?: string;
}

export interface DocumentQAAnswer {
  answer: string;
  confidence: number;
  sources: DocumentQASource[];
  follow_up_questions: string[];
}

export interface DocumentQASource {
  document_id: string;
  document_title: string;
  chunk_content: string;
  similarity: number;
}

export interface DocumentQAQuestionRequest {
  question: string;
  document_ids?: string[];
  top_k?: number;
}

export interface ExtractDocumentRequest {
  extract_type: string;
}

export interface ExtractDocumentResponse {
  document_id: string;
  extract_type: string;
  result: Record<string, any>;
}

export interface SummarizeDocumentRequest {
  max_length?: number;
}

export interface SummarizeDocumentResponse {
  document_id: string;
  summary: string;
}

export interface ExtractKeyPointsRequest {
  max_points?: number;
}

export interface ExtractKeyPointsResponse {
  document_id: string;
  key_points: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  query: string;
  conversation_id?: string;
  context?: Record<string, any>;
}

export interface ChatResponse {
  answer: string;
  conversation_id: string;
  sources?: DocumentSource[];
}

export interface DocumentSource {
  document_id: string;
  title: string;
  snippet: string;
  relevance_score: number;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  filters?: Record<string, string>;
}

export interface SearchResult {
  documents: Document[];
  total: number;
  query_time_ms: number;
}

// 分析相关类型
export interface SentimentAnalysisRequest {
  text: string;
}

export interface SentimentAnalysisResponse {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  details?: {
    positive_words?: string[];
    negative_words?: string[];
    emotional_intensity?: number;
  };
}

export interface ClassifyTextRequest {
  text: string;
  categories?: string[];
}

export interface CategoryScore {
  category: string;
  score: number;
}

export interface ClassifyTextResponse {
  category: string;
  confidence: number;
  all_categories?: CategoryScore[];
}

export interface ExtractEntitiesRequest {
  text: string;
  entity_types?: string[];
}

export interface Entity {
  text: string;
  entity_type: string;
  start_pos?: number;
  end_pos?: number;
  confidence: number;
}

export interface ExtractEntitiesResponse {
  entities: Entity[];
}

export interface ExtractKeywordsRequest {
  text: string;
  max_keywords?: number;
}

export interface Keyword {
  text: string;
  score: number;
  frequency: number;
}

export interface ExtractKeywordsResponse {
  keywords: Keyword[];
}

export interface QAHistoryItem {
  id: string;
  question: string;
  answer: string;
  context?: Record<string, any>;
  sources?: Array<{
    title: string;
    url?: string;
    content?: string;
  }>;
  feedback?: string;
  rating?: number;
  created_at: string;
}

export interface AIGenerateRequest {
  template_id?: string;
  variables: Record<string, any>;
  output_format?: 'text' | 'json' | 'markdown';
}

export interface AIGenerateResponse {
  content: string;
  format: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const aiApi = {
  listDocuments: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResult<Document>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);

    const queryString = searchParams.toString();
    return apiClient.ai.get(`/api/ai/documents${queryString ? '?' + queryString : ''}`);
  },

  getDocument: async (id: string): Promise<ApiResponse<Document>> => {
    return apiClient.ai.get(`/api/ai/documents/${id}`);
  },

  createDocument: async (data: Partial<Document>): Promise<ApiResponse<Document>> => {
    return apiClient.ai.post('/api/ai/documents', data);
  },

  updateDocument: async (id: string, data: Partial<Document>): Promise<ApiResponse<Document>> => {
    return apiClient.ai.put(`/api/ai/documents/${id}`, data);
  },

  deleteDocument: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/api/ai/documents/${id}`);
  },

  chat: async (data: ChatRequest): Promise<ApiResponse<ChatResponse>> => {
    return apiClient.ai.post<ChatResponse>('/api/ai/ai/chat', data);
  },

  search: async (data: SearchRequest): Promise<ApiResponse<SearchResult>> => {
    return apiClient.ai.post<SearchResult>('/api/ai/ai/search', data);
  },

  generate: async (data: AIGenerateRequest): Promise<ApiResponse<AIGenerateResponse>> => {
    return apiClient.ai.post<AIGenerateResponse>('/api/ai/ai/generate', data);
  },

  listConversations: async (): Promise<ApiResponse<Conversation[]>> => {
    return apiClient.ai.get<Conversation[]>('/api/ai/conversations');
  },

  getConversation: async (id: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.ai.get(`/api/ai/conversations/${id}`);
  },

  createConversation: async (title?: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.ai.post('/api/ai/conversations', { title });
  },

  deleteConversation: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/api/ai/conversations/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.ai.get<string>('/health');
  },

  validate: async (data: ValidateRequest): Promise<ApiResponse<ValidateResponse>> => {
    return apiClient.ai.post<ValidateResponse>('/api/ai/ai/validate', data);
  },

  complete: async (data: CompleteRequest): Promise<ApiResponse<CompleteResponse>> => {
    return apiClient.ai.post<CompleteResponse>('/api/ai/ai/complete', data);
  },

  summarize: async (data: SummarizeRequest): Promise<ApiResponse<SummarizeResponse>> => {
    return apiClient.ai.post<SummarizeResponse>('/api/ai/ai/summarize', data);
  },

  listTemplates: async (): Promise<ApiResponse<AITemplate[]>> => {
    return apiClient.ai.get<AITemplate[]>('/api/ai/ai/templates');
  },

  // 分析相关接口
  analyzeSentiment: async (
    data: SentimentAnalysisRequest
  ): Promise<ApiResponse<SentimentAnalysisResponse>> => {
    return apiClient.ai.post<SentimentAnalysisResponse>('/api/ai/analysis/sentiment', data);
  },

  classifyText: async (data: ClassifyTextRequest): Promise<ApiResponse<ClassifyTextResponse>> => {
    return apiClient.ai.post<ClassifyTextResponse>('/api/ai/analysis/classify', data);
  },

  extractEntities: async (
    data: ExtractEntitiesRequest
  ): Promise<ApiResponse<ExtractEntitiesResponse>> => {
    return apiClient.ai.post<ExtractEntitiesResponse>('/api/ai/analysis/entities', data);
  },

  extractKeywords: async (
    data: ExtractKeywordsRequest
  ): Promise<ApiResponse<ExtractKeywordsResponse>> => {
    return apiClient.ai.post<ExtractKeywordsResponse>('/api/ai/analysis/keywords', data);
  },

  // 文档问答接口
  documentQA: async (data: DocumentQAQuestionRequest): Promise<ApiResponse<DocumentQAAnswer>> => {
    return apiClient.ai.post<DocumentQAAnswer>('/api/v1/documents/qa', data);
  },

  // 智能问答接口
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
    page_size?: number;
    query?: string;
  }): Promise<ApiResponse<{ history: QAHistoryItem[]; total: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.query) searchParams.set('query', params.query);

    const queryString = searchParams.toString();
    return apiClient.ai.get(`/api/ai/qa/history${queryString ? '?' + queryString : ''}`);
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

  // 文档摘要接口
  summarizeDocument: async (
    id: string,
    data?: SummarizeDocumentRequest
  ): Promise<ApiResponse<SummarizeDocumentResponse>> => {
    return apiClient.ai.post<SummarizeDocumentResponse>(
      `/api/v1/documents/${id}/summarize`,
      data || {}
    );
  },

  // 提取文档关键点接口
  extractKeyPoints: async (
    id: string,
    data?: ExtractKeyPointsRequest
  ): Promise<ApiResponse<ExtractKeyPointsResponse>> => {
    return apiClient.ai.post<ExtractKeyPointsResponse>(
      `/api/v1/documents/${id}/key-points`,
      data || {}
    );
  },

  // 文档提取接口
  extractDocument: async (
    id: string,
    data: ExtractDocumentRequest
  ): Promise<ApiResponse<ExtractDocumentResponse>> => {
    return apiClient.ai.post<ExtractDocumentResponse>(`/api/v1/documents/${id}/extract`, data);
  },
};
