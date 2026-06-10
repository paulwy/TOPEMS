use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 搜索结果 - 使用 services/vector 模块的定义
pub use crate::services::vector::SearchResult;

/// 问答历史
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QAHistory {
    pub id: Uuid,
    pub question: String,
    pub answer: String,
    pub context: Option<serde_json::Value>,
    pub sources: Option<Vec<SearchResult>>,
    pub feedback: Option<String>,
    pub rating: Option<i32>,
    pub created_at: DateTime<Utc>,
}

/// 分析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub id: Uuid,
    pub analysis_type: String,
    pub input_text: String,
    pub result: serde_json::Value,
    pub confidence: Option<f64>,
    pub created_at: DateTime<Utc>,
}

/// 文档处理请求
#[derive(Debug, Deserialize)]
pub struct ProcessDocumentRequest {
    pub document_id: Uuid,
    pub chunk_size: Option<usize>,
    pub overlap: Option<usize>,
}

/// 文档提取请求
#[derive(Debug, Deserialize)]
pub struct ExtractDocumentRequest {
    pub document_id: Uuid,
    pub extract_type: String, // keywords, summary, entities
}

/// 文档摘要请求
#[derive(Debug, Deserialize)]
pub struct SummarizeDocumentRequest {
    pub document_id: Uuid,
    pub max_length: Option<i32>,
}

/// 向量存储请求
#[derive(Debug, Deserialize)]
pub struct StoreVectorRequest {
    pub document_id: Uuid,
    pub chunk_id: Uuid,
    pub chunk_index: i32,
    pub content: String,
    pub embedding: Vec<f32>,
}

/// 批量向量存储请求
#[derive(Debug, Deserialize)]
pub struct BatchStoreVectorsRequest {
    pub vectors: Vec<StoreVectorRequest>,
}

/// 向量搜索请求
#[derive(Debug, Deserialize)]
pub struct VectorSearchRequest {
    pub query: String,
    pub top_k: Option<usize>,
    pub threshold: Option<f64>,
}

/// 混合检索请求
#[derive(Debug, Deserialize)]
pub struct HybridSearchRequest {
    pub query: String,
    pub top_k: Option<usize>,
    pub vector_weight: Option<f64>,
    pub keyword_weight: Option<f64>,
}

/// 问答请求
#[derive(Debug, Deserialize)]
pub struct AskRequest {
    pub question: String,
    pub conversation_id: Option<Uuid>,
    pub top_k: Option<usize>,
}

/// 基于文档上下文提问请求
#[derive(Debug, Deserialize)]
pub struct AskWithContextRequest {
    pub question: String,
    pub document_ids: Vec<Uuid>,
    pub top_k: Option<usize>,
}

/// 答案反馈请求
#[derive(Debug, Deserialize)]
pub struct FeedbackRequest {
    pub qa_id: Uuid,
    pub feedback: String,
    pub rating: Option<i32>,
}

/// 情感分析请求
#[derive(Debug, Deserialize)]
pub struct SentimentAnalysisRequest {
    pub text: String,
}

/// 分析历史请求
#[derive(Debug, Deserialize)]
pub struct AnalysisHistoryRequest {
    pub analysis_type: Option<String>,
    pub limit: Option<usize>,
}

/// 分析历史响应
#[derive(Debug, Serialize)]
pub struct AnalysisHistoryResponse {
    pub history: Vec<AnalysisResult>,
    pub total: i32,
}

/// 文本分类请求
#[derive(Debug, Deserialize)]
pub struct ClassifyTextRequest {
    pub text: String,
    pub categories: Option<Vec<String>>,
}

/// 实体提取请求
#[derive(Debug, Deserialize)]
pub struct ExtractEntitiesRequest {
    pub text: String,
    pub entity_types: Option<Vec<String>>,
}

/// 关键词提取请求
#[derive(Debug, Deserialize)]
pub struct ExtractKeywordsRequest {
    pub text: String,
    pub max_keywords: Option<i32>,
}

/// 文档上传响应
#[derive(Debug, Serialize)]
pub struct UploadDocumentResponse {
    pub document_id: Uuid,
    pub message: String,
}

/// 文档处理响应
#[derive(Debug, Serialize)]
pub struct ProcessDocumentResponse {
    pub document_id: Uuid,
    pub chunks_count: i32,
    pub vectors_count: i32,
    pub status: String,
}

/// 文档提取响应
#[derive(Debug, Serialize)]
pub struct ExtractDocumentResponse {
    pub document_id: Uuid,
    pub extract_type: String,
    pub result: serde_json::Value,
}

/// 文档摘要响应
#[derive(Debug, Serialize)]
pub struct SummarizeDocumentResponse {
    pub document_id: Uuid,
    pub summary: String,
}

/// 向量存储响应
#[derive(Debug, Serialize)]
pub struct StoreVectorResponse {
    pub vector_id: Uuid,
    pub message: String,
}

/// 批量向量存储响应
#[derive(Debug, Serialize)]
pub struct BatchStoreVectorsResponse {
    pub stored_count: i32,
    pub message: String,
}

/// 向量搜索响应
#[derive(Debug, Serialize)]
pub struct VectorSearchResponse {
    pub results: Vec<SearchResult>,
    pub query_time_ms: u64,
}

/// 混合检索响应
#[derive(Debug, Serialize)]
pub struct HybridSearchResponse {
    pub results: Vec<HybridSearchResult>,
    pub query_time_ms: u64,
}

/// 混合检索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridSearchResult {
    pub document_id: Uuid,
    pub chunk_id: Uuid,
    pub content: String,
    pub vector_similarity: f64,
    pub keyword_score: f64,
    pub combined_score: f64,
    pub document_title: Option<String>,
}

/// 问答响应
#[derive(Debug, Serialize)]
pub struct AskResponse {
    pub answer: String,
    pub sources: Vec<SearchResult>,
    pub qa_id: Uuid,
    pub confidence: f64,
}

/// 问答历史响应
#[derive(Debug, Serialize)]
pub struct QAHistoryResponse {
    pub history: Vec<QAHistory>,
    pub total: i32,
}

/// 答案反馈响应
#[derive(Debug, Serialize)]
pub struct FeedbackResponse {
    pub qa_id: Uuid,
    pub message: String,
}

/// 情感分析响应
#[derive(Debug, Serialize)]
pub struct SentimentAnalysisResponse {
    pub sentiment: String,
    pub confidence: f64,
    pub details: Option<serde_json::Value>,
}

/// 文本分类响应
#[derive(Debug, Serialize)]
pub struct ClassifyTextResponse {
    pub category: String,
    pub confidence: f64,
    pub all_categories: Option<Vec<CategoryScore>>,
}

/// 分类得分
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryScore {
    pub category: String,
    pub score: f64,
}

/// 实体提取响应
#[derive(Debug, Serialize)]
pub struct ExtractEntitiesResponse {
    pub entities: Vec<Entity>,
}

/// 实体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub text: String,
    pub entity_type: String,
    pub start_pos: i32,
    pub end_pos: i32,
    pub confidence: f64,
}

/// 关键词提取响应
#[derive(Debug, Serialize)]
pub struct ExtractKeywordsResponse {
    pub keywords: Vec<Keyword>,
}

/// 关键词
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keyword {
    pub text: String,
    pub score: f64,
    pub frequency: i32,
}

/// 向量统计信息
#[derive(Debug, Serialize)]
pub struct VectorStats {
    pub total_documents: usize,
    pub total_chunks: usize,
    pub total_vectors: usize,
    pub vector_dimension: usize,
}