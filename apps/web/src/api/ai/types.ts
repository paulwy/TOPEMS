import type { ApiResponse, PaginationParams as BasePaginationParams } from '../client';
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

interface DocumentQASource {
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
  result: Record<string, unknown>;
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
  context?: Record<string, unknown>;
}

export interface ChatResponse {
  answer: string;
  conversation_id: string;
  sources?: DocumentSource[];
}

interface DocumentSource {
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

interface CategoryScore {
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

interface Keyword {
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
  context?: Record<string, unknown>;
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
  variables: Record<string, unknown>;
  outputformat?: 'text' | 'json' | 'markdown';
}

export interface AIGenerateResponse {
  content: string;
  format: string;
}

export interface PaginationParams extends BasePaginationParams {
  category?: string;
}

export type { PaginatedResult } from '@/api/client';

// ========== Dify API 类型定义 ==========

export interface DifyHealthResponse {
  status: string;
  version?: string;
  timestamp?: string;
}

export interface DifyInfoResponse {
  name: string;
  description?: string;
  app_id?: string;
  icon?: string;
  tags?: string[];
  tenant?: string;
  status?: string;
  endpoint?: string;
  supported_models?: string[];
  features?: Record<string, boolean>;
  meta?: Record<string, unknown>;
}

interface DifyParameter {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'paragraph';
  required?: boolean;
  default?: unknown;
  options?: string[];
  placeholder?: string;
  description?: string;
  min?: number;
  max?: number;
}

export interface DifyParametersResponse {
  user_input_form: DifyParameter[][];
  opening_statement?: string;
  suggested_questions?: string[];
  suggested_questions_after_answer?: boolean;
  retriever_resource?: boolean;
  speech_to_text?: boolean;
  text_to_speech?: boolean;
  file_upload?: {
    image?: {
      enabled?: boolean;
      number_limits?: number;
      detail?: string;
      transfer_methods?: string[];
    };
    allowed_file_types?: string[];
    allowed_file_extensions?: string[];
    allowed_file_upload_methods?: string[];
    number_limits?: number;
  };
}

export interface DifyMetaResponse {
  tool_icons?: Record<string, string>;
  next_variable_overwrite_enabled?: boolean;
  dataset_configs?: Record<string, unknown>;
  file_upload?: Record<string, unknown>;
  system_parameters?: Record<string, unknown>;
}

export interface DifyConversation {
  id: string;
  name: string;
  inputs?: Record<string, unknown>;
  status: string;
  introduction?: string;
  created_at: string;
  updated_at?: string;
}

export interface DifyMessage {
  id: string;
  conversation_id: string;
  query?: string;
  answer: string;
  role: 'user' | 'assistant';
  created_at: string;
  updated_at?: string;
  feedback?: DifyFeedbackResult | null;
  error?: string | null;
  inputs?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface DifyListConversationsParams {
  user?: string;
  last_id?: string;
  limit?: number;
  pinned?: boolean;
}

export interface DifyListConversationsResponse {
  page?: number;
  limit?: number;
  total?: number;
  has_more?: boolean;
  data: DifyConversation[];
}

export interface DifyListMessagesParams {
  conversation_id: string;
  user?: string;
  first_id?: string;
  limit?: number;
}

export interface DifyListMessagesResponse {
  has_more?: boolean;
  data: DifyMessage[];
}

export interface DifyChatRequest {
  query: string;
  user?: string;
  inputs?: Record<string, unknown>;
  conversation_id?: string;
  response_mode?: 'blocking' | 'streaming';
  files?: Array<{
    type: string;
    transfer_method: string;
    url?: string;
    upload_file_id?: string;
  }>;
  auto_generate_name?: boolean;
}

export interface DifyChatResponse {
  message_id: string;
  answer: string;
  conversation_id: string;
  mode?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  error?: string;
}

export interface DifyStreamEvent {
  event:
    | 'message'
    | 'message_replace'
    | 'message_end'
    | 'error'
    | 'ping'
    | 'workflow_started'
    | 'workflow_finished'
    | 'node_started'
    | 'node_finished'
    | 'tts_message'
    | 'tts_message_end'
    | 'agent_message'
    | 'agent_thought'
    | 'message_file';
  message_id?: string;
  conversation_id?: string;
  answer?: string;
  task_id?: string;
  error?: string;
  inputs?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at?: number;
}

export interface DifyFeedbackRequest {
  rating: 'like' | 'dislike' | null;
  user?: string;
  content?: string;
  type?: 'like' | 'dislike';
}

export interface DifyFeedbackResult {
  rating: 'like' | 'dislike' | null;
  content?: string;
  from_source?: string;
  username?: string;
  created_at?: string;
}

export interface DifyStopRequest {
  user?: string;
}

export interface DifyStopResponse {
  result: string;
  code?: number;
  message?: string;
}

export type {
  ValidateRequest,
  ValidateResponse,
  CompleteRequest,
  CompleteResponse,
  SummarizeRequest,
  SummarizeResponse,
  AITemplate,
};
