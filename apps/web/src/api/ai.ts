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
  filesize?: number;
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
  outputformat?: 'text' | 'json' | 'markdown';
}

export interface AIGenerateResponse {
  content: string;
  format: string;
}

export interface PaginationParams {
  page?: number;
  pagesize?: number;
  search?: string;
  category?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
}

export const aiApi = {
  listDocuments: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResult<Document>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);

    const queryString = searchParams.toString();
    return apiClient.ai.get(`/documents${queryString ? `?${queryString}` : ''}`);
  },

  getDocument: async (id: string): Promise<ApiResponse<Document>> => {
    return apiClient.ai.get(`/documents/${id}`);
  },

  createDocument: async (data: Partial<Document>): Promise<ApiResponse<Document>> => {
    return apiClient.ai.post('/documents', data);
  },

  updateDocument: async (id: string, data: Partial<Document>): Promise<ApiResponse<Document>> => {
    return apiClient.ai.put(`/documents/${id}`, data);
  },

  deleteDocument: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/documents/${id}`);
  },

  chat: async (data: ChatRequest): Promise<ApiResponse<ChatResponse>> => {
    return apiClient.ai.post<ChatResponse>('/ai/chat', data);
  },

  search: async (data: SearchRequest): Promise<ApiResponse<SearchResult>> => {
    return apiClient.ai.post<SearchResult>('/ai/search', data);
  },

  generate: async (data: AIGenerateRequest): Promise<ApiResponse<AIGenerateResponse>> => {
    return apiClient.ai.post<AIGenerateResponse>('/ai/generate', data);
  },

  listConversations: async (): Promise<ApiResponse<Conversation[]>> => {
    return apiClient.ai.get<Conversation[]>('/conversations');
  },

  getConversation: async (id: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.ai.get(`/conversations/${id}`);
  },

  createConversation: async (title?: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.ai.post('/conversations', { title });
  },

  deleteConversation: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/conversations/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.ai.get<string>('/health');
  },

  validate: async (data: ValidateRequest): Promise<ApiResponse<ValidateResponse>> => {
    return apiClient.ai.post<ValidateResponse>('/ai/validate', data);
  },

  complete: async (data: CompleteRequest): Promise<ApiResponse<CompleteResponse>> => {
    return apiClient.ai.post<CompleteResponse>('/ai/complete', data);
  },

  summarize: async (data: SummarizeRequest): Promise<ApiResponse<SummarizeResponse>> => {
    return apiClient.ai.post<SummarizeResponse>('/ai/summarize', data);
  },

  listTemplates: async (): Promise<ApiResponse<AITemplate[]>> => {
    return apiClient.ai.get<AITemplate[]>('/ai/templates');
  },

  // 分析相关接口
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

  // 文档问答接口
  documentQA: async (data: DocumentQAQuestionRequest): Promise<ApiResponse<DocumentQAAnswer>> => {
    return apiClient.ai.post<DocumentQAAnswer>('/v1/documents/qa', data);
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
    return apiClient.ai.post('/qa/ask', data);
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
    return apiClient.ai.post('/qa/ask-with-context', data);
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
    return apiClient.ai.post('/qa/ask-structured', data);
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
    return apiClient.ai.post('/qa/ask-conversation', data);
  },

  classifyQuestion: async (data: {
    question: string;
  }): Promise<ApiResponse<{ question_type: string }>> => {
    return apiClient.ai.post('/qa/classify', data);
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
    return apiClient.ai.get(`/qa/history${queryString ? `?${queryString}` : ''}`);
  },

  deleteQAHistory: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/qa/history/${id}`);
  },

  batchDeleteQAHistory: async (
    ids: string[]
  ): Promise<ApiResponse<{ deleted_count: number; message: string }>> => {
    return apiClient.ai.post('/qa/history/batch-delete', { ids });
  },

  submitFeedback: async (data: {
    qa_id: string;
    feedback: string;
    rating?: number;
  }): Promise<ApiResponse<{ qa_id: string; message: string }>> => {
    return apiClient.ai.post('/qa/feedback', data);
  },

  // 文档摘要接口
  summarizeDocument: async (
    id: string,
    data?: SummarizeDocumentRequest
  ): Promise<ApiResponse<SummarizeDocumentResponse>> => {
    return apiClient.ai.post<SummarizeDocumentResponse>(
      `/v1/documents/${id}/summarize`,
      data || {}
    );
  },

  // 提取文档关键点接口
  extractKeyPoints: async (
    id: string,
    data?: ExtractKeyPointsRequest
  ): Promise<ApiResponse<ExtractKeyPointsResponse>> => {
    return apiClient.ai.post<ExtractKeyPointsResponse>(
      `/v1/documents/${id}/key-points`,
      data || {}
    );
  },

  // 文档提取接口
  extractDocument: async (
    id: string,
    data: ExtractDocumentRequest
  ): Promise<ApiResponse<ExtractDocumentResponse>> => {
    return apiClient.ai.post<ExtractDocumentResponse>(`/v1/documents/${id}/extract`, data);
  },

  // ========== 向量搜索模块 ==========
  vectorSearch: async (data: {
    query: string;
    collection?: string;
    top_k?: number;
    filters?: Record<string, any>;
  }): Promise<
    ApiResponse<{
      results: Array<{
        id: string;
        content: string;
        metadata: Record<string, any>;
        similarity: number;
        document_title?: string;
      }>;
      total: number;
      query_time_ms: number;
    }>
  > => {
    return apiClient.ai.post('/vector/search', data);
  },

  getVectorCollections: async (): Promise<
    ApiResponse<
      Array<{
        id: string;
        name: string;
        description?: string;
        document_count: number;
        vector_count: number;
        created_at: string;
        updated_at: string;
      }>
    >
  > => {
    return apiClient.ai.get('/vector/collections');
  },

  createVectorCollection: async (data: {
    name: string;
    description?: string;
    embedding_model?: string;
  }): Promise<ApiResponse<{ id: string; name: string }>> => {
    return apiClient.ai.post('/vector/collections', data);
  },

  deleteVectorCollection: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/vector/collections/${id}`);
  },

  indexDocument: async (
    documentId: string,
    collectionId?: string
  ): Promise<
    ApiResponse<{
      document_id: string;
      chunks_indexed: number;
      status: string;
    }>
  > => {
    return apiClient.ai.post(`/vector/index/${documentId}`, { collection_id: collectionId });
  },

  // ========== 文档智能模块 ==========
  translateDocument: async (
    id: string,
    data: {
      target_language: string;
      source_language?: string;
    }
  ): Promise<
    ApiResponse<{
      document_id: string;
      translated_content: string;
      target_language: string;
      source_language: string;
    }>
  > => {
    return apiClient.ai.post(`/documents/${id}/translate`, data);
  },

  ocrDocument: async (
    id: string
  ): Promise<
    ApiResponse<{
      document_id: string;
      text: string;
      pages: number;
      confidence: number;
    }>
  > => {
    return apiClient.ai.post(`/documents/${id}/ocr`);
  },

  classifyDocument: async (
    id: string
  ): Promise<
    ApiResponse<{
      document_id: string;
      category: string;
      confidence: number;
      all_categories?: Array<{ category: string; score: number }>;
    }>
  > => {
    return apiClient.ai.post(`/documents/${id}/classify`);
  },

  extractDocumentEntities: async (
    id: string
  ): Promise<
    ApiResponse<{
      document_id: string;
      entities: Entity[];
    }>
  > => {
    return apiClient.ai.post(`/documents/${id}/entities`);
  },

  // ========== 代码助手模块 ==========
  generateCode: async (data: {
    prompt: string;
    language?: string;
    framework?: string;
    context?: string;
  }): Promise<
    ApiResponse<{
      code: string;
      language: string;
      explanation: string;
    }>
  > => {
    return apiClient.ai.post('/code/generate', data);
  },

  explainCode: async (data: {
    code: string;
    language?: string;
  }): Promise<
    ApiResponse<{
      explanation: string;
      summary: string;
      key_points: string[];
    }>
  > => {
    return apiClient.ai.post('/code/explain', data);
  },

  fixCodeBug: async (data: {
    code: string;
    error_message?: string;
    language?: string;
  }): Promise<
    ApiResponse<{
      fixed_code: string;
      explanation: string;
      bug_description: string;
    }>
  > => {
    return apiClient.ai.post('/code/fix-bug', data);
  },

  optimizeCode: async (data: {
    code: string;
    optimization_type?: 'performance' | 'readability' | 'security';
    language?: string;
  }): Promise<
    ApiResponse<{
      optimized_code: string;
      explanation: string;
      improvements: string[];
    }>
  > => {
    return apiClient.ai.post('/code/optimize', data);
  },

  reviewCode: async (data: {
    code: string;
    language?: string;
    standards?: string[];
  }): Promise<
    ApiResponse<{
      issues: Array<{
        severity: 'critical' | 'warning' | 'info';
        line?: number;
        description: string;
        suggestion: string;
      }>;
      summary: string;
      score: number;
    }>
  > => {
    return apiClient.ai.post('/code/review', data);
  },

  // ========== 智能推荐模块 ==========
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
    return apiClient.ai.post('/recommendations', data);
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
    return apiClient.ai.get(`/recommendations/personalized?type=${type}&limit=${limit || 10}`);
  },

  recordRecommendationFeedback: async (data: {
    recommendation_id: string;
    action: 'click' | 'like' | 'dislike' | 'convert';
    user_id?: string;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.ai.post('/recommendations/feedback', data);
  },

  // ========== 模型管理模块 ==========
  listModels: async (): Promise<
    ApiResponse<
      Array<{
        id: string;
        name: string;
        provider: string;
        type: 'chat' | 'embedding' | 'image' | 'audio';
        description?: string;
        status: 'active' | 'inactive' | 'maintenance';
        max_tokens?: number;
        pricing?: {
          input_per_1k?: number;
          output_per_1k?: number;
        };
        capabilities?: string[];
      }>
    >
  > => {
    return apiClient.ai.get('/models');
  },

  getModelConfig: async (
    modelId: string
  ): Promise<
    ApiResponse<{
      model_id: string;
      temperature: number;
      max_tokens: number;
      top_p: number;
      frequency_penalty: number;
      presence_penalty: number;
      system_prompt?: string;
    }>
  > => {
    return apiClient.ai.get(`/models/${modelId}/config`);
  },

  updateModelConfig: async (
    modelId: string,
    data: Partial<{
      temperature: number;
      max_tokens: number;
      top_p: number;
      frequency_penalty: number;
      presence_penalty: number;
      system_prompt: string;
    }>
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.ai.put(`/models/${modelId}/config`, data);
  },

  getUsageStats: async (params?: {
    start_date?: string;
    end_date?: string;
    model_id?: string;
    group_by?: 'day' | 'week' | 'month';
  }): Promise<
    ApiResponse<{
      total_tokens: number;
      total_requests: number;
      total_cost: number;
      breakdown: Array<{
        date: string;
        model_id: string;
        tokens: number;
        requests: number;
        cost: number;
      }>;
    }>
  > => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.model_id) searchParams.set('model_id', params.model_id);
    if (params?.group_by) searchParams.set('group_by', params.group_by);
    const queryString = searchParams.toString();
    return apiClient.ai.get(`/models/usage${queryString ? `?${queryString}` : ''}`);
  },

  // ========== Prompt 模板模块 ==========
  listPromptTemplates: async (
    params?: PaginationParams & {
      category?: string;
      is_favorite?: boolean;
    }
  ): Promise<
    ApiResponse<
      PaginatedResult<
        AITemplate & {
          is_favorite?: boolean;
          usage_count?: number;
        }
      >
    >
  > => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.is_favorite !== undefined)
      searchParams.set('is_favorite', String(params.is_favorite));
    const queryString = searchParams.toString();
    return apiClient.ai.get(`/prompts/templates${queryString ? `?${queryString}` : ''}`);
  },

  getPromptTemplate: async (
    id: string
  ): Promise<
    ApiResponse<
      AITemplate & {
        is_favorite?: boolean;
        usage_count?: number;
        created_at?: string;
        updated_at?: string;
      }
    >
  > => {
    return apiClient.ai.get(`/prompts/templates/${id}`);
  },

  createPromptTemplate: async (data: Partial<AITemplate>): Promise<ApiResponse<AITemplate>> => {
    return apiClient.ai.post('/prompts/templates', data);
  },

  updatePromptTemplate: async (
    id: string,
    data: Partial<AITemplate>
  ): Promise<ApiResponse<AITemplate>> => {
    return apiClient.ai.put(`/prompts/templates/${id}`, data);
  },

  deletePromptTemplate: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/prompts/templates/${id}`);
  },

  togglePromptFavorite: async (
    id: string
  ): Promise<
    ApiResponse<{
      id: string;
      is_favorite: boolean;
    }>
  > => {
    return apiClient.ai.post(`/prompts/templates/${id}/favorite`);
  },

  getPromptCategories: async (): Promise<
    ApiResponse<
      Array<{
        id: string;
        name: string;
        count: number;
      }>
    >
  > => {
    return apiClient.ai.get('/prompts/categories');
  },

  usePromptTemplate: async (
    id: string,
    variables: Record<string, any>
  ): Promise<
    ApiResponse<{
      result: string;
      formatted_prompt: string;
    }>
  > => {
    return apiClient.ai.post(`/prompts/templates/${id}/use`, { variables });
  },

  // ========== 对话聊天增强模块 ==========
  updateConversation: async (
    id: string,
    data: {
      title?: string;
      model_id?: string;
      system_prompt?: string;
    }
  ): Promise<ApiResponse<Conversation>> => {
    return apiClient.ai.put(`/conversations/${id}`, data);
  },

  getConversationMessages: async (
    id: string,
    params?: {
      limit?: number;
      before?: string;
    }
  ): Promise<ApiResponse<Message[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.before) searchParams.set('before', params.before);
    const queryString = searchParams.toString();
    return apiClient.ai.get(`/conversations/${id}/messages${queryString ? `?${queryString}` : ''}`);
  },

  regenerateMessage: async (
    conversationId: string,
    messageId: string
  ): Promise<ApiResponse<ChatResponse>> => {
    return apiClient.ai.post(`/conversations/${conversationId}/messages/${messageId}/regenerate`);
  },

  // ========== AI 仪表盘统计 ==========
  getDashboardStats: async (): Promise<
    ApiResponse<{
      total_conversations: number;
      total_messages: number;
      total_documents: number;
      total_tokens: number;
      active_users: number;
      satisfaction_rate: number;
      trend: {
        conversations: number;
        messages: number;
        tokens: number;
      };
    }>
  > => {
    return apiClient.ai.get('/dashboard/stats');
  },

  getActivityTrend: async (params?: {
    days?: number;
    group_by?: 'day' | 'hour';
  }): Promise<
    ApiResponse<
      Array<{
        date: string;
        conversations: number;
        messages: number;
        tokens: number;
      }>
    >
  > => {
    const searchParams = new URLSearchParams();
    if (params?.days) searchParams.set('days', params.days.toString());
    if (params?.group_by) searchParams.set('group_by', params.group_by);
    const queryString = searchParams.toString();
    return apiClient.ai.get(`/dashboard/activity-trend${queryString ? `?${queryString}` : ''}`);
  },

  getFeatureUsage: async (): Promise<
    ApiResponse<
      Array<{
        feature: string;
        label: string;
        count: number;
        percentage: number;
      }>
    >
  > => {
    return apiClient.ai.get('/dashboard/feature-usage');
  },
};
