#![allow(dead_code)]

pub mod audit_log;

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use utoipa::ToSchema;
use uuid::Uuid;

// AI 生成请求
#[derive(Debug, Serialize, Deserialize, ToSchema)]
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
#[derive(Debug, Serialize, Deserialize, ToSchema)]
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
#[derive(Debug, Serialize, Deserialize, ToSchema)]
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
#[derive(Debug, Serialize, Deserialize, ToSchema)]
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
    pub id: Uuid,
    pub document_id: Uuid,
    pub chunk_index: i32,
    pub content: String,
    pub embedding: Vec<f32>,
    pub created_at: String,
}

// 文档分块（内存存储用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentChunk {
    pub id: Uuid,
    pub document_id: Uuid,
    pub chunk_index: i32,
    pub content: String,
    pub created_at: String,
    pub metadata: serde_json::Value,
}

// 文档（内存存储用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: Uuid,
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
pub static DIFY_CONFIG: std::sync::OnceLock<DifyConfig> = std::sync::OnceLock::new();
pub static DOCS_DIR: &str = "docs";

// =============================================================================
// Dify 集成：配置 + 请求/响应 DTO
// =============================================================================
// 对应 Dify Service API：https://docs.dify.ai/guides/application-publishing/developing-with-apis
// 默认通过 Dify Nginx 入口（/v1/*）调用，使用 Bearer app-xxx 鉴权。

/// Dify 客户端配置
#[derive(Clone, Debug)]
pub struct DifyConfig {
    /// Dify 实例根地址（如 http://localhost:8180），不含尾部斜杠
    pub base_url: String,
    /// Dify 应用 API Key（格式 app-xxx）
    pub api_key: String,
    /// 默认 user 标识（Dify 用于区分终端用户）
    pub default_user: String,
    /// HTTP 调用超时（秒）
    pub timeout_secs: u64,
}

impl Default for DifyConfig {
    fn default() -> Self {
        Self {
            base_url: "http://localhost:8180".to_string(),
            api_key: String::new(),
            default_user: "topems-user".to_string(),
            timeout_secs: 120,
        }
    }
}

/// Dify 对话请求（对应 POST /v1/chat-messages）
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DifyChatRequest {
    /// 应用变量（Dify 应用入参）
    #[serde(default = "default_inputs")]
    pub inputs: serde_json::Value,
    /// 用户消息内容
    pub query: String,
    /// blocking | streaming
    #[serde(default = "default_response_mode")]
    pub response_mode: String,
    /// 会话 ID（首次对话传空字符串）
    #[serde(default)]
    pub conversation_id: String,
    /// 终端用户标识
    pub user: String,
}

fn default_response_mode() -> String {
    "blocking".to_string()
}

fn default_inputs() -> serde_json::Value {
    serde_json::json!({})
}

/// Dify blocking 模式响应
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DifyChatResponse {
    /// 事件类型：message | message_end | error
    #[serde(default)]
    pub event: String,
    /// 消息 ID
    #[serde(default)]
    #[serde(rename = "message_id")]
    pub message_id: String,
    /// 会话 ID
    #[serde(default)]
    #[serde(rename = "conversation_id")]
    pub conversation_id: String,
    /// 模型实际输出文本（message 事件）
    #[serde(default)]
    pub answer: String,
    /// 创建时间戳（秒）
    #[serde(default)]
    pub created_at: i64,
}

/// Dify 错误响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DifyErrorResponse {
    pub code: String,
    pub message: String,
    #[serde(default)]
    pub status: i32,
}

