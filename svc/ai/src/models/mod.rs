#![allow(dead_code)]

pub mod audit_log;

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

// AI 生成请求
#[derive(Debug, Serialize, Deserialize)]
pub struct AIGenerateRequest {
    pub template_id: Option<String>,
    pub variables: serde_json::Value,
    pub output_format: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AIGenerateResponse {
    pub content: String,
    pub format: String,
}

// 数据验证请求
#[derive(Debug, Serialize, Deserialize)]
pub struct ValidateRequest {
    pub data: serde_json::Value,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidateResponse {
    pub issues: Vec<ValidationIssue>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationIssue {
    pub field: String,
    pub r#type: String,
    pub message: String,
    pub fix: Option<String>,
}

// 数据补全请求
#[derive(Debug, Serialize, Deserialize)]
pub struct CompleteRequest {
    pub data: Option<serde_json::Value>,
    pub partial_data: Option<serde_json::Value>,
    pub fields_to_complete: Option<Vec<String>>,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompleteResponse {
    pub suggestions: Vec<Suggestion>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Suggestion {
    pub field: String,
    pub value: serde_json::Value,
    pub reason: String,
}

// 摘要请求
#[derive(Debug, Serialize, Deserialize)]
pub struct SummarizeRequest {
    pub text: String,
    pub max_length: Option<i32>,
    pub r#type: Option<String>,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SummarizeResponse {
    pub summary: String,
}

// AI 模板
#[derive(Debug, Serialize, Deserialize)]
pub struct AITemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub fields: Vec<TemplateField>,
    pub prompt_template: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateField {
    pub name: String,
    pub r#type: String,
    pub label: String,
    pub required: bool,
    pub options: Option<Vec<TemplateOption>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateOption {
    pub value: String,
    pub label: String,
}

// 向量嵌入（内存存储用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorEmbedding {
    pub id: String,
    pub document_id: String,
    pub chunk_index: i32,
    pub content: String,
    pub embedding: Vec<f32>,
    pub created_at: String,
}

// 文档分块（内存存储用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentChunk {
    pub id: String,
    pub document_id: String,
    pub chunk_index: i32,
    pub content: String,
    pub created_at: String,
    pub metadata: serde_json::Value,
}

// 文档（内存存储用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub filename: String,
    pub file_path: Option<String>,
    pub file_size: Option<u64>,
    pub mime_type: Option<String>,
    pub content_hash: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub status: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenAIRequest {
    pub model: String,
    pub messages: Vec<OpenAIMessage>,
    pub temperature: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenAIMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenAIResponse {
    pub choices: Vec<OpenAIChoice>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenAIChoice {
    pub message: OpenAIMessage,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmbeddingRequest {
    pub model: String,
    pub input: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmbeddingResponse {
    pub data: Vec<EmbeddingData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmbeddingData {
    pub embedding: Vec<f32>,
}

pub static VECTORS: std::sync::OnceLock<Arc<Mutex<Vec<VectorEmbedding>>>> =
    std::sync::OnceLock::new();
pub static CHUNKS: std::sync::OnceLock<Arc<Mutex<Vec<DocumentChunk>>>> = std::sync::OnceLock::new();
pub static DOCUMENTS: std::sync::OnceLock<Arc<Mutex<Vec<Document>>>> = std::sync::OnceLock::new();
pub static CLIENT: std::sync::OnceLock<Client> = std::sync::OnceLock::new();
pub static CONFIG: std::sync::OnceLock<Config> = std::sync::OnceLock::new();
pub static DOCS_DIR: &str = "docs";

#[derive(Clone, Debug)]
pub struct Config {
    pub api_key: Option<String>,
    pub base_url: String,
    pub model: String,
    pub use_ollama: bool,
    pub embedding_model: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub query: String,
    pub conversation_id: Option<String>,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub answer: String,
    pub sources: Vec<SearchResult>,
}

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub chunk: ChunkInfo,
    pub document: Document,
    pub similarity: f64,
}

#[derive(Debug, Serialize)]
pub struct ChunkInfo {
    pub id: String,
    pub document_id: String,
    pub chunk_index: i32,
    pub content: String,
    pub created_at: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConnectorType {
    Database,
    Api,
    File,
    MessageQueue,
    CloudStorage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DatabaseType {
    Postgres,
    Mysql,
    Sqlite,
    SqlServer,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectorConfig {
    pub host: Option<String>,
    pub port: Option<u16>,
    pub database: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub api_key: Option<String>,
    pub endpoint: Option<String>,
    pub bucket: Option<String>,
    pub region: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataConnector {
    pub id: String,
    pub name: String,
    pub connector_type: ConnectorType,
    pub database_type: Option<DatabaseType>,
    pub config: ConnectorConfig,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateConnectorRequest {
    pub name: String,
    pub connector_type: ConnectorType,
    pub database_type: Option<DatabaseType>,
    pub config: ConnectorConfig,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateConnectorRequest {
    pub name: Option<String>,
    pub config: Option<ConnectorConfig>,
    pub description: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DataQueryRequest {
    pub connector_id: String,
    pub query: String,
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DataQueryResponse {
    pub columns: Vec<String>,
    pub rows: Vec<serde_json::Value>,
    pub row_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectorStatus {
    pub connector_id: String,
    pub name: String,
    pub is_connected: bool,
    pub error: Option<String>,
}

pub static CONNECTORS: std::sync::OnceLock<Arc<Mutex<Vec<DataConnector>>>> =
    std::sync::OnceLock::new();

#[derive(Debug, Deserialize)]
pub struct ConnectorQuery {
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiSearchRequest {
    pub query: String,
    pub limit: Option<usize>,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct AiSearchDocument {
    pub id: String,
    pub title: String,
    pub content: String,
    pub filename: String,
    pub path: Option<String>,
    pub file_path: Option<String>,
    pub file_size: Option<u64>,
    pub mime_type: Option<String>,
    pub status: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: String,
    pub description: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AiSearchResponse {
    pub documents: Vec<AiSearchDocument>,
    pub total: usize,
    pub query_time_ms: u64,
}

// AI 智能助手 - 报表助手
#[derive(Debug, Deserialize)]
pub struct ReportAssistantRequest {
    pub query: String,
    pub data_source: Option<String>,
    pub time_range: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReportMetric {
    pub label: String,
    pub value: f64,
    pub unit: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ReportAssistantResponse {
    pub query: String,
    pub chart_type: String,
    pub title: String,
    pub description: Option<String>,
    pub sql: Option<String>,
    pub data: Vec<serde_json::Value>,
    pub x_axis: Option<String>,
    pub y_axis: Option<serde_json::Value>,
    pub metrics: Option<Vec<ReportMetric>>,
}

// AI 智能助手 - 流程助手
#[derive(Debug, Deserialize)]
pub struct FlowAssistantRequest {
    pub query: String,
    pub module: Option<String>,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct FlowStep {
    pub step: i32,
    pub name: String,
    pub description: String,
    pub responsible: Option<String>,
    pub estimated_time: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FlowAssistantResponse {
    pub query: String,
    pub title: String,
    pub description: Option<String>,
    pub steps: Vec<FlowStep>,
    pub suggestions: Option<Vec<String>>,
}

// AI 智能助手 - 异常预测
#[derive(Debug, Deserialize)]
pub struct AnomalyPredictRequest {
    pub metric: String,
    pub time_range: Option<String>,
    pub data_source: Option<String>,
    pub threshold: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct AnomalyPoint {
    pub timestamp: String,
    pub value: f64,
    pub expected: Option<f64>,
    pub severity: String,
    pub reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AnomalyPredictResponse {
    pub metric: String,
    pub anomaly_count: i32,
    pub summary: String,
    pub anomalies: Vec<AnomalyPoint>,
    pub suggestions: Option<Vec<String>>,
}

// AI 智能助手 - 知识库问答
#[derive(Debug, Deserialize)]
pub struct KnowledgeAskRequest {
    pub question: String,
    pub knowledge_base: Option<String>,
    pub top_k: Option<usize>,
}

#[derive(Debug, Serialize)]
pub struct KnowledgeSource {
    pub title: String,
    pub content: Option<String>,
    pub relevance: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct KnowledgeAskResponse {
    pub question: String,
    pub answer: String,
    pub sources: Vec<KnowledgeSource>,
    pub confidence: f64,
    pub follow_up_questions: Option<Vec<String>>,
}
