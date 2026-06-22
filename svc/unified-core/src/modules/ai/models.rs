//! AI Module Data Models

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// AI 配置
#[derive(Clone, Debug)]
pub struct AIConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
    pub embedding_model: String,
    pub timeout_secs: u64,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            base_url: std::env::var("OLLAMA_URL")
                .or_else(|_| std::env::var("OPENAI_BASE_URL"))
                .unwrap_or_else(|_| "http://localhost:11434/v1".to_string()),
            api_key: std::env::var("OPENAI_API_KEY").ok(),
            model: std::env::var("OLLAMA_MODEL")
                .or_else(|_| std::env::var("OPENAI_MODEL"))
                .unwrap_or_else(|_| "qwen2.5:7b-instruct".to_string()),
            embedding_model: std::env::var("EMBEDDING_MODEL")
                .unwrap_or_else(|_| "nomic-embed-text".to_string()),
            timeout_secs: 120,
        }
    }
}

/// 文档
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: Uuid,
    pub title: String,
    pub filename: String,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// 文档分块
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentChunk {
    pub id: Uuid,
    pub document_id: Uuid,
    pub chunk_index: i32,
    pub content: String,
    pub metadata: serde_json::Value,
}

/// 向量嵌入
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorEmbedding {
    pub id: Uuid,
    pub document_id: Uuid,
    pub chunk_index: i32,
    pub content: String,
    pub embedding: Vec<f32>,
}

/// 搜索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub document_id: Uuid,
    pub chunk_id: Uuid,
    pub content: String,
    pub similarity: f64,
    pub document_title: Option<String>,
}

/// 向量统计
#[derive(Debug, Serialize, Deserialize)]
pub struct VectorStats {
    pub total_documents: usize,
    pub total_chunks: usize,
    pub total_vectors: usize,
    pub vector_dimension: usize,
}

/// 聊天请求
#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub query: String,
    pub conversation_id: Option<String>,
    pub context: Option<serde_json::Value>,
}

/// 聊天响应
#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub answer: String,
    pub sources: Vec<SearchResult>,
    pub confidence: f64,
}

/// 生成请求
#[derive(Debug, Deserialize)]
pub struct GenerateRequest {
    pub prompt: String,
    pub template_id: Option<String>,
    pub variables: Option<serde_json::Value>,
    pub output_format: Option<String>,
}

/// 生成响应
#[derive(Debug, Serialize)]
pub struct GenerateResponse {
    pub content: String,
    pub format: String,
}

/// 摘要请求
#[derive(Debug, Deserialize)]
pub struct SummarizeRequest {
    pub text: String,
    pub max_length: Option<i32>,
}

/// 摘要响应
#[derive(Debug, Serialize)]
pub struct SummarizeResponse {
    pub summary: String,
}

/// 向量搜索请求
#[derive(Debug, Deserialize)]
pub struct VectorSearchRequest {
    pub query: String,
    pub top_k: Option<usize>,
}

/// 向量搜索响应
#[derive(Debug, Serialize)]
pub struct VectorSearchResponse {
    pub results: Vec<SearchResult>,
    pub query_time_ms: u64,
}

/// 存储向量请求
#[derive(Debug, Deserialize)]
pub struct StoreVectorRequest {
    pub document_id: Uuid,
    pub chunk_id: Option<Uuid>,
    pub chunk_index: i32,
    pub content: String,
    pub embedding: Vec<f32>,
}

/// 存储向量响应
#[derive(Debug, Serialize)]
pub struct StoreVectorResponse {
    pub vector_id: Uuid,
    pub message: String,
}

/// 混合搜索请求
#[derive(Debug, Deserialize)]
pub struct HybridSearchRequest {
    pub query: String,
    pub top_k: Option<usize>,
    pub vector_weight: Option<f64>,
    pub keyword_weight: Option<f64>,
}

/// 混合搜索结果
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

/// 混合搜索响应
#[derive(Debug, Serialize)]
pub struct HybridSearchResponse {
    pub results: Vec<HybridSearchResult>,
    pub query_time_ms: u64,
}

/// AI 模板
#[derive(Debug, Serialize, Deserialize)]
pub struct AITemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub fields: Vec<TemplateField>,
}

/// 模板字段
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateField {
    pub name: String,
    pub r#type: String,
    pub label: String,
    pub required: bool,
}

/// 问答历史
#[derive(Debug, Serialize, Deserialize)]
pub struct QAHistory {
    pub id: Uuid,
    pub question: String,
    pub answer: String,
    pub context: Option<serde_json::Value>,
    pub sources: Option<Vec<SearchResult>>,
    pub feedback: Option<String>,
    pub rating: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
