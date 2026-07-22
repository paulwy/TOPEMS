//! AI 知识库 - 数据模型
//!
//! 定义知识库、文档、分块、问答历史的数据结构，
//! 以及 API 请求/响应模型。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ============================================================
// 实体模型（数据库行映射）
// ============================================================

/// 知识库
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct KnowledgeBase {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub kb_type: String,
    pub status: String,
    pub document_count: i32,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 知识文档
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct KnowledgeDocument {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub kb_id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub doc_type: String,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub chunk_count: i32,
    pub status: String,
    pub error_message: Option<String>,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 文档分块（不含向量，用于序列化返回）
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct KnowledgeChunk {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub document_id: Uuid,
    pub kb_id: Uuid,
    pub chunk_index: i32,
    pub content: String,
    pub token_count: Option<i32>,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

/// 问答历史
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct QaHistory {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub kb_id: Uuid,
    pub question: String,
    pub answer: String,
    pub sources: Option<serde_json::Value>,
    pub feedback: Option<i32>,
    pub user_id: Uuid,
    pub created_at: DateTime<Utc>,
}

// ============================================================
// 知识库管理请求/响应模型
// ============================================================

#[derive(Debug, Deserialize)]
pub struct CreateKbRequest {
    pub name: String,
    pub description: Option<String>,
    /// general | product | internal | faq
    #[serde(default = "default_kb_type")]
    pub kb_type: String,
}

fn default_kb_type() -> String {
    "general".to_string()
}

#[derive(Debug, Deserialize)]
pub struct UpdateKbRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub kb_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct KbQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub kb_type: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

// ============================================================
// 文档管理请求/响应模型
// ============================================================

/// 创建文档请求（用于直接通过文本内容创建，不走 multipart）
#[derive(Debug, Deserialize)]
pub struct CreateDocumentRequest {
    pub kb_id: Uuid,
    pub title: String,
    pub content: String,
    /// txt | md | html
    pub doc_type: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocumentRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub kb_id: Option<Uuid>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DocumentQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub kb_id: Option<Uuid>,
    pub status: Option<String>,
    pub doc_type: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DocumentDetail {
    #[serde(flatten)]
    pub document: KnowledgeDocument,
    pub chunks: Vec<KnowledgeChunk>,
}

// ============================================================
// 问答与检索请求/响应模型
// ============================================================

#[derive(Debug, Deserialize)]
pub struct AskRequest {
    pub kb_id: Uuid,
    pub question: String,
    #[serde(default = "default_top_k")]
    pub top_k: i32,
}

fn default_top_k() -> i32 {
    5
}

#[derive(Debug, Serialize)]
pub struct AskResponse {
    pub answer: String,
    pub sources: Vec<AnswerSource>,
    pub confidence: f64,
    pub history_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnswerSource {
    pub chunk_id: Uuid,
    pub document_id: Uuid,
    pub document_title: String,
    pub content_snippet: String,
    pub score: f64,
}

#[derive(Debug, Deserialize)]
pub struct SearchRequest {
    pub kb_id: Uuid,
    pub query: String,
    #[serde(default = "default_top_k")]
    pub top_k: i32,
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub query: String,
    pub results: Vec<AnswerSource>,
}

#[derive(Debug, Deserialize)]
pub struct QaHistoryQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub kb_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct FeedbackRequest {
    /// 1=赞, -1=踩
    pub feedback: i32,
}
