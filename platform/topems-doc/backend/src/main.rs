use axum::{
    extract::{Path, Query, State, DefaultBodyLimit},
    http::{StatusCode, header},
    response::IntoResponse,
    routing::{get, post, delete},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

mod models;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(code: i32, message: &str) -> Self {
        ApiResponse {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn ok(message: &str) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoredFile {
    pub metadata: models::FileMetadata,
    pub content: Vec<u8>,
}

#[derive(Debug, Clone)]
struct AppState {
    files: Arc<Mutex<Vec<StoredFile>>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListFilesQuery {
    pub folder_id: Option<Uuid>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct ListFilesResponse {
    pub files: Vec<models::FileMetadata>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}

async fn home() -> &'static str {
    "TOPEMS-DOC 文档管理服务 API\n\n健康检查: GET /health\n\n文件接口:\n- GET /api/v1/files - 获取文件列表\n- POST /api/v1/files - 上传文件\n- GET /api/v1/files/:id - 获取文件详情\n- GET /api/v1/files/:id/download - 下载文件\n- DELETE /api/v1/files/:id - 删除文件\n"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("TOPEMS-DOC 服务正在运行!".to_string(), "OK"))
}

async fn list_files(
    State(state): State<AppState>,
    Query(query): Query<ListFilesQuery>,
) -> Json<ApiResponse<ListFilesResponse>> {
    tracing::debug!("获取文件列表: {:?}", query);
    
    let files = state.files.lock().unwrap();
    let total = files.len() as u64;
    
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    
    let start = ((page - 1) * page_size) as usize;
    let end = std::cmp::min(start + page_size as usize, files.len());
    
    let paged_files = if start < files.len() {
        files[start..end].iter().map(|f| f.metadata.clone()).collect()
    } else {
        vec![]
    };
    
    Json(ApiResponse::success(
        ListFilesResponse {
            files: paged_files,
            total,
            page,
            page_size,
        },
        "获取文件列表成功"
    ))
}

async fn upload_file(
    State(state): State<AppState>,
    mut stream: axum::extract::Multipart,
) -> Json<ApiResponse<models::FileMetadata>> {
    tracing::debug!("上传文件...");
    
    let mut file_name = "uploaded_file.txt".to_string();
    let mut file_size: i64 = 0;
    let mut content_type = "text/plain".to_string();
    let mut folder_id: Option<Uuid> = None;
    let mut file_content = Vec::new();

    while let Some(field) = stream.next_field().await.transpose() {
        match field {
            Ok(mut field) => {
                let name = field.name().unwrap_or("");
                
                if name == "file" {
                    file_name = field.file_name().unwrap_or("uploaded_file.txt").to_string();
                    content_type = field.content_type().unwrap_or("text/plain").to_string();
                    
                    // 使用块读取，避免一次性加载整个大文件到内存
                    while let Some(chunk) = field.chunk().await.transpose() {
                        match chunk {
                            Ok(data) => {
                                file_content.extend_from_slice(&data);
                            }
                            Err(e) => {
                                tracing::error!("读取文件块失败: {:?}", e);
                                return Json(ApiResponse::error(500, "读取文件失败"));
                            }
                        }
                    }
                    file_size = file_content.len() as i64;
                } else if name == "folder_id" {
                    if let Ok(value) = field.text().await {
                        folder_id = Uuid::parse_str(&value).ok();
                    }
                }
            }
            Err(e) => {
                tracing::error!("解析表单字段失败: {:?}", e);
                return Json(ApiResponse::error(400, "解析请求失败"));
            }
        }
    }

    if file_size == 0 {
        return Json(ApiResponse::error(400, "文件内容为空"));
    }

    let file = models::FileMetadata {
        id: Uuid::new_v4(),
        name: file_name,
        folder_id,
        size: file_size,
        content_type,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        created_by: "admin".to_string(),
    };
    
    let stored_file = StoredFile {
        metadata: file.clone(),
        content: file_content,
    };
    
    state.files.lock().unwrap().push(stored_file);
    
    tracing::info!("文件上传成功: {}, 大小: {} bytes", file.name, file_size);
    
    Json(ApiResponse::success(file, "文件上传成功"))
}

async fn get_file(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<models::FileMetadata>> {
    tracing::debug!("获取文件: {}", id);
    
    let files = state.files.lock().unwrap();
    
    if let Some(stored_file) = files.iter().find(|f| f.metadata.id == id) {
        Json(ApiResponse::success(stored_file.metadata.clone(), "获取文件成功"))
    } else {
        Json(ApiResponse::error(404, "文件不存在"))
    }
}

async fn download_file(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    tracing::debug!("下载文件: {}", id);
    
    let files = state.files.lock().unwrap();
    
    if let Some(stored_file) = files.iter().find(|f| f.metadata.id == id) {
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            header::CONTENT_TYPE,
            stored_file.metadata.content_type.clone().parse().unwrap(),
        );
        headers.insert(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", stored_file.metadata.name)
                .parse()
                .unwrap(),
        );
        
        (StatusCode::OK, headers, stored_file.content.clone())
    } else {
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, "text/plain".parse().unwrap());
        
        (StatusCode::NOT_FOUND, headers, b"File not found".to_vec())
    }
}

async fn preview_file(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    tracing::debug!("预览文件: {}", id);
    
    let files = state.files.lock().unwrap();
    
    if let Some(stored_file) = files.iter().find(|f| f.metadata.id == id) {
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            header::CONTENT_TYPE,
            stored_file.metadata.content_type.clone().parse().unwrap(),
        );
        // 使用 inline 而不是 attachment，这样浏览器会尝试直接显示
        headers.insert(
            header::CONTENT_DISPOSITION,
            format!("inline; filename=\"{}\"", stored_file.metadata.name)
                .parse()
                .unwrap(),
        );
        
        (StatusCode::OK, headers, stored_file.content.clone())
    } else {
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, "text/plain".parse().unwrap());
        
        (StatusCode::NOT_FOUND, headers, b"File not found".to_vec())
    }
}

