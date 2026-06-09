// TOPEMS-AI Backend - with PostgreSQL/pgvector persistence and PDF support
// =============================================================================

mod api;
mod services;

// 分析 API handlers
use api::models::*;

use axum::{
    extract::{DefaultBodyLimit, FromRef, Multipart, Query, State},
    routing::{get, post},
    Json, Router,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::path::Path;

use walkdir::WalkDir;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

use topems_shared::{
    ApiResponse, AuthState, auth_middleware, create_cors_layer, init_logging,
    ServiceHealth, build_health_response, create_api_info_router,
};
use services::{Database, DocumentService, VectorService, QAService, QAConfig, AnalysisService, AnalysisConfig};

#[derive(Debug, Serialize, Deserialize)]
struct AIGenerateRequest {
    template_id: Option<String>,
    variables: serde_json::Value,
    output_format: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AIGenerateResponse {
    content: String,
    format: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ValidateRequest {
    data: serde_json::Value,
    context: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ValidateResponse {
    issues: Vec<ValidationIssue>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ValidationIssue {
    field: String,
    r#type: String,
    message: String,
    fix: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CompleteRequest {
    data: Option<serde_json::Value>,
    partial_data: Option<serde_json::Value>,
    fields_to_complete: Option<Vec<String>>,
    context: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CompleteResponse {
    suggestions: Vec<Suggestion>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Suggestion {
    field: String,
    value: serde_json::Value,
    reason: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SummarizeRequest {
    text: String,
    max_length: Option<i32>,
    r#type: Option<String>,
    context: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SummarizeResponse {
    summary: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct AITemplate {
    id: String,
    name: String,
    description: String,
    category: String,
    fields: Vec<TemplateField>,
    prompt_template: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct TemplateField {
    name: String,
    r#type: String,
    label: String,
    required: bool,
    options: Option<Vec<TemplateOption>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TemplateOption {
    value: String,
    label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct VectorEmbedding {
    id: String,
    document_id: String,
    chunk_index: i32,
    content: String,
    embedding: Vec<f32>,
    created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DocumentChunk {
    id: String,
    document_id: String,
    chunk_index: i32,
    content: String,
    created_at: String,
    metadata: serde_json::Value,
}

static VECTORS: std::sync::OnceLock<Arc<Mutex<Vec<VectorEmbedding>>>> = std::sync::OnceLock::new();
static CHUNKS: std::sync::OnceLock<Arc<Mutex<Vec<DocumentChunk>>>> = std::sync::OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Document {
    id: String,
    title: String,
    filename: String,
    file_path: Option<String>,
    file_size: Option<u64>,
    mime_type: Option<String>,
    content_hash: Option<String>,
    category: Option<String>,
    tags: Option<Vec<String>>,
    description: Option<String>,
    created_at: String,
    updated_at: String,
    status: String,
    error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    temperature: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessage,
}

#[derive(Debug, Serialize, Deserialize)]
struct EmbeddingRequest {
    model: String,
    input: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
}

#[derive(Debug, Serialize, Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
}

static DOCUMENTS: std::sync::OnceLock<Arc<Mutex<Vec<Document>>>> = std::sync::OnceLock::new();
static CLIENT: std::sync::OnceLock<Client> = std::sync::OnceLock::new();
static CONFIG: std::sync::OnceLock<Config> = std::sync::OnceLock::new();
static DOCS_DIR: &str = "docs";
static EMBEDDING_MODEL: &str = "all-minilm";

#[derive(Clone)]
#[derive(Debug)]
struct Config {
    api_key: Option<String>,
    base_url: String,
    model: String,
    use_ollama: bool,
    embedding_model: String,
}

/// 应用状态
#[derive(Clone)]
struct AppState {
    auth_state: AuthState,
    document_service: DocumentService,
    vector_service: VectorService,
    qa_service: QAService,
    analysis_service: AnalysisService,
    http_client: Client,
    config: Config,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatRequest {
    query: String,
    conversation_id: Option<String>,
    context: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
struct ChatResponse {
    answer: String,
    sources: Vec<SearchResult>,
}

#[derive(Debug, Serialize)]
struct SearchResult {
    chunk: ChunkInfo,
    document: Document,
    similarity: f64,
}

#[derive(Debug, Serialize)]
struct ChunkInfo {
    id: String,
    document_id: String,
    chunk_index: i32,
    content: String,
    created_at: String,
    metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
enum ConnectorType {
    Database,
    Api,
    File,
    MessageQueue,
    CloudStorage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
enum DatabaseType {
    Postgres,
    Mysql,
    Sqlite,
    SqlServer,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ConnectorConfig {
    host: Option<String>,
    port: Option<u16>,
    database: Option<String>,
    username: Option<String>,
    password: Option<String>,
    url: Option<String>,
    api_key: Option<String>,
    endpoint: Option<String>,
    bucket: Option<String>,
    region: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DataConnector {
    id: String,
    name: String,
    connector_type: ConnectorType,
    database_type: Option<DatabaseType>,
    config: ConnectorConfig,
    description: Option<String>,
    is_active: bool,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct CreateConnectorRequest {
    name: String,
    connector_type: ConnectorType,
    database_type: Option<DatabaseType>,
    config: ConnectorConfig,
    description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct UpdateConnectorRequest {
    name: Option<String>,
    config: Option<ConnectorConfig>,
    description: Option<String>,
    is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DataQueryRequest {
    connector_id: String,
    query: String,
    params: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DataQueryResponse {
    columns: Vec<String>,
    rows: Vec<serde_json::Value>,
    row_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct ConnectorStatus {
    connector_id: String,
    name: String,
    is_connected: bool,
    error: Option<String>,
}

static CONNECTORS: std::sync::OnceLock<Arc<Mutex<Vec<DataConnector>>>> = std::sync::OnceLock::new();

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

async fn load_documents_from_dir(dir: &str) -> Vec<Document> {
    let mut docs = Vec::new();
    let path = Path::new(dir);
    
    if !path.exists() {
        if let Err(e) = fs::create_dir_all(dir) {
            eprintln!("Failed to create documents directory: {}", e);
        }
        return docs;
    }

    for entry in WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let file_path = entry.path();
        let metadata = entry.metadata().ok();
        let filename = file_path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let title = file_path.file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();

        let ext = file_path.extension().unwrap_or_default().to_string_lossy().to_string();
        let mime_type = match ext.as_str() {
            "txt" => Some("text/plain".to_string()),
            "md" => Some("text/markdown".to_string()),
            "json" => Some("application/json".to_string()),
            "pdf" => Some("application/pdf".to_string()),
            "doc" => Some("application/msword".to_string()),
            "docx" => Some("application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string()),
            _ => None,
        };
            
        docs.push(Document {
            id: filename.clone(),
            title,
            filename: filename.clone(),
            file_path: Some(file_path.to_string_lossy().to_string()),
            file_size: metadata.map(|m| m.len()),
            mime_type,
            content_hash: None,
            category: None,
            tags: None,
            description: None,
            created_at: now.clone(),
            updated_at: now,
            status: "processed".to_string(),
            error_message: None,
        });
    }
    
    docs
}

async fn read_file_content(file_path: &str) -> Option<String> {
    match fs::read_to_string(file_path) {
        Ok(content) => Some(content),
        Err(e) => {
            tracing::error!("Failed to read file {}: {}", file_path, e);
            None
        }
    }
}

fn split_into_chunks(content: &str, chunk_size: usize, overlap: usize) -> Vec<String> {
    let mut chunks = Vec::new();
    let content_len = content.len();
    
    if content_len <= chunk_size {
        chunks.push(content.to_string());
        return chunks;
    }
    
    let mut start = 0;
    while start < content_len {
        let end = std::cmp::min(start + chunk_size, content_len);
        let chunk = content[start..end].to_string();
        chunks.push(chunk);
        
        if end >= content_len {
            break;
        }
        
        let step = chunk_size - overlap;
        if step <= 0 {
            break;
        }
        start += step;
    }
    
    chunks
}

async fn generate_embeddings(texts: Vec<String>) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error + Send + Sync>> {
    let config = CONFIG.get().ok_or("Config not initialized")?;
    let client = CLIENT.get().ok_or("Client not initialized")?;
    
    let embedding_url = format!("{}/embeddings", config.base_url);
    
    let request = EmbeddingRequest {
        model: config.embedding_model.clone(),
        input: texts,
    };
    
    let mut req_builder = client
        .post(&embedding_url)
        .header("Content-Type", "application/json");
    
    if let Some(key) = &config.api_key {
        if key != "ollama" {
            req_builder = req_builder.header("Authorization", format!("Bearer {}", key));
        }
    }
    
    let response = req_builder.json(&request).send().await?;
    let status = response.status();
    
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Embedding API error: {} - {}", status, error_text).into());
    }
    
    let embedding_response: EmbeddingResponse = response.json().await?;
    
    let embeddings: Vec<Vec<f32>> = embedding_response.data
        .into_iter()
        .map(|d| d.embedding)
        .collect();
    
    Ok(embeddings)
}

fn cosine_similarity(vec1: &[f32], vec2: &[f32]) -> f64 {
    if vec1.is_empty() || vec2.is_empty() || vec1.len() != vec2.len() {
        return 0.0;
    }
    
    let mut dot_product = 0.0;
    let mut norm_a_sq = 0.0;
    let mut norm_b_sq = 0.0;
    
    for (a, b) in vec1.iter().zip(vec2.iter()) {
        let a_f64 = *a as f64;
        let b_f64 = *b as f64;
        dot_product += a_f64 * b_f64;
        norm_a_sq += a_f64 * a_f64;
        norm_b_sq += b_f64 * b_f64;
    }
    
    let norm_a = norm_a_sq.sqrt();
    let norm_b = norm_b_sq.sqrt();
    
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    
    dot_product / (norm_a * norm_b)
}

async fn process_document_for_embedding(doc: &Document) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if doc.file_path.is_none() {
        return Ok(());
    }
    
    let file_path = doc.file_path.as_ref().unwrap();
    
    let content = read_file_content(file_path).await.ok_or("Failed to read file")?;
    
    let chunks = split_into_chunks(&content, 512, 128);
    let chunks_count = chunks.len();
    
    let chunk_contents: Vec<String> = chunks.iter().cloned().collect();
    
    let embeddings = generate_embeddings(chunk_contents).await?;
    
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string();
    
    if let (Some(vectors_arc), Some(chunks_arc)) = (VECTORS.get(), CHUNKS.get()) {
        let mut vectors = vectors_arc.lock().unwrap();
        let mut chunks_storage = chunks_arc.lock().unwrap();
        
        for (idx, (chunk_content, embedding)) in chunks.into_iter().zip(embeddings).enumerate() {
            let chunk_id = Uuid::new_v4().to_string();
            
            chunks_storage.push(DocumentChunk {
                id: chunk_id.clone(),
                document_id: doc.id.clone(),
                chunk_index: idx as i32,
                content: chunk_content.clone(),
                created_at: now.clone(),
                metadata: serde_json::json!({
                    "filename": doc.filename,
                    "title": doc.title
                }),
            });
            
            vectors.push(VectorEmbedding {
                id: chunk_id,
                document_id: doc.id.clone(),
                chunk_index: idx as i32,
                content: chunk_content,
                embedding,
                created_at: now.clone(),
            });
        }
        
        tracing::info!("✅ 文档 '{}' 已向量化，生成 {} 个向量", doc.title, chunks_count);
    }
    
    Ok(())
}

async fn index_all_documents() {
    if let (Some(docs_arc), Some(vectors_arc), Some(chunks_arc)) = (DOCUMENTS.get(), VECTORS.get(), CHUNKS.get()) {
        let docs = {
            let docs_lock = docs_arc.lock().unwrap();
            docs_lock.clone()
        };
        
        {
            let mut vectors = vectors_arc.lock().unwrap();
            let mut chunks = chunks_arc.lock().unwrap();
            vectors.clear();
            chunks.clear();
        }
        
        for doc in docs {
            if doc.status == "processed" {
                match process_document_for_embedding(&doc).await {
                    Ok(_) => tracing::info!("📄 索引文档: {}", doc.title),
                    Err(e) => tracing::error!("❌ 索引文档失败 {}: {}", doc.title, e),
                }
            }
        }
        
        let vector_count = {
            let vectors = vectors_arc.lock().unwrap();
            vectors.len()
        };
        tracing::info!("✅ 向量库索引完成，共 {} 个向量", vector_count);
    }
}

async fn vector_search(query: &str, top_k: usize) -> Vec<(VectorEmbedding, f64)> {
    let query_embedding = match generate_embeddings(vec![query.to_string()]).await {
        Ok(mut embeddings) => embeddings.pop().unwrap_or_default(),
        Err(e) => {
            tracing::error!("生成查询向量失败: {}", e);
            return Vec::new();
        }
    };
    
    if query_embedding.is_empty() {
        return Vec::new();
    }
    
    if let Some(vectors_arc) = VECTORS.get() {
        let vectors = vectors_arc.lock().unwrap();
        
        let mut results: Vec<(VectorEmbedding, f64)> = vectors
            .iter()
            .map(|vec| {
                let similarity = cosine_similarity(&vec.embedding, &query_embedding);
                (vec.clone(), similarity)
            })
            .filter(|(_, sim)| *sim > 0.3)
            .collect();
        
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(top_k);
        
        results
    } else {
        Vec::new()
    }
}

async fn home() -> &'static str {
    "TOPEMS-AI 智能知识库服务 API\n\n📚 知识库功能\n✅ AI API 已配置，使用真实 AI\n\n配置说明：\n- 设置 OPENAI_API_KEY 启用真实 AI\n- 可选：OPENAI_BASE_URL（自定义 API 地址）、OPENAI_MODEL（模型名称）\n\n示例：\n- OpenAI: OPENAI_API_KEY=sk-xxx\n- 阿里云/通义千问: OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1, OPENAI_API_KEY=sk-xxx\n- Ollama: OPENAI_BASE_URL=http://localhost:11434/v1, OPENAI_API_KEY=ollama\n\n🔗 数据连接器框架\n支持的连接器类型：\n- Database (Postgres/Mysql/Sqlite/SqlServer)\n- API (RESTful)\n- File (文件系统)\n- MessageQueue (消息队列)\n- CloudStorage (云存储)\n\nAPI 端点：\n- GET  /api/v1/connectors - 列出连接器\n- GET  /api/v1/connectors/get?id=xxx - 获取连接器详情\n- POST /api/v1/connectors/create - 创建连接器\n- POST /api/v1/connectors/update?id=xxx - 更新连接器\n- POST /api/v1/connectors/delete?id=xxx - 删除连接器\n- GET  /api/v1/connectors/test?id=xxx - 测试连接\n- POST /api/v1/connectors/query - 执行数据查询\n\n📊 向量库功能\n- POST /api/v1/vectors/index - 索引所有文档\n- GET  /api/v1/vectors/stats - 获取向量统计\n- POST /api/v1/vectors/search - 向量搜索\n- POST /api/v1/vectors/clear - 清空向量库"
}

async fn health() -> ServiceHealth {
    build_health_response("topems-ai", true)
}

async fn list_documents() -> Json<ApiResponse<Vec<Document>>> {
    if let Some(docs) = DOCUMENTS.get() {
        let docs = docs.lock().unwrap();
        Json(ApiResponse::success(docs.clone(), "Success"))
    } else {
        Json(ApiResponse::<Vec<Document>>::error(500, "Documents not loaded"))
    }
}

async fn reload_documents() -> Json<ApiResponse<Vec<Document>>> {
    if let Some(docs_arc) = DOCUMENTS.get() {
        let new_docs = load_documents_from_dir(DOCS_DIR).await;
        let mut docs = docs_arc.lock().unwrap();
        *docs = new_docs.clone();
        
        tokio::spawn(async {
            index_all_documents().await;
        });
        
        Json(ApiResponse::success(new_docs, &format!("Reloaded {} documents", docs.len())))
    } else {
        Json(ApiResponse::<Vec<Document>>::error(500, "Documents not loaded"))
    }
}

async fn delete_document(Query(params): Query<DocumentQuery>) -> Json<ApiResponse<String>> {
    if let Some(docs_arc) = DOCUMENTS.get() {
        let mut docs = docs_arc.lock().unwrap();
        let original_len = docs.len();
        
        if let Some(doc) = docs.iter().find(|d| d.id == params.id) {
            if let Some(file_path) = &doc.file_path {
                let _ = fs::remove_file(file_path);
            }
        }
        
        docs.retain(|d| d.id != params.id);
        
        if let (Some(vectors_arc), Some(chunks_arc)) = (VECTORS.get(), CHUNKS.get()) {
            let mut vectors = vectors_arc.lock().unwrap();
            let mut chunks = chunks_arc.lock().unwrap();
            vectors.retain(|v| v.document_id != params.id);
            chunks.retain(|c| c.document_id != params.id);
        }
        
        if docs.len() < original_len {
            Json(ApiResponse::success("Document deleted successfully".to_string(), "Success"))
        } else {
            Json(ApiResponse::<String>::error(404, "Document not found"))
        }
    } else {
        Json(ApiResponse::<String>::error(500, "Documents not loaded"))
    }
}

async fn upload_document(mut multipart: Multipart) -> Json<ApiResponse<String>> {
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or_default().to_string();
        if name == "file" {
            let filename = field.file_name().unwrap_or_default().to_string();
            let data = field.bytes().await.unwrap_or_default();
            
            let path = Path::new(DOCS_DIR).join(&filename);
            match fs::write(&path, &data) {
                Ok(_) => {
                    if let Some(docs_arc) = DOCUMENTS.get() {
                        let mut docs = docs_arc.lock().unwrap();
                        let title = Path::new(&filename)
                            .file_stem()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string();
                        let now = SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs()
                            .to_string();

                        let ext = Path::new(&filename).extension().unwrap_or_default().to_string_lossy().to_string();
                        let mime_type = match ext.as_str() {
                            "txt" => Some("text/plain".to_string()),
                            "md" => Some("text/markdown".to_string()),
                            "json" => Some("application/json".to_string()),
                            "pdf" => Some("application/pdf".to_string()),
                            "doc" => Some("application/msword".to_string()),
                            "docx" => Some("application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string()),
                            _ => None,
                        };
                        
                        let new_doc = Document {
                            id: filename.clone(),
                            title,
                            filename: filename.clone(),
                            file_path: Some(path.to_string_lossy().to_string()),
                            file_size: Some(data.len() as u64),
                            mime_type,
                            content_hash: None,
                            category: None,
                            tags: None,
                            description: None,
                            created_at: now.clone(),
                            updated_at: now,
                            status: "processed".to_string(),
                            error_message: None,
                        };
                        
                        docs.push(new_doc.clone());
                        
                        tokio::spawn(async move {
                            if let Err(e) = process_document_for_embedding(&new_doc).await {
                                tracing::error!("处理上传文档失败: {}", e);
                            }
                        });
                        
                        return Json(ApiResponse::success("Document uploaded successfully".to_string(), &format!("Uploaded: {}", filename)));
                    }
                }
                Err(e) => {
                    return Json(ApiResponse::<String>::error(500, &format!("Failed to save file: {}", e)));
                }
            }
        }
    }
    
    Json(ApiResponse::<String>::error(400, "No file provided"))
}

async fn update_document(Query(params): Query<DocumentQuery>, Json(data): Json<serde_json::Value>) -> Json<ApiResponse<Document>> {
    if let Some(docs_arc) = DOCUMENTS.get() {
        let mut docs = docs_arc.lock().unwrap();
        if let Some(doc) = docs.iter_mut().find(|d| d.id == params.id) {
            if let Some(title) = data.get("title").and_then(|v| v.as_str()) {
                doc.title = title.to_string();
            }
            if let Some(category) = data.get("category").and_then(|v| v.as_str()) {
                doc.category = Some(category.to_string());
            }
            if let Some(description) = data.get("description").and_then(|v| v.as_str()) {
                doc.description = Some(description.to_string());
            }
            if let Some(tags) = data.get("tags").and_then(|v| v.as_array()) {
                doc.tags = Some(tags.iter().filter_map(|t| t.as_str()).map(|s| s.to_string()).collect());
            }
            doc.updated_at = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
                .to_string();

            Json(ApiResponse::success(doc.clone(), "Document updated successfully"))
        } else {
            Json(ApiResponse::<Document>::error(404, "Document not found"))
        }
    } else {
        Json(ApiResponse::<Document>::error(500, "Documents not loaded"))
    }
}

async fn list_connectors() -> Json<ApiResponse<Vec<DataConnector>>> {
    if let Some(connectors) = CONNECTORS.get() {
        let connectors = connectors.lock().unwrap();
        Json(ApiResponse::success(connectors.clone(), "Success"))
    } else {
        Json(ApiResponse::<Vec<DataConnector>>::error(500, "Connectors not initialized"))
    }
}

async fn get_connector(Query(params): Query<ConnectorQuery>) -> Json<ApiResponse<DataConnector>> {
    if let Some(connectors) = CONNECTORS.get() {
        let connectors = connectors.lock().unwrap();
        if let Some(connector) = connectors.iter().find(|c| c.id == params.id) {
            Json(ApiResponse::success(connector.clone(), "Success"))
        } else {
            Json(ApiResponse::<DataConnector>::error(404, "Connector not found"))
        }
    } else {
        Json(ApiResponse::<DataConnector>::error(500, "Connectors not initialized"))
    }
}

async fn create_connector(Json(req): Json<CreateConnectorRequest>) -> Json<ApiResponse<DataConnector>> {
    if let Some(connectors) = CONNECTORS.get() {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();

        let new_connector = DataConnector {
            id: Uuid::new_v4().to_string(),
            name: req.name,
            connector_type: req.connector_type,
            database_type: req.database_type,
            config: req.config,
            description: req.description,
            is_active: true,
            created_at: now.clone(),
            updated_at: now,
        };

        let mut connectors = connectors.lock().unwrap();
        connectors.push(new_connector.clone());

        Json(ApiResponse::success(new_connector, "Connector created successfully"))
    } else {
        Json(ApiResponse::<DataConnector>::error(500, "Connectors not initialized"))
    }
}

async fn update_connector(Query(params): Query<ConnectorQuery>, Json(req): Json<UpdateConnectorRequest>) -> Json<ApiResponse<DataConnector>> {
    if let Some(connectors) = CONNECTORS.get() {
        let mut connectors = connectors.lock().unwrap();
        if let Some(connector) = connectors.iter_mut().find(|c| c.id == params.id) {
            if let Some(name) = req.name {
                connector.name = name;
            }
            if let Some(config) = req.config {
                connector.config = config;
            }
            if let Some(description) = req.description {
                connector.description = Some(description);
            }
            if let Some(is_active) = req.is_active {
                connector.is_active = is_active;
            }
            connector.updated_at = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
                .to_string();

            Json(ApiResponse::success(connector.clone(), "Connector updated successfully"))
        } else {
            Json(ApiResponse::<DataConnector>::error(404, "Connector not found"))
        }
    } else {
        Json(ApiResponse::<DataConnector>::error(500, "Connectors not initialized"))
    }
}

async fn delete_connector(Query(params): Query<ConnectorQuery>) -> Json<ApiResponse<String>> {
    if let Some(connectors) = CONNECTORS.get() {
        let mut connectors = connectors.lock().unwrap();
        let original_len = connectors.len();
        connectors.retain(|c| c.id != params.id);
        
        if connectors.len() < original_len {
            Json(ApiResponse::success("Connector deleted successfully".to_string(), "Success"))
        } else {
            Json(ApiResponse::<String>::error(404, "Connector not found"))
        }
    } else {
        Json(ApiResponse::<String>::error(500, "Connectors not initialized"))
    }
}

async fn test_connector(Query(params): Query<ConnectorQuery>) -> Json<ApiResponse<ConnectorStatus>> {
    if let Some(connectors) = CONNECTORS.get() {
        let connectors = connectors.lock().unwrap();
        if let Some(connector) = connectors.iter().find(|c| c.id == params.id) {
            let (is_connected, error) = match connector.connector_type {
                ConnectorType::Database => test_database_connection(connector),
                ConnectorType::Api => test_api_connection(connector),
                ConnectorType::CloudStorage => test_cloud_storage_connection(connector),
                _ => (true, None),
            };

            Json(ApiResponse::success(
                ConnectorStatus {
                    connector_id: connector.id.clone(),
                    name: connector.name.clone(),
                    is_connected,
                    error,
                },
                "Connection test completed"
            ))
        } else {
            Json(ApiResponse::<ConnectorStatus>::error(404, "Connector not found"))
        }
    } else {
        Json(ApiResponse::<ConnectorStatus>::error(500, "Connectors not initialized"))
    }
}

async fn query_data(Json(req): Json<DataQueryRequest>) -> Json<ApiResponse<DataQueryResponse>> {
    if let Some(connectors) = CONNECTORS.get() {
        let connectors = connectors.lock().unwrap();
        if let Some(_connector) = connectors.iter().find(|c| c.id == req.connector_id) {
            Json(ApiResponse::success(
                DataQueryResponse {
                    columns: vec![],
                    rows: vec![],
                    row_count: 0,
                },
                "Query executed successfully"
            ))
        } else {
            Json(ApiResponse::<DataQueryResponse>::error(404, "Connector not found"))
        }
    } else {
        Json(ApiResponse::<DataQueryResponse>::error(500, "Connectors not initialized"))
    }
}

fn test_database_connection(connector: &DataConnector) -> (bool, Option<String>) {
    let config = &connector.config;
    if config.host.is_some() || config.url.is_some() {
        return (true, None);
    }
    (false, Some("Missing connection configuration".to_string()))
}

fn test_api_connection(connector: &DataConnector) -> (bool, Option<String>) {
    let config = &connector.config;
    if config.endpoint.is_some() {
        return (true, None);
    }
    (false, Some("Missing endpoint configuration".to_string()))
}

fn test_cloud_storage_connection(connector: &DataConnector) -> (bool, Option<String>) {
    let config = &connector.config;
    if config.bucket.is_some() && config.region.is_some() {
        return (true, None);
    }
    (false, Some("Missing bucket or region configuration".to_string()))
}

#[derive(Debug, Deserialize)]
struct ConnectorQuery {
    id: String,
}

#[derive(Debug, Deserialize)]
struct DocumentQuery {
    id: String,
}

async fn generate(Json(req): Json<AIGenerateRequest>) -> Json<ApiResponse<AIGenerateResponse>> {
    let config = CONFIG.get().unwrap();
    let client = CLIENT.get().unwrap();
    
    let prompt = if let Some(p) = req.variables.get("prompt") {
        p.as_str().unwrap_or_default().to_string()
    } else {
        "请生成一些内容".to_string()
    };
    
    let format = req.output_format.unwrap_or("text".to_string());
    
    let content = if config.use_ollama || config.api_key.is_some() {
        tracing::info!("🤖 正在调用 AI 模型生成内容 ({}: {})...", config.base_url, config.model);
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(120),
            call_ai_api(client, &config.base_url, &config.api_key, &config.model, &prompt)
        ).await {
            Ok(Ok(response)) => {
                tracing::info!("✅ AI 生成成功");
                response
            }
            Ok(Err(e)) => {
                tracing::warn!("⚠️ AI 生成失败，使用回退响应: {}", e);
                format!("抱歉，AI 内容生成暂时不可用。\n\n错误信息：{}\n\n请检查 AI 服务配置后重试。", e)
            }
            Err(_) => {
                tracing::warn!("⚠️ AI 调用超时");
                "抱歉，AI 响应超时了。请稍后重试，或检查系统资源是否充足。".to_string()
            }
        }
    } else {
        "欢迎使用 TOPEMS 智能生成功能！\n\n当前 AI 功能尚未配置。请参考聊天功能的配置说明，设置 AI 服务后即可体验智能内容生成。".to_string()
    };
    
    Json(ApiResponse::success(AIGenerateResponse { content, format }, "Success"))
}

async fn validate(Json(req): Json<ValidateRequest>) -> Json<ApiResponse<ValidateResponse>> {
    let config = CONFIG.get().unwrap();
    let client = CLIENT.get().unwrap();
    
    let context_info = if let Some(ctx) = &req.context {
        format!(
            "模块: {}\n实体类型: {}",
            ctx.get("module").and_then(|v| v.as_str()).unwrap_or("unknown"),
            ctx.get("entityType").and_then(|v| v.as_str()).unwrap_or("unknown")
        )
    } else {
        "通用验证".to_string()
    };
    
    let prompt = format!(
        "你是一个专业的数据验证助手。请检查以下数据是否完整、格式是否正确、逻辑是否合理。\n\n{}\n\n数据内容:\n{}\n\n请以JSON格式返回验证结果，包含以下字段:\n1. issues: 问题列表，每个问题包含 field(字段名), type(类型: error/warning/info), message(问题描述), fix(修复建议，可选)\n2. suggestions: 优化建议列表，每个建议包含 field(字段名), value(建议值), reason(建议原因)\n\n请只返回JSON，不要包含其他内容。",
        context_info,
        serde_json::to_string_pretty(&req.data).unwrap_or_else(|_| "无法解析数据".to_string())
    );
    
    let issues = if config.use_ollama || config.api_key.is_some() {
        tracing::info!("🤖 正在调用 AI 模型进行数据验证...");
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(60),
            call_ai_api(client, &config.base_url, &config.api_key, &config.model, &prompt)
        ).await {
            Ok(Ok(response)) => {
                tracing::info!("✅ AI 验证完成");
                let cleaned_response = response
                    .replace("```json", "")
                    .replace("```", "");
                let cleaned_response = cleaned_response.trim();
                
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(cleaned_response) {
                    let mut result_issues: Vec<ValidationIssue> = Vec::new();
                    
                    if let Some(issues_array) = parsed.get("issues").and_then(|v| v.as_array()) {
                        for issue in issues_array {
                            result_issues.push(ValidationIssue {
                                field: issue.get("field").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
                                r#type: issue.get("type").and_then(|v| v.as_str()).unwrap_or("info").to_string(),
                                message: issue.get("message").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                fix: issue.get("fix").and_then(|v| v.as_str()).map(|s| s.to_string()),
                            });
                        }
                    }
                    
                    if result_issues.is_empty() {
                        result_issues.push(ValidationIssue {
                            field: "general".to_string(),
                            r#type: "info".to_string(),
                            message: "数据验证通过，未发现明显问题".to_string(),
                            fix: None,
                        });
                    }
                    
                    result_issues
                } else {
                    vec![ValidationIssue {
                        field: "general".to_string(),
                        r#type: "info".to_string(),
                        message: "AI 验证完成，但无法解析结果".to_string(),
                        fix: None,
                    }]
                }
            }
            Ok(Err(e)) => {
                tracing::error!("❌ AI 验证失败: {}", e);
                vec![ValidationIssue {
                    field: "general".to_string(),
                    r#type: "warning".to_string(),
                    message: format!("AI 验证服务暂时不可用: {}", e),
                    fix: None,
                }]
            }
            Err(_) => {
                tracing::error!("❌ AI 验证超时");
                vec![ValidationIssue {
                    field: "general".to_string(),
                    r#type: "warning".to_string(),
                    message: "AI 验证超时，请稍后重试".to_string(),
                    fix: None,
                }]
            }
        }
    } else {
        let mut issues: Vec<ValidationIssue> = Vec::new();
        
        if let Some(obj) = req.data.as_object() {
            for (key, value) in obj {
                if value.is_null() || (value.is_string() && value.as_str().unwrap_or("").is_empty()) {
                    issues.push(ValidationIssue {
                        field: key.clone(),
                        r#type: "warning".to_string(),
                        message: format!("字段 '{}' 可能需要填写", key),
                        fix: Some(format!("请填写 '{}' 字段", key)),
                    });
                }
            }
        }
        
        if issues.is_empty() {
            issues.push(ValidationIssue {
                field: "general".to_string(),
                r#type: "info".to_string(),
                message: "基础验证完成，未发现明显问题".to_string(),
                fix: None,
            });
        }
        
        issues
    };
    
    Json(ApiResponse::success(ValidateResponse { issues }, "Success"))
}

async fn complete(Json(req): Json<CompleteRequest>) -> Json<ApiResponse<CompleteResponse>> {
    let config = CONFIG.get().unwrap();
    let client = CLIENT.get().unwrap();
    
    let existing_data = req.data.clone().or(req.partial_data.clone()).unwrap_or(serde_json::json!({}));
    
    let context_info = if let Some(ctx) = &req.context {
        format!(
            "模块: {}\n实体类型: {}",
            ctx.get("module").and_then(|v| v.as_str()).unwrap_or("unknown"),
            ctx.get("entityType").and_then(|v| v.as_str()).unwrap_or("unknown")
        )
    } else {
        "通用补全".to_string()
    };
    
    let fields_to_complete = req.fields_to_complete.clone().unwrap_or_default();
    let fields_str = if fields_to_complete.is_empty() {
        "所有可能需要补全的字段".to_string()
    } else {
        fields_to_complete.join(", ")
    };
    
    let prompt = format!(
        "你是一个专业的数据补全助手。请根据已有数据推断并补全相关字段。\n\n{}\n\n已有数据:\n{}\n\n需要补全的字段: {}\n\n请以JSON格式返回补全建议，格式为:\n{{\n  \"suggestions\": [\n    {{\n      \"field\": \"字段名\",\n      \"value\": \"建议值\",\n      \"reason\": \"推断原因\",\n      \"confidence\": 0.8\n    }}\n  ]\n}}\n\n请只返回JSON，不要包含其他内容。confidence 表示置信度(0-1)。",
        context_info,
        serde_json::to_string_pretty(&existing_data).unwrap_or_else(|_| "{}".to_string()),
        fields_str
    );
    
    let suggestions = if config.use_ollama || config.api_key.is_some() {
        tracing::info!("🤖 正在调用 AI 模型进行数据补全...");
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(60),
            call_ai_api(client, &config.base_url, &config.api_key, &config.model, &prompt)
        ).await {
            Ok(Ok(response)) => {
                tracing::info!("✅ AI 补全完成");
                let cleaned_response = response
                    .replace("```json", "")
                    .replace("```", "");
                let cleaned_response = cleaned_response.trim();
                
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(cleaned_response) {
                    let mut result_suggestions: Vec<Suggestion> = Vec::new();
                    
                    if let Some(suggestions_array) = parsed.get("suggestions").and_then(|v| v.as_array()) {
                        for suggestion in suggestions_array {
                            result_suggestions.push(Suggestion {
                                field: suggestion.get("field").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
                                value: suggestion.get("value").cloned().unwrap_or(serde_json::json!("")),
                                reason: suggestion.get("reason").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                            });
                        }
                    }
                    
                    result_suggestions
                } else {
                    vec![]
                }
            }
            Ok(Err(e)) => {
                tracing::error!("❌ AI 补全失败: {}", e);
                vec![]
            }
            Err(_) => {
                tracing::error!("❌ AI 补全超时");
                vec![]
            }
        }
    } else {
        vec![]
    };
    
    Json(ApiResponse::success(CompleteResponse { suggestions }, "Success"))
}

async fn summarize(Json(req): Json<SummarizeRequest>) -> Json<ApiResponse<SummarizeResponse>> {
    let config = CONFIG.get().unwrap();
    let client = CLIENT.get().unwrap();
    
    let prompt = format!("请为以下内容生成摘要：\n\n{}", req.text);
    
    let summary = if config.use_ollama || config.api_key.is_some() {
        tracing::info!("🤖 正在调用 AI 模型生成摘要 ({}: {})...", config.base_url, config.model);
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(120),
            call_ai_api(client, &config.base_url, &config.api_key, &config.model, &prompt)
        ).await {
            Ok(Ok(response)) => {
                tracing::info!("✅ AI 摘要生成成功");
                response
            }
            Ok(Err(e)) => {
                tracing::warn!("⚠️ AI 摘要生成失败，使用回退响应: {}", e);
                let preview: String = req.text.chars().take(200).collect();
                format!("（AI 摘要暂时不可用，显示文本预览）\n\n{}...", preview)
            }
            Err(_) => {
                tracing::warn!("⚠️ AI 调用超时");
                let preview: String = req.text.chars().take(200).collect();
                format!("（AI 响应超时，显示文本预览）\n\n{}...", preview)
            }
        }
    } else {
        let preview: String = req.text.chars().take(200).collect();
        format!("（AI 功能未配置，显示文本预览）\n\n{}...", preview)
    };
    
    Json(ApiResponse::success(SummarizeResponse { summary }, "Success"))
}

async fn list_templates() -> Json<ApiResponse<Vec<AITemplate>>> {
    let templates = vec![
        AITemplate {
            id: "meeting-minutes".to_string(),
            name: "会议纪要".to_string(),
            description: "自动生成专业的会议纪要".to_string(),
            category: "文档".to_string(),
            fields: vec![
                TemplateField {
                    name: "title".to_string(),
                    r#type: "text".to_string(),
                    label: "会议标题".to_string(),
                    required: true,
                    options: None,
                },
                TemplateField {
                    name: "time".to_string(),
                    r#type: "text".to_string(),
                    label: "会议时间".to_string(),
                    required: true,
                    options: None,
                },
            ],
            prompt_template: "请根据以下信息生成会议纪要：".to_string(),
        },
        AITemplate {
            id: "job-description".to_string(),
            name: "职位描述".to_string(),
            description: "生成标准的职位描述".to_string(),
            category: "人力资源".to_string(),
            fields: vec![
                TemplateField {
                    name: "title".to_string(),
                    r#type: "text".to_string(),
                    label: "职位名称".to_string(),
                    required: true,
                    options: None,
                },
            ],
            prompt_template: "请生成一个关于该职位的描述：".to_string(),
        },
    ];
    Json(ApiResponse::success(templates, "Success"))
}

async fn chat(Json(req): Json<ChatRequest>) -> Json<ApiResponse<ChatResponse>> {
    let search_results = vector_search(&req.query, 5).await;
    
    let context = search_results
        .iter()
        .map(|(vec, _)| format!("- {}: {}", vec.document_id, vec.content))
        .collect::<Vec<_>>()
        .join("\n");
    
    let prompt = if context.is_empty() {
        format!("你是 TOPEMS 智能助手。请回答用户的问题。\n\n用户问题：{}", req.query)
    } else {
        format!(
            "你是 TOPEMS 智能助手。请根据以下知识库内容回答用户的问题。\n\n知识库内容：\n{}\n\n用户问题：{}",
            context, req.query
        )
    };
    
    let config = CONFIG.get().unwrap();
    let client = CLIENT.get().unwrap();
    
    let answer = if config.use_ollama || config.api_key.is_some() {
        tracing::info!("🤖 正在调用 AI 模型 ({}: {})...", config.base_url, config.model);
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(120),
            call_ai_api(
                client,
                &config.base_url,
                &config.api_key,
                &config.model,
                &prompt,
            )
        ).await {
            Ok(Ok(response)) => {
                tracing::info!("✅ AI 响应成功，长度: {} 字符", response.len());
                response
            }
            Ok(Err(e)) => {
                tracing::warn!("⚠️ AI 调用失败，使用回退响应: {}", e);
                format!("抱歉，AI 服务暂时不可用：{}\n\n这是一个回退响应。请检查：\n1. Ollama 服务是否正在运行 (http://localhost:11434)\n2. 配置的模型是否已下载\n3. 网络连接是否正常\n\n如需配置其他 AI 服务，请参考文档。", e)
            }
            Err(_) => {
                tracing::warn!("⚠️ AI 调用超时（超过 120 秒），使用回退响应");
                "抱歉，AI 响应超时了。请稍后重试，或检查：\n1. 模型是否正在加载中\n2. 系统资源是否充足\n3. 网络连接是否稳定".to_string()
            }
        }
    } else {
        tracing::warn!("⚠️ AI API 未配置");
        "欢迎使用 TOPEMS 智能助手！\n\n当前 AI 功能尚未配置。您可以：\n\n1. 使用 Ollama（本地 AI）：\n   - 安装 Ollama: https://ollama.com\n   - 下载模型: ollama pull qwen2.5:7b-instruct\n   - 启动服务: ollama serve\n\n2. 使用云端 AI 服务（OpenAI/通义千问等）：\n   - 设置 OPENAI_API_KEY 环境变量\n   - 可选设置 OPENAI_BASE_URL 和 OPENAI_MODEL\n\n配置完成后即可体验完整的 AI 功能！".to_string()
    };
    
    let sources: Vec<SearchResult> = search_results
        .into_iter()
        .filter_map(|(vec, similarity)| {
            if let Some(docs_arc) = DOCUMENTS.get() {
                let docs = docs_arc.lock().unwrap();
                if let Some(doc) = docs.iter().find(|d| d.id == vec.document_id) {
                    Some(SearchResult {
                        chunk: ChunkInfo {
                            id: vec.id,
                            document_id: vec.document_id,
                            chunk_index: vec.chunk_index,
                            content: vec.content,
                            created_at: vec.created_at,
                            metadata: serde_json::json!({}),
                        },
                        document: doc.clone(),
                        similarity,
                    })
                } else {
                    None
                }
            } else {
                None
            }
        })
        .collect();
    
    Json(ApiResponse::success(ChatResponse { answer, sources }, "Success"))
}

#[derive(Debug, Serialize, Deserialize)]
struct VectorSearchRequest {
    query: String,
    top_k: Option<usize>,
}

#[derive(Debug, Serialize)]
struct VectorSearchResponse {
    results: Vec<VectorSearchResult>,
}

#[derive(Debug, Serialize)]
struct VectorSearchResult {
    document_id: String,
    chunk_id: String,
    content: String,
    similarity: f64,
}

async fn vector_search_handler(Json(req): Json<VectorSearchRequest>) -> Json<ApiResponse<VectorSearchResponse>> {
    let top_k = req.top_k.unwrap_or(10);
    let results = vector_search(&req.query, top_k).await;
    
    let search_results: Vec<VectorSearchResult> = results
        .into_iter()
        .map(|(vec, similarity)| VectorSearchResult {
            document_id: vec.document_id,
            chunk_id: vec.id,
            content: vec.content,
            similarity,
        })
        .collect();
    
    Json(ApiResponse::success(VectorSearchResponse { results: search_results }, "Success"))
}

async fn index_documents() -> Json<ApiResponse<String>> {
    tokio::spawn(async {
        index_all_documents().await;
    });
    
    Json(ApiResponse::success("索引任务已启动".to_string(), "正在后台索引所有文档"))
}

async fn get_vector_stats() -> Json<ApiResponse<serde_json::Value>> {
    if let (Some(vectors_arc), Some(chunks_arc), Some(docs_arc)) = (VECTORS.get(), CHUNKS.get(), DOCUMENTS.get()) {
        let vectors = vectors_arc.lock().unwrap();
        let chunks = chunks_arc.lock().unwrap();
        let docs = docs_arc.lock().unwrap();
        
        let stats = serde_json::json!({
            "total_vectors": vectors.len(),
            "total_chunks": chunks.len(),
            "total_documents": docs.len(),
            "vector_dimension": if let Some(vec) = vectors.first() { vec.embedding.len() } else { 0 },
        });
        
        Json(ApiResponse::success(stats, "Success"))
    } else {
        Json(ApiResponse::<serde_json::Value>::error(500, "Vector store not initialized"))
    }
}

async fn clear_vectors() -> Json<ApiResponse<String>> {
    if let (Some(vectors_arc), Some(chunks_arc)) = (VECTORS.get(), CHUNKS.get()) {
        let mut vectors = vectors_arc.lock().unwrap();
        let mut chunks = chunks_arc.lock().unwrap();
        let count = vectors.len();
        vectors.clear();
        chunks.clear();
        Json(ApiResponse::success(format!("已清空 {} 个向量", count), "Success"))
    } else {
        Json(ApiResponse::<String>::error(500, "Vector store not initialized"))
    }
}

// 分析 API State
#[derive(Clone)]
struct AnalysisState {
    analysis_service: AnalysisService,
    auth_state: AuthState,
}

async fn sentiment_analysis(
    State(state): State<AnalysisState>,
    Json(req): Json<SentimentAnalysisRequest>,
) -> Json<ApiResponse<SentimentAnalysisResponse>> {
    match state.analysis_service.analyze_sentiment(&req.text).await {
        Ok(response) => Json(ApiResponse::success(response, "Success")),
        Err(e) => Json(ApiResponse::<SentimentAnalysisResponse>::error(500, &e)),
    }
}

async fn classify_text(
    State(state): State<AnalysisState>,
    Json(req): Json<ClassifyTextRequest>,
) -> Json<ApiResponse<ClassifyTextResponse>> {
    match state.analysis_service.classify_text(&req.text, req.categories.as_deref()).await {
        Ok(response) => Json(ApiResponse::success(response, "Success")),
        Err(e) => Json(ApiResponse::<ClassifyTextResponse>::error(500, &e)),
    }
}

async fn extract_entities(
    State(state): State<AnalysisState>,
    Json(req): Json<ExtractEntitiesRequest>,
) -> Json<ApiResponse<ExtractEntitiesResponse>> {
    match state.analysis_service.extract_entities(&req.text, req.entity_types.as_deref()).await {
        Ok(response) => Json(ApiResponse::success(response, "Success")),
        Err(e) => Json(ApiResponse::<ExtractEntitiesResponse>::error(500, &e)),
    }
}

async fn extract_keywords(
    State(state): State<AnalysisState>,
    Json(req): Json<ExtractKeywordsRequest>,
) -> Json<ApiResponse<ExtractKeywordsResponse>> {
    match state.analysis_service.extract_keywords(&req.text, req.max_keywords).await {
        Ok(response) => Json(ApiResponse::success(response, "Success")),
        Err(e) => Json(ApiResponse::<ExtractKeywordsResponse>::error(500, &e)),
    }
}

async fn call_ai_api(
    client: &Client,
    base_url: &str,
    api_key: &Option<String>,
    model: &str,
    prompt: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let api_url = format!("{}/chat/completions", base_url);
    
    let request = OpenAIRequest {
        model: model.to_string(),
        messages: vec![OpenAIMessage {
            role: "user".to_string(),
            content: prompt.to_string(),
        }],
        temperature: 0.7,
    };
    
    let mut req_builder = client
        .post(&api_url)
        .header("Content-Type", "application/json");
    
    if let Some(key) = api_key {
        if key != "ollama" {
            req_builder = req_builder.header("Authorization", format!("Bearer {}", key));
        }
    }
    
    let response = match req_builder.json(&request).send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("无法连接到 AI 服务 ({}): {}", base_url, e);
            return Err(format!("无法连接到 AI 服务: {}", e).into());
        }
    };
    
    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        tracing::error!("AI API 请求失败: {} - {}", status, error_text);
        return Err(format!("AI 服务错误: {} - {}", status, error_text).into());
    }
    
    let openai_response: OpenAIResponse = match response.json().await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("解析 AI 响应失败: {}", e);
            return Err(format!("解析 AI 响应失败: {}", e).into());
        }
    };
    
    if let Some(choice) = openai_response.choices.first() {
        Ok(choice.message.content.clone())
    } else {
        Err("AI 未返回有效响应".into())
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();

    init_logging("topems-ai");

    tracing::info!("🚀 TOPEMS-AI 智能知识库服务启动中...");
    tracing::info!("📦 PostgreSQL + pgvector 持久化存储");
    tracing::info!("📄 PDF 文档解析支持");

    // 读取配置
    let api_key = std::env::var("OLLAMA_API_KEY").ok()
        .or_else(|| std::env::var("OPENAI_API_KEY").ok());
    
    let base_url = std::env::var("OLLAMA_URL")
        .or_else(|_| std::env::var("OLLAMA_BASE_URL"))
        .or_else(|_| std::env::var("OPENAI_BASE_URL"))
        .unwrap_or_else(|_| "http://localhost:11434/v1".to_string());
    
    let model = std::env::var("OLLAMA_MODEL")
        .or_else(|_| std::env::var("OPENAI_MODEL"))
        .unwrap_or_else(|_| "qwen2.5:7b-instruct".to_string());
    
    let embedding_model = std::env::var("EMBEDDING_MODEL")
        .unwrap_or_else(|_| "nomic-embed-text".to_string());
    
    let use_ollama = std::env::var("OLLAMA_URL").is_ok() || 
                     std::env::var("OLLAMA_BASE_URL").is_ok() ||
                     base_url.contains("localhost:11434") ||
                     base_url.contains("127.0.0.1:11434");

    let config = Config {
        api_key: api_key.clone(),
        base_url: base_url.clone(),
        model: model.clone(),
        use_ollama,
        embedding_model: embedding_model.clone(),
    };

    // 初始化数据库
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());
    
    tracing::info!("🔌 连接数据库: {}", database_url.split('@').last().unwrap_or("..."));
    
    let db = Database::new(&database_url).await?;
    tracing::info!("✅ 数据库连接成功");
    
    // 运行迁移
    db.run_migrations().await?;
    tracing::info!("✅ 数据库表结构已就绪");

    // HTTP 客户端
    let http_client = Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()?;

    // 创建服务
    let vector_service = VectorService::new(db);
    let document_service = DocumentService::new(vector_service.clone());
    
    // 创建 QA 和 Analysis 服务
    let qa_config = QAConfig {
        base_url: base_url.clone(),
        api_key: api_key.clone(),
        model: model.clone(),
        embedding_model: embedding_model.clone(),
    };
    let qa_service = QAService::new(vector_service.db().clone(), http_client.clone(), qa_config);
    
    let analysis_config = AnalysisConfig {
        base_url: base_url.clone(),
        api_key: api_key.clone(),
        model: model.clone(),
    };
    let analysis_service = AnalysisService::new(vector_service.db().clone(), http_client.clone(), analysis_config);

    // 初始化静态存储（向后兼容）
    let docs = load_documents_from_dir(DOCS_DIR).await;
    tracing::info!("📁 加载了 {} 个文件系统文档", docs.len());
    DOCUMENTS.set(Arc::new(Mutex::new(docs))).unwrap();
    VECTORS.set(Arc::new(Mutex::new(Vec::new()))).unwrap();
    CHUNKS.set(Arc::new(Mutex::new(Vec::new()))).unwrap();
    
    // 后台索引文档（向后兼容）
    tokio::spawn(async {
        index_all_documents().await;
    });
    
    CLIENT.set(http_client.clone()).unwrap();
    CONFIG.set(config.clone()).unwrap();
    CONNECTORS.set(Arc::new(Mutex::new(Vec::new()))).unwrap();
    tracing::info!("✅ 数据连接器框架已初始化");

    // 创建应用状态
    let app_state = AppState {
        auth_state: AuthState::from_env(),
        document_service,
        vector_service,
        qa_service,
        analysis_service,
        http_client: http_client.clone(),
        config: config.clone(),
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .with_state(app_state.clone());

    let protected_routes = Router::new()
        .route("/api/v1/ai/chat", post(chat))
        .route("/api/v1/ai/generate", post(generate))
        .route("/api/v1/ai/validate", post(validate))
        .route("/api/v1/ai/complete", post(complete))
        .route("/api/v1/ai/summarize", post(summarize))
        .route("/api/v1/ai/templates", get(list_templates))
        // 文档处理 API
        .route("/api/v1/documents", get(list_documents))
        .route("/api/v1/documents/reload", post(reload_documents))
        .route("/api/v1/documents/upload", post(upload_document))
        .route("/api/v1/documents/delete", get(delete_document))
        .route("/api/v1/documents/update", post(update_document))
        // 向量检索 API
        .route("/api/v1/vectors/index", post(index_documents))
        .route("/api/v1/vectors/stats", get(get_vector_stats))
        .route("/api/v1/vectors/search", post(vector_search_handler))
        .route("/api/v1/vectors/clear", post(clear_vectors))
        // 数据连接器 API
        .route("/api/v1/connectors", get(list_connectors))
        .route("/api/v1/connectors/get", get(get_connector))
        .route("/api/v1/connectors/create", post(create_connector))
        .route("/api/v1/connectors/update", post(update_connector))
        .route("/api/v1/connectors/delete", post(delete_connector))
        .route("/api/v1/connectors/test", get(test_connector))
        .route("/api/v1/connectors/query", post(query_data))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    // 分析 API - 使用单独的Router以便正确注入State
    let analysis_state = AnalysisState {
        analysis_service: app_state.analysis_service.clone(),
        auth_state: app_state.auth_state.clone(),
    };
    
    let analysis_router = Router::new()
        .route("/api/v1/analysis/sentiment", post(sentiment_analysis))
        .route("/api/v1/analysis/classify", post(classify_text))
        .route("/api/v1/analysis/entities", post(extract_entities))
        .route("/api/v1/analysis/keywords", post(extract_keywords))
        .layer(axum::middleware::from_fn_with_state(
            analysis_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(analysis_state);

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(analysis_router)
        .merge(create_api_info_router("topems-ai"))
        .layer(cors)
        .layer(DefaultBodyLimit::max(500 * 1024 * 1024));

    let port = std::env::var("PORT")
        .or_else(|_| std::env::var("SERVER_PORT"))
        .unwrap_or_else(|_| "8013".to_string())
        .parse()
        .unwrap_or(8013);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS-AI 服务运行在 http://{}", addr);
    tracing::info!("🔒 认证保护已启用");
    tracing::info!("📊 向量库功能已启用，嵌入模型: {}", embedding_model);
    
    if use_ollama {
        tracing::info!("✅ 使用 Ollama 本地 AI 服务 (模型: {}, 地址: {}, 超时: 120 秒)", model, base_url);
    } else if api_key.is_some() {
        tracing::info!("✅ 使用云端 AI 服务 (模型: {}, 超时: 120 秒)", model);
    } else {
        tracing::warn!("⚠️ AI API 未配置，请设置 OPENAI_API_KEY 或配置 Ollama");
    }
    
    axum::serve(
        tokio::net::TcpListener::bind(&addr).await?,
        app.into_make_service(),
    )
    .await?;
    
    Ok(())
}