/// Dify 应用元信息（GET /v1/info）
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DifyInfoResponse {
    #[serde(default)]
    #[serde(rename = "provider")]
    pub provider: String,
    #[serde(default)]
    #[serde(rename = "name")]
    pub name: String,
    #[serde(default)]
    #[serde(rename = "description")]
    pub description: String,
    #[serde(default)]
    #[serde(rename = "authors")]
    pub authors: Vec<String>,
    #[serde(default)]
    #[serde(rename = "tags")]
    pub tags: Vec<String>,
    #[serde(default)]
    #[serde(rename = "icon_type")]
    pub icon_type: String,
    #[serde(default)]
    #[serde(rename = "icon")]
    pub icon: String,
    #[serde(default)]
    #[serde(rename = "icon_background")]
    pub icon_background: String,
}

/// Dify 应用参数（GET /v1/parameters）
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DifyParametersResponse {
    #[serde(default)]
    #[serde(rename = "user_input_form")]
    pub user_input_form: Vec<serde_json::Value>,
}

/// Dify 应用元数据（GET /v1/meta）
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DifyMetaResponse {
    #[serde(default)]
    #[serde(rename = "tool_icons")]
    pub tool_icons: serde_json::Value,
}

/// Dify 会话项
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DifyConversationItem {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub inputs: serde_json::Value,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub updated_at: i64,
}

/// Dify 会话列表响应（GET /v1/conversations）
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DifyConversationListResponse {
    #[serde(default)]
    pub data: Vec<DifyConversationItem>,
    #[serde(default)]
    pub has_more: bool,
    #[serde(default)]
    pub limit: i64,
}

/// Dify 消息历史项
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DifyMessageItem {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub conversation_id: String,
    #[serde(default)]
    pub query: String,
    #[serde(default)]
    pub answer: String,
    #[serde(default)]
    pub created_at: i64,
    #[serde(default)]
    pub feedback: serde_json::Value,
}

/// Dify 消息历史响应（GET /v1/messages）
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DifyMessageHistoryResponse {
    #[serde(default)]
    pub data: Vec<DifyMessageItem>,
    #[serde(default)]
    pub has_more: bool,
    #[serde(default)]
    pub limit: i64,
}

/// Dify 反馈请求（POST /v1/messages/{id}/feedbacks）
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DifyFeedbackRequest {
    /// like | dislike | null
    pub rating: Option<String>,
    /// 终端用户标识
    pub user: String,
    #[serde(default)]
    pub content: Option<String>,
}

/// Dify 反馈响应
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DifyFeedbackResponse {
    #[serde(default)]
    pub result: String,
}

/// Dify 停止生成请求（POST /v1/messages/{id}/stop）
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DifyStopRequest {
    pub user: String,
}

/// Dify 停止生成响应
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DifyStopResponse {
    #[serde(default)]
    pub result: String,
}

/// 列出会话请求 query 参数
#[derive(Debug, Deserialize)]
pub struct DifyListQuery {
    pub user: String,
    #[serde(default)]
    pub conversation_id: Option<String>,
    #[serde(default)]
    pub limit: Option<i32>,
    #[serde(default)]
    pub cursor: Option<String>,
}

