use axum::{
    extract::{Multipart, DefaultBodyLimit, FromRef},
    routing::{get, post},
    Json, Router,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::path::Path;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use walkdir::WalkDir;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Document {
    id: String,
    title: String,
    content: String,
    created_at: String,
    filename: String,
    path: String,
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

static DOCUMENTS: std::sync::OnceLock<Arc<Mutex<Vec<Document>>>> = std::sync::OnceLock::new();
static CLIENT: std::sync::OnceLock<Client> = std::sync::OnceLock::new();
static CONFIG: std::sync::OnceLock<Config> = std::sync::OnceLock::new();
static DOCS_DIR: &str = "docs";

#[derive(Debug)]
struct Config {
    api_key: Option<String>,
    base_url: String,
    model: String,
    use_ollama: bool,
}

#[derive(Debug, Deserialize)]
struct ChatRequest {
    query: String,
}

#[derive(Debug, Serialize)]
struct ChatResponse {
    answer: String,
}

#[derive(Clone)]
struct AppState {
    auth_state: AuthState,
}

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
        if let Ok(content) = fs::read_to_string(file_path) {
            let filename = file_path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let title = file_path.file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let created_at = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
                .to_string();
            
            docs.push(Document {
                id: filename.clone(),
                title,
                content,
                created_at,
                filename,
                path: file_path.to_string_lossy().to_string(),
            });
        }
    }
    
    docs
}

async fn home() -> &'static str {
    "TOPEMS-AI 智能知识库服务 API\n\n✅ AI API 已配置，使用真实 AI\n\n配置说明：\n- 设置 OPENAI_API_KEY 启用真实 AI\n- 可选：OPENAI_BASE_URL（自定义 API 地址）、OPENAI_MODEL（模型名称）\n\n示例：\n- OpenAI: OPENAI_API_KEY=sk-xxx\n- 阿里云/通义千问: OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1, OPENAI_API_KEY=sk-xxx\n- Ollama: OPENAI_BASE_URL=http://localhost:11434/v1, OPENAI_API_KEY=ollama"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("TOPEMS-AI is running!".to_string(), "OK"))
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
        Json(ApiResponse::success(new_docs, &format!("Reloaded {} documents", docs.len())))
    } else {
        Json(ApiResponse::<Vec<Document>>::error(500, "Documents not loaded"))
    }
}

