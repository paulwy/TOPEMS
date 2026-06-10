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
} from '../types/ai';

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
  listDocuments: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Document>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);

    const queryString = searchParams.toString();
    return apiClient.ai.get(`/api/v1/documents${queryString ? '?' + queryString : ''}`);
  },

  getDocument: async (id: string): Promise<ApiResponse<Document>> => {
    return apiClient.ai.get(`/api/v1/documents/${id}`);
  },

  createDocument: async (data: Partial<Document>): Promise<ApiResponse<Document>> => {
    return apiClient.ai.post('/api/v1/documents', data);
  },

  updateDocument: async (id: string, data: Partial<Document>): Promise<ApiResponse<Document>> => {
    return apiClient.ai.put(`/api/v1/documents/${id}`, data);
  },

  deleteDocument: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/api/v1/documents/${id}`);
  },

  chat: async (data: ChatRequest): Promise<ApiResponse<ChatResponse>> => {
    return apiClient.ai.post<ChatResponse>('/api/v1/ai/chat', data);
  },

  search: async (data: SearchRequest): Promise<ApiResponse<SearchResult>> => {
    return apiClient.ai.post<SearchResult>('/api/v1/ai/search', data);
  },

  generate: async (data: AIGenerateRequest): Promise<ApiResponse<AIGenerateResponse>> => {
    return apiClient.ai.post<AIGenerateResponse>('/api/v1/ai/generate', data);
  },

  listConversations: async (): Promise<ApiResponse<Conversation[]>> => {
    return apiClient.ai.get<Conversation[]>('/api/v1/conversations');
  },

  getConversation: async (id: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.ai.get(`/api/v1/conversations/${id}`);
  },

  createConversation: async (title?: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.ai.post('/api/v1/conversations', { title });
  },

  deleteConversation: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/api/v1/conversations/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.ai.get<string>('/health');
  },

  validate: async (data: ValidateRequest): Promise<ApiResponse<ValidateResponse>> => {
    return apiClient.ai.post<ValidateResponse>('/api/v1/ai/validate', data);
  },

  complete: async (data: CompleteRequest): Promise<ApiResponse<CompleteResponse>> => {
    return apiClient.ai.post<CompleteResponse>('/api/v1/ai/complete', data);
  },

  summarize: async (data: SummarizeRequest): Promise<ApiResponse<SummarizeResponse>> => {
    return apiClient.ai.post<SummarizeResponse>('/api/v1/ai/summarize', data);
  },

  listTemplates: async (): Promise<ApiResponse<AITemplate[]>> => {
    return apiClient.ai.get<AITemplate[]>('/api/v1/ai/templates');
  },

  // 分析相关接口
  analyzeSentiment: async (data: SentimentAnalysisRequest): Promise<ApiResponse<SentimentAnalysisResponse>> => {
    return apiClient.ai.post<SentimentAnalysisResponse>('/api/v1/analysis/sentiment', data);
  },

  classifyText: async (data: ClassifyTextRequest): Promise<ApiResponse<ClassifyTextResponse>> => {
    return apiClient.ai.post<ClassifyTextResponse>('/api/v1/analysis/classify', data);
  },

  extractEntities: async (data: ExtractEntitiesRequest): Promise<ApiResponse<ExtractEntitiesResponse>> => {
    return apiClient.ai.post<ExtractEntitiesResponse>('/api/v1/analysis/entities', data);
  },

  extractKeywords: async (data: ExtractKeywordsRequest): Promise<ApiResponse<ExtractKeywordsResponse>> => {
    return apiClient.ai.post<ExtractKeywordsResponse>('/api/v1/analysis/keywords', data);
  },
};
