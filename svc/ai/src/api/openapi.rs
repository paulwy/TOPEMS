// AI 服务 OpenAPI 文档
use utoipa::{OpenApi, ToSchema};
use serde::{Deserialize, Serialize};

// ==================== 请求结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ChatRequest {
    #[schema(example = "请介绍一下 TOPEMS 系统的主要功能")]
    pub query: String,
    #[schema(example = "conv-123")]
    pub conversation_id: Option<String>,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AIGenerateRequest {
    pub template_id: Option<String>,
    pub variables: serde_json::Value,
    pub output_format: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ValidateRequest {
    pub data: serde_json::Value,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CompleteRequest {
    pub data: Option<serde_json::Value>,
    pub partial_data: Option<serde_json::Value>,
    pub fields_to_complete: Option<Vec<String>>,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SummarizeRequest {
    #[schema(example = "要摘要的文本内容...")]
    pub text: String,
    pub max_length: Option<i32>,
    pub r#type: Option<String>,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VectorSearchRequest {
    #[schema(example = "search query")]
    pub query: String,
    #[schema(example = 10)]
    pub top_k: Option<i32>,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VectorStoreRequest {
    pub content: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VectorBatchStoreRequest {
    pub vectors: Vec<VectorStoreRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HybridSearchRequest {
    pub query: String,
    pub top_k: Option<i32>,
    pub rerank: Option<bool>,
}

// ==================== 响应结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ChatResponse {
    pub answer: String,
    pub sources: Vec<SearchResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SearchResult {
    pub chunk: ChunkInfo,
    pub document: DocumentInfo,
    pub similarity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ChunkInfo {
    pub id: String,
    pub document_id: String,
    pub chunk_index: i32,
    pub content: String,
    pub created_at: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DocumentInfo {
    pub id: String,
    pub title: String,
    pub filename: String,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AIGenerateResponse {
    pub content: String,
    pub format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ValidateResponse {
    pub issues: Vec<ValidationIssue>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ValidationIssue {
    pub field: String,
    #[serde(rename = "type")]
    pub issue_type: String,
    pub message: String,
    pub fix: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CompleteResponse {
    pub suggestions: Vec<Suggestion>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Suggestion {
    pub field: String,
    pub value: serde_json::Value,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SummarizeResponse {
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VectorStatsResponse {
    pub total_vectors: i64,
    pub total_documents: i64,
    pub total_chunks: i64,
    pub embedding_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VectorSearchResponse {
    pub results: Vec<SearchResult>,
    pub query_time_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QaHistoryResponse {
    pub conversation_id: String,
    pub messages: Vec<QaMessage>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QaMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QaFeedbackRequest {
    pub message_id: String,
    pub feedback: String,
    pub rating: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SentimentAnalysisRequest {
    pub text: String,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SentimentAnalysisResponse {
    pub sentiment: String,
    pub confidence: f64,
    pub emotions: Vec<EmotionScore>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EmotionScore {
    pub emotion: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ClassificationRequest {
    pub text: String,
    pub categories: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ClassificationResponse {
    pub predicted_category: String,
    pub confidence: f64,
    pub all_scores: Vec<CategoryScore>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CategoryScore {
    pub category: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EntityExtractionRequest {
    pub text: String,
    pub entity_types: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EntityExtractionResponse {
    pub entities: Vec<Entity>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Entity {
    pub text: String,
    #[serde(rename = "type")]
    pub entity_type: String,
    pub start: i32,
    pub end: i32,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct KeywordExtractionRequest {
    pub text: String,
    pub max_keywords: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct KeywordExtractionResponse {
    pub keywords: Vec<KeywordScore>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct KeywordScore {
    pub keyword: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConnectorRequest {
    pub name: String,
    pub connector_type: String,
    pub config: serde_json::Value,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DataQueryRequest {
    pub connector_id: String,
    pub query: String,
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CacheStatsResponse {
    pub document_count: i64,
    pub vector_count: i64,
    pub search_count: i64,
    pub qa_count: i64,
    pub default_ttl: i64,
}

// ==================== OpenAPI 文档 ====================

#[derive(OpenApi)]
#[openapi(
    // AI 对话 API
    paths(
        crate::api::chat::chat_handler,
        crate::api::generate::generate_handler,
        crate::api::validate::validate_handler,
        crate::api::complete::complete_handler,
        crate::api::summarize::summarize_handler,
    ),
    // 组件
    components(
        schemas(
            ChatRequest,
            ChatResponse,
            AIGenerateRequest,
            AIGenerateResponse,
            ValidateRequest,
            ValidateResponse,
            ValidationIssue,
            CompleteRequest,
            CompleteResponse,
            Suggestion,
            SummarizeRequest,
            SummarizeResponse,
        ),
    ),
    tags(
        (name = "ai", description = "AI 对话与生成 API"),
    ),
    info(
        title = "TOPEMS AI Service API",
        version = "1.0.0",
        description = "AI 对话、文本生成、数据验证与补全 API",
    )
)]
pub struct AiApiDoc;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::vector::search_handler,
        crate::api::vector::store_handler,
        crate::api::vector::batch_store_handler,
        crate::api::vector::hybrid_search_handler,
        crate::api::vector::stats_handler,
        crate::api::vector::get_handler,
        crate::api::vector::delete_handler,
        crate::api::vector::clear_handler,
    ),
    components(
        schemas(
            VectorSearchRequest,
            VectorStoreRequest,
            VectorBatchStoreRequest,
            HybridSearchRequest,
            VectorSearchResponse,
            VectorStatsResponse,
            SearchResult,
            ChunkInfo,
            DocumentInfo,
        ),
    ),
    tags(
        (name = "vector", description = "向量存储与检索 API"),
    ),
    info(
        title = "TOPEMS Vector API",
        version = "1.0.0",
        description = "向量嵌入、存储与相似度检索 API",
    )
)]
pub struct VectorApiDoc;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::qa::ask_handler,
        crate::api::qa::ask_with_context_handler,
        crate::api::qa::history_handler,
        crate::api::qa::feedback_handler,
    ),
    components(
        schemas(
            ChatRequest,
            QaHistoryResponse,
            QaMessage,
            QaFeedbackRequest,
        ),
    ),
    tags(
        (name = "qa", description = "问答系统 API"),
    ),
    info(
        title = "TOPEMS QA API",
        version = "1.0.0",
        description = "基于知识库的问答系统 API",
    )
)]
pub struct QaApiDoc;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::analysis::sentiment_handler,
        crate::api::analysis::classify_handler,
        crate::api::analysis::extract_entities_handler,
        crate::api::analysis::extract_keywords_handler,
        crate::api::analysis::history_handler,
    ),
    components(
        schemas(
            SentimentAnalysisRequest,
            SentimentAnalysisResponse,
            EmotionScore,
            ClassificationRequest,
            ClassificationResponse,
            CategoryScore,
            EntityExtractionRequest,
            EntityExtractionResponse,
            Entity,
            KeywordExtractionRequest,
            KeywordExtractionResponse,
            KeywordScore,
        ),
    ),
    tags(
        (name = "analysis", description = "文本分析 API"),
    ),
    info(
        title = "TOPEMS Analysis API",
        version = "1.0.0",
        description = "情感分析、文本分类、实体识别与关键词提取 API",
    )
)]
pub struct AnalysisApiDoc;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::document::list_handler,
        crate::api::document::get_handler as doc_get_handler,
        crate::api::document::delete_handler,
    ),
    components(
        schemas(
            crate::api::document::DocumentListResponse,
            crate::api::document::DocumentInfo,
        ),
    ),
    tags(
        (name = "document", description = "文档管理 API"),
    ),
    info(
        title = "TOPEMS Document API",
        version = "1.0.0",
        description = "文档上传、处理与元数据管理 API",
    )
)]
pub struct DocumentApiDoc;