async fn upload_document(mut multipart: Multipart) -> Json<ApiResponse<String>> {
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or_default().to_string();
        if name == "file" {
            let filename = field.file_name().unwrap_or_default().to_string();
            let data = field.bytes().await.unwrap_or_default();
            
            let content = String::from_utf8_lossy(&data).to_string();
            
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
                        let created_at = SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs()
                            .to_string();
                        
                        docs.push(Document {
                            id: filename.clone(),
                            title,
                            content,
                            created_at,
                            filename: filename.clone(),
                            path: path.to_string_lossy().to_string(),
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

async fn chat(Json(req): Json<ChatRequest>) -> Json<ApiResponse<ChatResponse>> {
    let docs = if let Some(d) = DOCUMENTS.get() {
        d.lock().unwrap().clone()
    } else {
        Vec::new()
    };
    
    let context = docs
        .iter()
        .map(|doc| format!("- {}: {}", doc.title, doc.content))
        .collect::<Vec<_>>()
        .join("\n");
    
    let prompt = format!(
        "你是 TOPEMS 智能助手。请根据以下知识库内容回答用户的问题。\n\n知识库内容：\n{}\n\n用户问题：{}",
        context, req.query
    );
    
    let config = CONFIG.get().unwrap();
    let client = CLIENT.get().unwrap();
    
    let answer = if config.use_ollama || config.api_key.is_some() {
        tracing::info!("🤖 正在调用 AI 模型...");
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
                tracing::error!("❌ AI 调用失败: {}", e);
                get_mock_response(&req.query)
            }
            Err(_) => {
                tracing::error!("❌ AI 调用超时（超过 120 秒）");
                get_mock_response(&req.query)
            }
        }
    } else {
        tracing::info!("⚠️ 使用模拟 AI 响应（未配置 API Key）");
        get_mock_response(&req.query)
    };
    
    Json(ApiResponse::success(ChatResponse { answer }, "Success"))
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
    
    let response = req_builder.json(&request).send().await?;
    
    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        tracing::error!("API 请求失败: {} - {}", status, error_text);
        return Err(format!("API Error: {} - {}", status, error_text).into());
    }
    
    let openai_response: OpenAIResponse = response.json().await?;
    
    if let Some(choice) = openai_response.choices.first() {
        Ok(choice.message.content.clone())
    } else {
        Err("No response from AI".into())
    }
}

fn get_mock_response(query: &str) -> String {
    let lower_query = query.to_lowercase();
    
    if lower_query.contains("topems") || lower_query.contains("系统") {
        "TOPEMS 是面向化工新材料研发生产企业的全业务数字化平台，包含以下核心模块：\n\n1. TOPEMS-DOC - 文档管理\n2. TOPEMS-IAM - 身份认证\n3. TOPEMS-AI - AI 知识库（我就是）\n4. TOPEMS-FLOW - 工作流\n5. 还有 TOPEMS-RS、TOPEMS-LIMS、TOPEMS-QMS 等业务系统\n\n如需更多帮助，请继续提问！".to_string()
    } else if lower_query.contains("研发") || lower_query.contains("化工") {
        "化工新材料研发通常包含以下阶段：\n\n1. 立项阶段：确定研究方向和目标\n2. 配方研发：实验室小试研发\n3. 小试实验：在小规模试验设备中验证\n4. 中试放大：在中试生产设备中放大验证\n5. 质量检测：产品质量分析检测\n6. 批量生产：正式规模化生产\n\nTOPEMS 系统可以支持全流程数字化管理！".to_string()
    } else {
        format!(
            "您好！这是模拟 AI 响应（因为没有配置真实的 AI API Key）。\n\n您的问题：{}\n\n请配置 OPENAI_API_KEY 来启用真实 AI。\n\n示例配置：\n- OpenAI: 设置 OPENAI_API_KEY=sk-xxx\n- 阿里云通义千问: 设置 OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1 和 OPENAI_API_KEY=sk-xxx",
            query
        )
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_ai=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-AI 智能知识库服务启动中...");
    dotenv::dotenv().ok();

    let api_key = std::env::var("OLLAMA_API_KEY").ok()
        .or_else(|| std::env::var("OPENAI_API_KEY").ok());
    
    let base_url = std::env::var("OLLAMA_URL")
        .or_else(|_| std::env::var("OLLAMA_BASE_URL"))
        .or_else(|_| std::env::var("OPENAI_BASE_URL"))
        .unwrap_or_else(|_| "http://localhost:11434/v1".to_string());
    
    let model = std::env::var("OLLAMA_MODEL")
        .or_else(|_| std::env::var("OPENAI_MODEL"))
        .unwrap_or_else(|_| "qwen2.5:7b-instruct".to_string());
    
    let use_ollama = std::env::var("OLLAMA_URL").is_ok() || 
                     std::env::var("OLLAMA_BASE_URL").is_ok() ||
                     base_url.contains("localhost:11434") ||
                     base_url.contains("127.0.0.1:11434");

    let docs = load_documents_from_dir(DOCS_DIR).await;
    tracing::info!("✅ 加载了 {} 个知识库文档", docs.len());
    DOCUMENTS.set(Arc::new(Mutex::new(docs))).unwrap();
    
    CLIENT.set(Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .unwrap()
    ).unwrap();
    
    CONFIG.set(Config {
        api_key: api_key.clone(),
        base_url: base_url.clone(),
        model: model.clone(),
        use_ollama,
    }).unwrap();

    let app_state = AppState {
        auth_state: AuthState::from_env(),
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .with_state(app_state.clone());

    let protected_routes = Router::new()
        .route("/api/v1/ai/chat", post(chat))
        .route("/api/v1/documents", get(list_documents))
        .route("/api/v1/documents/reload", post(reload_documents))
        .route("/api/v1/documents/upload", post(upload_document))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors)
        .layer(DefaultBodyLimit::max(500 * 1024 * 1024));

    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8003".to_string())
        .parse()
        .unwrap_or(8003);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS-AI 服务运行在 http://{}", addr);
    tracing::info!("🔒 认证保护已启用");
    
    if use_ollama {
        tracing::info!("✅ 使用 Ollama 本地 AI 服务 (模型: {}, 地址: {}, 超时: 120 秒)", model, base_url);
    } else if api_key.is_some() {
        tracing::info!("✅ 使用云端 AI 服务 (模型: {}, 超时: 120 秒)", model);
    } else {
        tracing::info!("⚠️ AI API 未配置，将使用模拟响应");
    }
    
    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
