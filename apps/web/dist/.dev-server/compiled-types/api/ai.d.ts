import type { ApiResponse } from "./client";
import type { ValidateRequest, ValidateResponse, CompleteRequest, CompleteResponse, SummarizeRequest, SummarizeResponse, AITemplate } from "@/types/ai";
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
    role: "user" | "assistant";
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
export interface SentimentAnalysisRequest {
    text: string;
}
export interface SentimentAnalysisResponse {
    sentiment: "positive" | "negative" | "neutral";
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
    output_format?: "text" | "json" | "markdown";
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
export declare const aiApi: {
    listDocuments: (params?: PaginationParams) => Promise<ApiResponse<PaginatedResult<Document>>>;
    getDocument: (id: string) => Promise<ApiResponse<Document>>;
    createDocument: (data: Partial<Document>) => Promise<ApiResponse<Document>>;
    updateDocument: (id: string, data: Partial<Document>) => Promise<ApiResponse<Document>>;
    deleteDocument: (id: string) => Promise<ApiResponse<string>>;
    chat: (data: ChatRequest) => Promise<ApiResponse<ChatResponse>>;
    search: (data: SearchRequest) => Promise<ApiResponse<SearchResult>>;
    generate: (data: AIGenerateRequest) => Promise<ApiResponse<AIGenerateResponse>>;
    listConversations: () => Promise<ApiResponse<Conversation[]>>;
    getConversation: (id: string) => Promise<ApiResponse<Conversation>>;
    createConversation: (title?: string) => Promise<ApiResponse<Conversation>>;
    deleteConversation: (id: string) => Promise<ApiResponse<string>>;
    health: () => Promise<ApiResponse<string>>;
    validate: (data: ValidateRequest) => Promise<ApiResponse<ValidateResponse>>;
    complete: (data: CompleteRequest) => Promise<ApiResponse<CompleteResponse>>;
    summarize: (data: SummarizeRequest) => Promise<ApiResponse<SummarizeResponse>>;
    listTemplates: () => Promise<ApiResponse<AITemplate[]>>;
    analyzeSentiment: (data: SentimentAnalysisRequest) => Promise<ApiResponse<SentimentAnalysisResponse>>;
    classifyText: (data: ClassifyTextRequest) => Promise<ApiResponse<ClassifyTextResponse>>;
    extractEntities: (data: ExtractEntitiesRequest) => Promise<ApiResponse<ExtractEntitiesResponse>>;
    extractKeywords: (data: ExtractKeywordsRequest) => Promise<ApiResponse<ExtractKeywordsResponse>>;
};