async fn delete_file(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("删除文件: {}", id);
    
    let mut files = state.files.lock().unwrap();
    
    if let Some(pos) = files.iter().position(|f| f.metadata.id == id) {
        files.remove(pos);
        tracing::info!("文件删除成功: {}", id);
        Json(ApiResponse::ok("文件删除成功"))
    } else {
        Json(ApiResponse::error(404, "文件不存在"))
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_doc=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-DOC 文档管理服务启动中...");
    dotenv::dotenv().ok();

    let now = Utc::now();
    
    let state = AppState {
        files: Arc::new(Mutex::new(vec![
            StoredFile {
                metadata: models::FileMetadata {
                    id: Uuid::new_v4(),
                    name: "README.md".to_string(),
                    folder_id: None,
                    size: 2048,
                    content_type: "text/markdown".to_string(),
                    created_at: now,
                    updated_at: now,
                    created_by: "admin".to_string(),
                },
                content: b"# TOPEMS-DOC Document Management System\n\nThis is an example document content.\n\n## Features\n- File upload\n- File download\n- File management\n- Folder management\n".to_vec(),
            },
            StoredFile {
                metadata: models::FileMetadata {
                    id: Uuid::new_v4(),
                    name: "tech-doc.docx".to_string(),
                    folder_id: None,
                    size: 102400,
                    content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string(),
                    created_at: now,
                    updated_at: now,
                    created_by: "admin".to_string(),
                },
                content: b"Dummy Word Document Content".to_vec(),
            }
        ])),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/v1/files", get(list_files))
        .route("/api/v1/files", post(upload_file))
        .route("/api/v1/files/:id", get(get_file))
        .route("/api/v1/files/:id/download", get(download_file))
        .route("/api/v1/files/:id/preview", get(preview_file))
        .route("/api/v1/files/:id", delete(delete_file))
        .with_state(state)
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http())
        // 设置请求体大小限制为 500MB，支持大文件上传
        .layer(DefaultBodyLimit::max(500 * 1024 * 1024));

    let _host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8001".to_string())
        .parse()
        .unwrap_or(8001);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    
    tracing::info!("✅ TOPEMS-DOC 服务运行在 http://{}", addr);
    tracing::info!("📋 已加载示例文件");
    
    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