#[derive(Clone, Debug)]
pub struct Config {
    pub api_key: Option<String>,
    pub base_url: String,
    pub model: String,
    pub use_ollama: bool,
    pub embedding_model: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
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
    pub id: Uuid,
    pub document_id: Uuid,
    pub chunk_index: i32,
    pub content: String,
    pub created_at: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ConnectorType {
    Database,
    Api,
    File,
    MessageQueue,
    CloudStorage,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum DatabaseType {
    Postgres,
    Mysql,
    Sqlite,
    SqlServer,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
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
    pub id: Uuid,
    pub name: String,
    pub connector_type: ConnectorType,
    pub database_type: Option<DatabaseType>,
    pub config: ConnectorConfig,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateConnectorRequest {
    pub name: String,
    pub connector_type: ConnectorType,
    pub database_type: Option<DatabaseType>,
    pub config: ConnectorConfig,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateConnectorRequest {
    pub name: Option<String>,
    pub config: Option<ConnectorConfig>,
    pub description: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DataQueryRequest {
    pub connector_id: Uuid,
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
    pub connector_id: Uuid,
    pub name: String,
    pub is_connected: bool,
    pub error: Option<String>,
}

pub static CONNECTORS: std::sync::OnceLock<Arc<Mutex<Vec<DataConnector>>>> =
    std::sync::OnceLock::new();

#[derive(Debug, Deserialize)]
pub struct ConnectorQuery {
    pub id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AiSearchRequest {
    pub query: String,
    pub limit: Option<usize>,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct AiSearchDocument {
    pub id: Uuid,
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
#[derive(Debug, Deserialize, ToSchema)]
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
#[derive(Debug, Deserialize, ToSchema)]
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
#[derive(Debug, Deserialize, ToSchema)]
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
#[derive(Debug, Deserialize, ToSchema)]
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

#[cfg(test)]
mod tests {
    use super::*;

    fn any_uuid() -> Uuid {
        Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    }

    // ── AIGenerateRequest / Response ──

    #[test]
    fn test_ai_generate_request_serde_roundtrip() {
        let req = AIGenerateRequest {
            template_id: Some("tpl-1".into()),
            variables: serde_json::json!({"name": "test"}),
            output_format: Some("json".into()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: AIGenerateRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.template_id.as_deref(), Some("tpl-1"));
    }

    #[test]
    fn test_ai_generate_response_serde_roundtrip() {
        let resp = AIGenerateResponse {
            content: "生成的内容".into(),
            format: "text".into(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: AIGenerateResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.content, "生成的内容");
    }

    // ── ValidateRequest / Response ──

    #[test]
    fn test_validate_request_serde_roundtrip() {
        let req = ValidateRequest {
            data: serde_json::json!({"field": "value"}),
            context: Some(serde_json::json!({"mode": "strict"})),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: ValidateRequest = serde_json::from_str(&json).unwrap();
        assert!(back.context.is_some());
    }

    #[test]
    fn test_validate_response_serde_roundtrip() {
        let resp = ValidateResponse {
            issues: vec![ValidationIssue {
                field: "name".into(),
                r#type: "missing".into(),
                message: "字段缺失".into(),
                fix: Some("添加 name 字段".into()),
            }],
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: ValidateResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.issues.len(), 1);
    }

    #[test]
    fn test_validation_issue_serde_roundtrip() {
        let issue = ValidationIssue {
            field: "email".into(),
            r#type: "invalid".into(),
            message: "邮箱格式错误".into(),
            fix: None,
        };
        let json = serde_json::to_string(&issue).unwrap();
        let back: ValidationIssue = serde_json::from_str(&json).unwrap();
        assert_eq!(back.field, "email");
        assert!(back.fix.is_none());
    }

    // ── CompleteRequest / Response ──

    #[test]
    fn test_complete_request_serde_roundtrip() {
        let req = CompleteRequest {
            data: Some(serde_json::json!({"name": "张三"})),
            partial_data: None,
            fields_to_complete: Some(vec!["phone".into()]),
            context: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CompleteRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.fields_to_complete.as_ref().unwrap().len(), 1);
    }

    #[test]
    fn test_complete_response_serde_roundtrip() {
        let resp = CompleteResponse {
            suggestions: vec![Suggestion {
                field: "phone".into(),
                value: serde_json::json!("13800000000"),
                reason: "根据历史记录推断".into(),
            }],
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: CompleteResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.suggestions.len(), 1);
    }

    // ── SummarizeRequest / Response ──

    #[test]
    fn test_summarize_request_serde_roundtrip() {
        let req = SummarizeRequest {
            text: "长文本内容...".into(),
            max_length: Some(200),
            r#type: Some("brief".into()),
            context: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: SummarizeRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.max_length, Some(200));
    }

    #[test]
    fn test_summarize_response_serde_roundtrip() {
        let resp = SummarizeResponse {
            summary: "摘要内容".into(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: SummarizeResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.summary, "摘要内容");
    }

    // ── AITemplate / TemplateField / TemplateOption ──

    #[test]
    fn test_ai_template_serde_roundtrip() {
        let tpl = AITemplate {
            id: "tpl-1".into(),
            name: "报告模板".into(),
            description: "生成报告".into(),
            category: "report".into(),
            fields: vec![TemplateField {
                name: "title".into(),
                r#type: "text".into(),
                label: "标题".into(),
                required: true,
                options: None,
            }],
            prompt_template: "生成{{title}}报告".into(),
        };
        let json = serde_json::to_string(&tpl).unwrap();
        let back: AITemplate = serde_json::from_str(&json).unwrap();
        assert_eq!(back.fields.len(), 1);
        assert!(back.fields[0].required);
    }

    #[test]
    fn test_template_option_serde_roundtrip() {
        let opt = TemplateOption {
            value: "opt1".into(),
            label: "选项1".into(),
        };
        let json = serde_json::to_string(&opt).unwrap();
        let back: TemplateOption = serde_json::from_str(&json).unwrap();
        assert_eq!(back.value, "opt1");
    }

    // ── VectorEmbedding / DocumentChunk / Document (memory) ──

    #[test]
    fn test_vector_embedding_serde_roundtrip() {
        let ve = VectorEmbedding {
            id: any_uuid(),
            document_id: any_uuid(),
            chunk_index: 0,
            content: "content".into(),
            embedding: vec![0.1, 0.2, 0.3],
            created_at: "1234567890".into(),
        };
        let json = serde_json::to_string(&ve).unwrap();
        let back: VectorEmbedding = serde_json::from_str(&json).unwrap();
        assert_eq!(back.embedding, vec![0.1, 0.2, 0.3]);
    }

    #[test]
    fn test_document_chunk_serde_roundtrip() {
        let dc = DocumentChunk {
            id: any_uuid(),
            document_id: any_uuid(),
            chunk_index: 1,
            content: "chunk text".into(),
            created_at: "123".into(),
            metadata: serde_json::json!({"page": 1}),
        };
        let json = serde_json::to_string(&dc).unwrap();
        let back: DocumentChunk = serde_json::from_str(&json).unwrap();
        assert_eq!(back.chunk_index, 1);
    }

    #[test]
    fn test_document_serde_roundtrip() {
        let doc = Document {
            id: any_uuid(),
            title: "文档标题".into(),
            filename: "file.pdf".into(),
            file_path: Some("/path/to/file".into()),
            file_size: Some(1024),
            mime_type: Some("application/pdf".into()),
            content_hash: None,
            category: Some("report".into()),
            tags: Some(vec!["tag1".into()]),
            description: None,
            created_at: "123".into(),
            updated_at: "456".into(),
            status: "processed".into(),
            error_message: None,
        };
        let json = serde_json::to_string(&doc).unwrap();
        let back: Document = serde_json::from_str(&json).unwrap();
        assert_eq!(back.title, "文档标题");
        assert_eq!(back.file_size, Some(1024));
    }

    // ── OpenAI request/response ──

    #[test]
    fn test_openai_request_serde_roundtrip() {
        let req = OpenAIRequest {
            model: "gpt-4".into(),
            messages: vec![OpenAIMessage {
                role: "user".into(),
                content: "hello".into(),
            }],
            temperature: 0.7,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: OpenAIRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.model, "gpt-4");
        assert_eq!(back.messages.len(), 1);
    }

    #[test]
    fn test_openai_message_serde_roundtrip() {
        let msg = OpenAIMessage {
            role: "assistant".into(),
            content: "hi there".into(),
        };
        let json = serde_json::to_string(&msg).unwrap();
        let back: OpenAIMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(back.role, "assistant");
    }

    #[test]
    fn test_embedding_request_serde_roundtrip() {
        let req = EmbeddingRequest {
            model: "text-embedding-3-small".into(),
            input: vec!["text1".into(), "text2".into()],
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: EmbeddingRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.input.len(), 2);
    }

    #[test]
    fn test_embedding_response_serde_roundtrip() {
        let resp = EmbeddingResponse {
            data: vec![EmbeddingData {
                embedding: vec![0.1, 0.2],
            }],
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: EmbeddingResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.data.len(), 1);
    }

    // ── ChatRequest ──

    #[test]
    fn test_chat_request_serde_roundtrip() {
        let req = ChatRequest {
            query: "你好".into(),
            conversation_id: Some("conv-1".into()),
            context: Some(serde_json::json!({"key": "val"})),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: ChatRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.query, "你好");
    }

    // ── ConnectorType / DatabaseType ──

    #[test]
    fn test_connector_type_serde_all_variants() {
        let variants = vec![
            ConnectorType::Database,
            ConnectorType::Api,
            ConnectorType::File,
            ConnectorType::MessageQueue,
            ConnectorType::CloudStorage,
        ];
        for v in &variants {
            let json = serde_json::to_string(v).unwrap();
            let back: ConnectorType = serde_json::from_str(&json).unwrap();
            assert_eq!(format!("{:?}", back), format!("{:?}", v));
        }
    }

    #[test]
    fn test_database_type_serde_all_variants() {
        let variants = vec![
            DatabaseType::Postgres,
            DatabaseType::Mysql,
            DatabaseType::Sqlite,
            DatabaseType::SqlServer,
        ];
        for v in &variants {
            let json = serde_json::to_string(v).unwrap();
            let back: DatabaseType = serde_json::from_str(&json).unwrap();
            assert_eq!(format!("{:?}", back), format!("{:?}", v));
        }
    }

    // ── ConnectorConfig ──

    #[test]
    fn test_connector_config_serde_roundtrip() {
        let config = ConnectorConfig {
            host: Some("localhost".into()),
            port: Some(5432),
            database: Some("mydb".into()),
            username: Some("user".into()),
            password: Some("pass".into()),
            url: None,
            api_key: None,
            endpoint: None,
            bucket: None,
            region: None,
        };
        let json = serde_json::to_string(&config).unwrap();
        let back: ConnectorConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(back.host.as_deref(), Some("localhost"));
        assert_eq!(back.port, Some(5432));
    }

    #[test]
    fn test_connector_config_empty() {
        let config = ConnectorConfig {
            host: None,
            port: None,
            database: None,
            username: None,
            password: None,
            url: None,
            api_key: None,
            endpoint: None,
            bucket: None,
            region: None,
        };
        let json = serde_json::to_string(&config).unwrap();
        let back: ConnectorConfig = serde_json::from_str(&json).unwrap();
        assert!(back.host.is_none());
    }

    // ── DataConnector ──

    #[test]
    fn test_data_connector_serde_roundtrip() {
        let connector = DataConnector {
            id: any_uuid(),
            name: "PG连接".into(),
            connector_type: ConnectorType::Database,
            database_type: Some(DatabaseType::Postgres),
            config: ConnectorConfig {
                host: Some("localhost".into()),
                port: Some(5432),
                database: None,
                username: None,
                password: None,
                url: None,
                api_key: None,
                endpoint: None,
                bucket: None,
                region: None,
            },
            description: Some("测试连接".into()),
            is_active: true,
            created_at: "123".into(),
            updated_at: "456".into(),
        };
        let json = serde_json::to_string(&connector).unwrap();
        let back: DataConnector = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "PG连接");
        assert!(back.is_active);
    }

    // ── CreateConnectorRequest / UpdateConnectorRequest ──

    #[test]
    fn test_create_connector_request_serde_roundtrip() {
        let req = CreateConnectorRequest {
            name: "新连接".into(),
            connector_type: ConnectorType::Api,
            database_type: None,
            config: ConnectorConfig {
                host: None,
                port: None,
                database: None,
                username: None,
                password: None,
                url: Some("https://api.example.com".into()),
                api_key: None,
                endpoint: None,
                bucket: None,
                region: None,
            },
            description: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreateConnectorRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "新连接");
    }

    #[test]
    fn test_update_connector_request_partial() {
        let req: UpdateConnectorRequest = serde_json::from_str("{\"name\":\"更新名称\"}").unwrap();
        assert_eq!(req.name.as_deref(), Some("更新名称"));
        assert!(req.config.is_none());
    }

    // ── DataQueryRequest / Response ──

    #[test]
    fn test_data_query_request_serde_roundtrip() {
        let req = DataQueryRequest {
            connector_id: any_uuid(),
            query: "SELECT * FROM users".into(),
            params: Some(serde_json::json!([1, "test"])),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: DataQueryRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.query, "SELECT * FROM users");
    }

    #[test]
    fn test_data_query_response_serde_roundtrip() {
        let resp = DataQueryResponse {
            columns: vec!["id".into(), "name".into()],
            rows: vec![serde_json::json!([1, "张三"])],
            row_count: 1,
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: DataQueryResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.columns.len(), 2);
    }

    // ── ConnectorStatus ──

    #[test]
    fn test_connector_status_serde_roundtrip() {
        let status = ConnectorStatus {
            connector_id: any_uuid(),
            name: "测试连接".into(),
            is_connected: true,
            error: None,
        };
        let json = serde_json::to_string(&status).unwrap();
        let back: ConnectorStatus = serde_json::from_str(&json).unwrap();
        assert!(back.is_connected);
    }

    // ── AiSearchRequest ──

    #[test]
    fn test_ai_search_request_serde_roundtrip() {
        let req = AiSearchRequest {
            query: "搜索关键词".into(),
            limit: Some(10),
            filters: Some(serde_json::json!({"category": "tech"})),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: AiSearchRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.query, "搜索关键词");
    }

    // ── ReportMetric ──

    #[test]
    fn test_report_metric_serde_roundtrip() {
        let m = ReportMetric {
            label: "收入".into(),
            value: 100000.0,
            unit: Some("元".into()),
        };
        let json = serde_json::to_string(&m).unwrap();
        let back: ReportMetric = serde_json::from_str(&json).unwrap();
        assert_eq!(back.label, "收入");
    }

    // ── ReportAssistantRequest ──

    #[test]
    fn test_report_assistant_request_deserialize() {
        let req: ReportAssistantRequest = serde_json::from_str(
            "{\"query\":\"月度销售\",\"data_source\":\"sales\",\"time_range\":\"2025-01\"}",
        )
        .unwrap();
        assert_eq!(req.query, "月度销售");
        assert_eq!(req.data_source.as_deref(), Some("sales"));
    }

    // ── FlowStep ──

    #[test]
    fn test_flow_step_serialize() {
        let step = FlowStep {
            step: 1,
            name: "提交申请".into(),
            description: "填写并提交申请表".into(),
            responsible: Some("申请人".into()),
            estimated_time: Some("1天".into()),
        };
        let json = serde_json::to_string(&step).unwrap();
        assert!(json.contains("\"step\":1"));
    }

    // ── AnomalyPoint ──

    #[test]
    fn test_anomaly_point_serialize() {
        let point = AnomalyPoint {
            timestamp: "2025-01-01T00:00:00Z".into(),
            value: 150.0,
            expected: Some(100.0),
            severity: "high".into(),
            reason: Some("超出阈值".into()),
        };
        let json = serde_json::to_string(&point).unwrap();
        assert!(json.contains("\"severity\":\"high\""));
    }

    // ── KnowledgeSource ──

    #[test]
    fn test_knowledge_source_serialize() {
        let src = KnowledgeSource {
            title: "知识标题".into(),
            content: Some("知识内容".into()),
            relevance: Some(0.95),
        };
        let json = serde_json::to_string(&src).unwrap();
        assert!(json.contains("\"relevance\":0.95"));
    }
}
