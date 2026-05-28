use axum::{
    extract::{Path, Query, State, DefaultBodyLimit},
    http::{StatusCode, header},
    response::IntoResponse,
    routing::{get, post, delete, put},
    Json, Router,
};
use axum::middleware as axum_middleware;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use dotenv::dotenv;
use utoipa::{OpenApi, ToSchema};

mod models;
mod db;
mod services;
mod middleware;

use middleware::auth::Claims;
use db::repository::{FileRepository, FolderRepository, FileVersionRepository};
use models::{FileMetadata, Permission};
use services::storage_service::StorageService;
use services::conversion_service::ConversionService;
use services::permission_service::PermissionService;
use middleware::auth::{AuthState, optional_auth_middleware, OptionalClaims};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StorageMode {
    Memory,
    Database,
}

#[derive(Debug, Clone)]
pub struct MemoryStoredFolder {
    pub metadata: models::Folder,
}

#[derive(Debug, Clone)]
pub struct MemoryStoredFileVersion {
    pub version: models::FileVersion,
    pub content: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStoredFile {
    pub metadata: models::FileMetadata,
    pub content: Vec<u8>,
}

#[derive(Clone)]
pub struct AppState {
    memory_files: Arc<Mutex<Vec<MemoryStoredFile>>>,
    memory_folders: Arc<Mutex<Vec<MemoryStoredFolder>>>,
    memory_file_versions: Arc<Mutex<Vec<MemoryStoredFileVersion>>>,
    file_repo: Option<FileRepository>,
    folder_repo: Option<FolderRepository>,
    file_version_repo: Option<FileVersionRepository>,
    storage_service: Option<StorageService>,
    conversion_service: ConversionService,
    permission_service: Option<PermissionService>,
    storage_mode: StorageMode,
    jwt_secret: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, utoipa::IntoParams)]
pub struct ListFilesQuery {
    pub folder_id: Option<Uuid>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListFilesResponse {
    pub files: Vec<FileMetadata>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct HealthResponse {
    pub service: String,
    pub status: String,
    pub storage_mode: String,
    pub storage_backend: String,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateFolderRequest {
    pub name: String,
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateFolderRequest {
    pub name: String,
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListFoldersResponse {
    pub folders: Vec<models::Folder>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, utoipa::IntoParams)]
pub struct ListFoldersQuery {
    pub parent_id: Option<Uuid>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, utoipa::IntoParams)]
pub struct ListFileVersionsQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListFileVersionsResponse {
    pub versions: Vec<models::FileVersion>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct RestoreFileVersionRequest {
    pub file_id: Uuid,
    pub version_id: Uuid,
}

#[derive(OpenApi)]
#[openapi(
    paths(
        health,
        list_files,
        get_file,
        delete_file,
        upload_file,
        list_folders,
        create_folder,
        get_folder,
        update_folder,
        delete_folder,
        list_file_versions,
        get_file_version,
        download_file_version
        // restore_file_version
    ),
    components(
        schemas(
            HealthResponse,
            ListFilesQuery,
            ListFilesResponse,
            FileMetadata,
            ApiResponse::<HealthResponse>,
            ApiResponse::<ListFilesResponse>,
            ApiResponse::<FileMetadata>,
            ApiResponse::<()>,
            models::Folder,
            CreateFolderRequest,
            UpdateFolderRequest,
            ListFoldersQuery,
            ListFoldersResponse,
            ApiResponse::<models::Folder>,
            ApiResponse::<ListFoldersResponse>,
            models::FileVersion,
            ListFileVersionsQuery,
            ListFileVersionsResponse,
            RestoreFileVersionRequest,
            ApiResponse::<models::FileVersion>,
            ApiResponse::<ListFileVersionsResponse>
        )
    ),
    info(
        title = "TOPEMS Document Management Service API",
        version = "1.0.0",
        description = "API documentation for TOPEMS Document Management Service"
    )
)]
struct ApiDoc;

async fn try_connect_db() -> (Option<sqlx::PgPool>, StorageMode) {
    // 检查是否强制使用内存模式（仅用于开发测试）
    if let Ok(use_memory) = std::env::var("USE_MEMORY_STORAGE") {
        if use_memory.to_lowercase() == "true" {
            tracing::warn!("⚠️ USE_MEMORY_STORAGE=true 强制使用内存模式，生产环境不推荐！");
            return (None, StorageMode::Memory);
        }
    }
    
    // 尝试连接数据库
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());
    
    tracing::info!("🔌 正在连接数据库: {}", database_url);
    
    match db::create_pool(&database_url).await {
        Ok(pool) => {
            tracing::info!("✅ 数据库连接成功");
            // 初始化数据库表
            if let Err(e) = init_database_tables(&pool).await {
                tracing::warn!("⚠️ 数据库表初始化警告: {}", e);
            }
            (Some(pool), StorageMode::Database)
        }
        Err(e) => {
            tracing::error!("❌ 数据库连接失败: {}", e);
            tracing::error!("💡 请确保 PostgreSQL 服务已启动并配置正确的 DATABASE_URL");
            // 不再回退到内存模式，直接报错（生产环境必须使用数据库）
            panic!("无法连接到数据库: {}", e);
        }
    }
}

async fn init_database_tables(pool: &sqlx::PgPool) -> anyhow::Result<()> {
    // 读取并执行迁移脚本
    let migration = include_str!("./db/migrations/20260523000001_create_doc_schema.sql");
    
    sqlx::query(migration).execute(pool).await?;
    
    tracing::info!("🗄️ 数据库表初始化完成");
    Ok(())
}

async fn get_file_by_id(state: &AppState, id: Uuid) -> Option<FileMetadata> {
    match state.storage_mode {
        StorageMode::Database => {
            if let Some(repo) = &state.file_repo {
                if let Ok(Some(file)) = repo.find_by_id(id).await {
                    return Some(file);
                }
            }
            None
        }
        StorageMode::Memory => {
            let files = state.memory_files.lock().unwrap();
            files.iter().find(|f| f.metadata.id == id).map(|f| f.metadata.clone())
        }
    }
}

async fn get_file_content(state: &AppState, id: Uuid) -> Option<Vec<u8>> {
    match state.storage_mode {
        StorageMode::Database => {
            if let Some(storage) = &state.storage_service {
                if let Ok(content) = storage.load_file(&id).await {
                    return Some(content);
                }
            }
            None
        }
        StorageMode::Memory => {
            let files = state.memory_files.lock().unwrap();
            files.iter().find(|f| f.metadata.id == id).map(|f| f.content.clone())
        }
    }
}

async fn home() -> &'static str {
    "TOPEMS-DOC 文档管理服务 API\n\n健康检查: GET /health"
}

#[utoipa::path(
    get,
    path = "/health",
    tag = "health",
    responses(
        (status = 200, description = "Service healthy", body = ApiResponse<HealthResponse>)
    )
)]
async fn health(State(state): State<AppState>) -> Json<ApiResponse<HealthResponse>> {
    let storage_mode_str = match state.storage_mode {
        StorageMode::Memory => "memory".to_string(),
        StorageMode::Database => "database".to_string(),
    };
    
    let storage_backend = state
        .storage_service
        .as_ref()
        .map(|s| s.get_backend_type().to_string())
        .unwrap_or_else(|| "none".to_string());
    
    Json(ApiResponse::success(
        HealthResponse {
            service: "topems-doc".to_string(),
            status: "healthy".to_string(),
            storage_mode: storage_mode_str,
            storage_backend,
            timestamp: Utc::now().to_rfc3339(),
        },
        "TOPEMS-DOC 服务正在运行",
    ))
}

#[utoipa::path(
    get,
    path = "/api/v1/files",
    tag = "files",
    params(ListFilesQuery),
    responses(
        (status = 200, description = "List files successfully", body = ApiResponse<ListFilesResponse>),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn list_files(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Query(query): Query<ListFilesQuery>,
) -> Json<ApiResponse<ListFilesResponse>> {
    tracing::debug!("获取文件列表: {:?}, 用户: {}", query, claims.0.username);
    
    // 简化权限检查：任何已登录用户都可以读取（开发阶段）
    tracing::debug!("用户 {} 已通过身份验证，允许读取文件列表", claims.0.username);
    
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    
    match state.storage_mode {
        StorageMode::Database => {
            if let Some(repo) = &state.file_repo {
                let files = repo.list(query.folder_id, page_size as i64, ((page - 1) * page_size) as i64).await.unwrap_or_default();
                let total = repo.count(query.folder_id).await.unwrap_or(0);
                
                return Json(ApiResponse::success(
                    ListFilesResponse {
                        files,
                        total: total as u64,
                        page,
                        page_size,
                    },
                    "获取文件列表成功",
                ));
            }
        }
        StorageMode::Memory => {
            let files = state.memory_files.lock().unwrap();
            let filtered: Vec<models::FileMetadata> = if query.folder_id.is_none() {
                // 如果没有指定文件夹，返回所有文件
                files.iter().map(|f| f.metadata.clone()).collect()
            } else {
                // 否则只返回指定文件夹下的文件
                files.iter()
                    .filter(|f| f.metadata.folder_id == query.folder_id)
                    .map(|f| f.metadata.clone())
                    .collect()
            };
            
            let total = filtered.len() as u64;
            let start = (page - 1) * page_size;
            let end = std::cmp::min(start + page_size, filtered.len() as u32);
            
            let paged_files = if start < filtered.len() as u32 {
                filtered[start as usize..end as usize].to_vec()
            } else {
                vec![]
            };
            
            return Json(ApiResponse::success(
                ListFilesResponse {
                    files: paged_files,
                    total,
                    page,
                    page_size,
                },
                "获取文件列表成功",
            ));
        }
    }
    
    Json(ApiResponse::error(500, "存储模式错误"))
}

#[utoipa::path(
    post,
    path = "/api/v1/files",
    tag = "files",
    request_body(content = String, description = "Multipart form with file and optional folder_id", content_type = "multipart/form-data"),
    responses(
        (status = 200, description = "File uploaded successfully", body = ApiResponse<FileMetadata>),
        (status = 400, description = "Invalid request"),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn upload_file(
    State(state): State<AppState>,
    claims: OptionalClaims,
    mut stream: axum::extract::Multipart,
) -> Json<ApiResponse<FileMetadata>> {
    tracing::debug!("上传文件... 用户: {}", claims.0.username);
    
    // 简化权限检查：任何已登录用户都可以上传（开发阶段）
    tracing::debug!("用户 {} 已通过身份验证，允许上传文件", claims.0.username);
    
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

    let now = Utc::now();
    let id = Uuid::new_v4();
    let uploader = claims.0.username.clone();
    
    match state.storage_mode {
        StorageMode::Database => {
            if let (Some(repo), Some(storage)) = (&state.file_repo, &state.storage_service) {
                match storage.save_file(&id, &file_content).await {
                    Ok(storage_path) => {
                        let file = models::FileMetadata {
                            id,
                            name: file_name.clone(),
                            folder_id,
                            size: file_size,
                            content_type,
                            storage_path,
                            created_at: now,
                            updated_at: now,
                            created_by: uploader.clone(),
                        };
                        
                        match repo.create(file.clone()).await {
                            Ok(saved_file) => {
                                let _ = save_file_version(&state, id, 1, file_content.clone(), uploader).await;
                                return Json(ApiResponse::success(saved_file, "文件上传成功"));
                            }
                            Err(e) => {
                                tracing::error!("保存文件到数据库失败: {:?}", e);
                                let _ = storage.delete_file(&id).await;
                                return Json(ApiResponse::error(500, "保存文件失败"));
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!("保存文件到存储失败: {:?}", e);
                        return Json(ApiResponse::error(500, "保存文件失败"));
                    }
                }
            }
        }
        StorageMode::Memory => {
            let file = models::FileMetadata {
                id,
                name: file_name.clone(),
                folder_id,
                size: file_size,
                content_type,
                storage_path: format!("memory://{}", id),
                created_at: now,
                updated_at: now,
                created_by: claims.0.username.clone(),
            };
            let stored_file = MemoryStoredFile {
                metadata: file.clone(),
                content: file_content.clone(),
            };
            state.memory_files.lock().unwrap().push(stored_file);
            
            // 保存版本
            let _ = save_file_version(&state, id, 1, file_content, claims.0.username.clone()).await;
            
            return Json(ApiResponse::success(file, "文件上传成功"));
        }
    }
    
    Json(ApiResponse::error(500, "存储服务未初始化"))
}

#[utoipa::path(
    get,
    path = "/api/v1/files/{id}",
    tag = "files",
    params(
        ("id" = Uuid, Path, description = "File UUID")
    ),
    responses(
        (status = 200, description = "File retrieved successfully", body = ApiResponse<FileMetadata>),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "File not found")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn get_file(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<FileMetadata>> {
    tracing::debug!("获取文件: {}, 用户: {}", id, claims.0.username);
    
    if let Some(user_id) = claims.0.get_user_id() {
        if let Some(service) = &state.permission_service {
            if !claims.0.is_admin() {
                match service.check_file_permission(
                    id,
                    user_id,
                    &[],
                    &Permission::Read,
                ).await {
                    Ok(true) => {
                        tracing::debug!("用户 {} 有文件 {} 的读取权限", claims.0.username, id);
                    }
                    Ok(false) => {
                        tracing::warn!("用户 {} 没有文件 {} 的读取权限", claims.0.username, id);
                        return Json(ApiResponse::error(403, "权限不足"));
                    }
                    Err(e) => {
                        tracing::error!("检查文件权限失败: {}", e);
                    }
                }
            }
        }
    }
    
    tracing::debug!("用户 {} 已通过身份验证，允许获取文件", claims.0.username);
    
    if let Some(file) = get_file_by_id(&state, id).await {
        Json(ApiResponse::success(file, "获取文件成功"))
    } else {
        Json(ApiResponse::error(404, "文件不存在"))
    }
}

async fn download_file(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    tracing::debug!("下载文件: {}", id);
    
    if let (Some(metadata), Some(content)) = (get_file_by_id(&state, id).await, get_file_content(&state, id).await) {
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            header::CONTENT_TYPE,
            metadata.content_type.clone().parse().unwrap(),
        );
        headers.insert(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", metadata.name).parse().unwrap(),
        );
        return (StatusCode::OK, headers, content);
    }
    
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, "text/plain".parse().unwrap());
    (StatusCode::NOT_FOUND, headers, b"File not found".to_vec())
}

async fn preview_file(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    tracing::info!("📄 预览文件请求: {}", id);
    
    if let (Some(metadata), Some(content)) = (get_file_by_id(&state, id).await, get_file_content(&state, id).await) {
        tracing::info!("📄 文件信息: name={}, content-type={}, size={} bytes", 
            metadata.name, metadata.content_type, content.len());
        
        // 检查是否需要转换为 PDF
        if state.conversion_service.can_convert(&metadata.name) {
            tracing::info!("🔄 尝试转换 {} 为 PDF 预览", metadata.name);
            if state.conversion_service.is_available() {
                tracing::info!("✅ LibreOffice 可用，开始转换");
                match state.conversion_service.convert_to_pdf(&content, &metadata.name).await {
                    Ok(pdf_content) => {
                        tracing::info!("✅ PDF转换成功，大小: {} bytes", pdf_content.len());
                        let mut headers = axum::http::HeaderMap::new();
                        headers.insert(header::CONTENT_TYPE, "application/pdf".parse().unwrap());
                        let pdf_name = format!("{}.pdf", std::path::Path::new(&metadata.name).file_stem().and_then(|s| s.to_str()).unwrap_or("document"));
                        headers.insert(
                            header::CONTENT_DISPOSITION,
                            format!("inline; filename=\"{}\"", pdf_name).parse().unwrap(),
                        );
                        return (StatusCode::OK, headers, pdf_content);
                    }
                    Err(e) => {
                        tracing::error!("❌ PDF转换失败: {}, 降级到原始文件", e);
                    }
                }
            } else {
                tracing::warn!("⚠️ LibreOffice 不可用，无法转换，返回原始文件");
            }
        }
        
        // 如果不需要转换或转换失败，返回原始文件
        tracing::info!("📄 返回原始文件: {}", metadata.name);
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            header::CONTENT_TYPE,
            metadata.content_type.clone().parse().unwrap(),
        );
        headers.insert(
            header::CONTENT_DISPOSITION,
            format!("inline; filename=\"{}\"", metadata.name).parse().unwrap(),
        );
        return (StatusCode::OK, headers, content);
    }
    
    tracing::error!("❌ 文件未找到: {}", id);
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, "text/plain".parse().unwrap());
    (StatusCode::NOT_FOUND, headers, b"File not found".to_vec())
}

#[utoipa::path(
    delete,
    path = "/api/v1/files/{id}",
    tag = "files",
    params(
        ("id" = Uuid, Path, description = "File UUID")
    ),
    responses(
        (status = 200, description = "File deleted successfully", body = ApiResponse<()>),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "File not found")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn delete_file(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("删除文件: {}, 用户: {}", id, claims.0.username);
    
    if let Some(user_id) = claims.0.get_user_id() {
        if let Some(service) = &state.permission_service {
            if !claims.0.is_admin() {
                match service.check_file_permission(
                    id,
                    user_id,
                    &[],
                    &Permission::Delete,
                ).await {
                    Ok(true) => {
                        tracing::debug!("用户 {} 有文件 {} 的删除权限", claims.0.username, id);
                    }
                    Ok(false) => {
                        tracing::warn!("用户 {} 没有文件 {} 的删除权限", claims.0.username, id);
                        return Json(ApiResponse::error(403, "权限不足"));
                    }
                    Err(e) => {
                        tracing::error!("检查文件权限失败: {}", e);
                    }
                }
            }
        }
    }
    
    tracing::debug!("用户 {} 已通过身份验证，允许删除文件", claims.0.username);
    
    match state.storage_mode {
        StorageMode::Database => {
            if let (Some(repo), Some(storage)) = (&state.file_repo, &state.storage_service) {
                if let Ok(true) = repo.delete(id).await {
                    let _ = storage.delete_file(&id).await;
                    return Json(ApiResponse::ok("文件删除成功"));
                }
            }
        }
        StorageMode::Memory => {
            let mut files = state.memory_files.lock().unwrap();
            if let Some(pos) = files.iter().position(|f| f.metadata.id == id) {
                files.remove(pos);
                return Json(ApiResponse::ok("文件删除成功"));
            }
        }
    }
    
    Json(ApiResponse::error(404, "文件不存在"))
}

async fn extract_text(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    tracing::debug!("提取文本: {}, 用户: {}", id, claims.0.username);
    
    if let Some(user_id) = claims.0.get_user_id() {
        if let Some(service) = &state.permission_service {
            if !claims.0.is_admin() {
                match service.check_file_permission(
                    id,
                    user_id,
                    &[],
                    &Permission::Read,
                ).await {
                    Ok(true) => {
                        tracing::debug!("用户 {} 有文件 {} 的读取权限", claims.0.username, id);
                    }
                    Ok(false) => {
                        tracing::warn!("用户 {} 没有文件 {} 的读取权限", claims.0.username, id);
                        return Json(ApiResponse::error(403, "权限不足"));
                    }
                    Err(e) => {
                        tracing::error!("检查文件权限失败: {}", e);
                    }
                }
            }
        }
    }
    
    tracing::debug!("用户 {} 已通过身份验证，允许提取文本", claims.0.username);
    
    if let Some(content) = get_file_content(&state, id).await {
        if let Ok(text) = String::from_utf8(content) {
            return Json(ApiResponse::success(text, "提取文本成功"));
        }
        return Json(ApiResponse::error(400, "无法提取文本：文件不是UTF-8编码"));
    }
    
    Json(ApiResponse::error(404, "文件不存在"))
}

// === Folder Management Functions ===

async fn get_folder_by_id(state: &AppState, id: Uuid) -> Option<models::Folder> {
    match state.storage_mode {
        StorageMode::Database => {
            if let Some(repo) = &state.folder_repo {
                if let Ok(Some(folder)) = repo.find_by_id(id).await {
                    return Some(folder);
                }
            }
            None
        }
        StorageMode::Memory => {
            let folders = state.memory_folders.lock().unwrap();
            folders.iter().find(|f| f.metadata.id == id).map(|f| f.metadata.clone())
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/folders",
    tag = "folders",
    params(ListFoldersQuery),
    responses(
        (status = 200, description = "List folders successfully", body = ApiResponse<ListFoldersResponse>),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn list_folders(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Query(query): Query<ListFoldersQuery>,
) -> Json<ApiResponse<ListFoldersResponse>> {
    tracing::debug!("获取文件夹列表: {:?}, 用户: {}", query, claims.0.username);
    
    // 简化权限检查：任何已登录用户都可以读取文件夹（开发阶段）
    tracing::debug!("用户 {} 已通过身份验证，允许读取文件夹列表", claims.0.username);
    
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    
    match state.storage_mode {
        StorageMode::Database => {
            if let Some(repo) = &state.folder_repo {
                let folders = repo.list(query.parent_id).await.unwrap_or_default();
                let total = folders.len() as u64;
                
                // 简单分页
                let start = (page - 1) * page_size;
                let end = std::cmp::min(start + page_size, folders.len() as u32);
                let paged_folders = if start < folders.len() as u32 {
                    folders[start as usize..end as usize].to_vec()
                } else {
                    vec![]
                };
                
                return Json(ApiResponse::success(
                    ListFoldersResponse {
                        folders: paged_folders,
                        total,
                        page,
                        page_size,
                    },
                    "获取文件夹列表成功",
                ));
            }
        }
        StorageMode::Memory => {
            let folders = state.memory_folders.lock().unwrap();
            let filtered: Vec<models::Folder> = if query.parent_id.is_none() {
                // 如果没有指定父文件夹，返回所有文件夹（用于侧边栏显示）
                folders.iter().map(|f| f.metadata.clone()).collect()
            } else {
                // 否则只返回指定父文件夹下的子文件夹
                folders.iter()
                    .filter(|f| f.metadata.parent_id == query.parent_id)
                    .map(|f| f.metadata.clone())
                    .collect()
            };
            
            let total = filtered.len() as u64;
            let start = (page - 1) * page_size;
            let end = std::cmp::min(start + page_size, filtered.len() as u32);
            
            let paged_folders = if start < filtered.len() as u32 {
                filtered[start as usize..end as usize].to_vec()
            } else {
                vec![]
            };
            
            return Json(ApiResponse::success(
                ListFoldersResponse {
                    folders: paged_folders,
                    total,
                    page,
                    page_size,
                },
                "获取文件夹列表成功",
            ));
        }
    }
    
    Json(ApiResponse::error(500, "存储模式错误"))
}

#[utoipa::path(
    post,
    path = "/api/v1/folders",
    tag = "folders",
    request_body(content = CreateFolderRequest, description = "Folder creation data", content_type = "application/json"),
    responses(
        (status = 200, description = "Folder created successfully", body = ApiResponse<models::Folder>),
        (status = 400, description = "Invalid request"),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn create_folder(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Json(req): Json<CreateFolderRequest>,
) -> Json<ApiResponse<models::Folder>> {
    tracing::debug!("创建文件夹: {:?}, 用户: {}", req, claims.0.username);
    
    // 简化权限检查：任何已登录用户都可以创建文件夹（开发阶段）
    tracing::debug!("用户 {} 已通过身份验证，允许创建文件夹", claims.0.username);
    
    let now = Utc::now();
    let id = Uuid::new_v4();
    let folder = models::Folder {
        id,
        name: req.name,
        parent_id: req.parent_id,
        created_at: now,
        updated_at: now,
        created_by: claims.0.username.clone(),
    };
    
    match state.storage_mode {
        StorageMode::Database => {
            if let Some(repo) = &state.folder_repo {
                match repo.create(folder.clone()).await {
                    Ok(saved_folder) => {
                        return Json(ApiResponse::success(saved_folder, "文件夹创建成功"));
                    }
                    Err(_) => {
                        return Json(ApiResponse::error(500, "创建文件夹失败"));
                    }
                }
            }
        }
        StorageMode::Memory => {
            let stored_folder = MemoryStoredFolder {
                metadata: folder.clone(),
            };
            state.memory_folders.lock().unwrap().push(stored_folder);
            return Json(ApiResponse::success(folder, "文件夹创建成功"));
        }
    }
    
    Json(ApiResponse::error(500, "存储服务未初始化"))
}

#[utoipa::path(
    get,
    path = "/api/v1/folders/{id}",
    tag = "folders",
    params(
        ("id" = Uuid, Path, description = "Folder UUID")
    ),
    responses(
        (status = 200, description = "Folder retrieved successfully", body = ApiResponse<models::Folder>),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Folder not found")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn get_folder(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<models::Folder>> {
    tracing::debug!("获取文件夹: {}, 用户: {}", id, claims.0.username);
    
    if let Some(user_id) = claims.0.get_user_id() {
        if let Some(service) = &state.permission_service {
            if !claims.0.is_admin() {
                match service.check_folder_permission(
                    id,
                    user_id,
                    &[],
                    &Permission::Read,
                ).await {
                    Ok(true) => {
                        tracing::debug!("用户 {} 有文件夹 {} 的读取权限", claims.0.username, id);
                    }
                    Ok(false) => {
                        tracing::warn!("用户 {} 没有文件夹 {} 的读取权限", claims.0.username, id);
                        return Json(ApiResponse::error(403, "权限不足"));
                    }
                    Err(e) => {
                        tracing::error!("检查文件夹权限失败: {}", e);
                    }
                }
            }
        }
    }
    
    tracing::debug!("用户 {} 已通过身份验证，允许获取文件夹", claims.0.username);
    
    if let Some(folder) = get_folder_by_id(&state, id).await {
        Json(ApiResponse::success(folder, "获取文件夹成功"))
    } else {
        Json(ApiResponse::error(404, "文件夹不存在"))
    }
}

#[utoipa::path(
    put,
    path = "/api/v1/folders/{id}",
    tag = "folders",
    params(
        ("id" = Uuid, Path, description = "Folder UUID")
    ),
    request_body(content = UpdateFolderRequest, description = "Folder update data", content_type = "application/json"),
    responses(
        (status = 200, description = "Folder updated successfully", body = ApiResponse<models::Folder>),
        (status = 400, description = "Invalid request"),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Folder not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn update_folder(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateFolderRequest>,
) -> Json<ApiResponse<models::Folder>> {
    tracing::debug!("更新文件夹: {}, 请求: {:?}, 用户: {}", id, req, claims.0.username);
    
    if let Some(user_id) = claims.0.get_user_id() {
        if let Some(service) = &state.permission_service {
            if !claims.0.is_admin() {
                match service.check_folder_permission(
                    id,
                    user_id,
                    &[],
                    &Permission::Write,
                ).await {
                    Ok(true) => {
                        tracing::debug!("用户 {} 有文件夹 {} 的写入权限", claims.0.username, id);
                    }
                    Ok(false) => {
                        tracing::warn!("用户 {} 没有文件夹 {} 的写入权限", claims.0.username, id);
                        return Json(ApiResponse::error(403, "权限不足"));
                    }
                    Err(e) => {
                        tracing::error!("检查文件夹权限失败: {}", e);
                    }
                }
            }
        }
    }
    
    tracing::debug!("用户 {} 已通过身份验证，允许更新文件夹", claims.0.username);
    
    match state.storage_mode {
        StorageMode::Database => {
            if let Some(repo) = &state.folder_repo {
                match repo.update(id, &req.name, req.parent_id).await {
                    Ok(Some(folder)) => {
                        return Json(ApiResponse::success(folder, "文件夹更新成功"));
                    }
                    Ok(None) => {
                        return Json(ApiResponse::error(404, "文件夹不存在"));
                    }
                    Err(e) => {
                        tracing::error!("更新文件夹失败: {}", e);
                        return Json(ApiResponse::error(500, "更新文件夹失败"));
                    }
                }
            }
        }
        StorageMode::Memory => {
            let mut folders = state.memory_folders.lock().unwrap();
            if let Some(pos) = folders.iter().position(|f| f.metadata.id == id) {
                let now = Utc::now();
                folders[pos].metadata.name = req.name;
                folders[pos].metadata.parent_id = req.parent_id;
                folders[pos].metadata.updated_at = now;
                return Json(ApiResponse::success(folders[pos].metadata.clone(), "文件夹更新成功"));
            }
        }
    }
    
    Json(ApiResponse::error(404, "文件夹不存在"))
}

#[utoipa::path(
    delete,
    path = "/api/v1/folders/{id}",
    tag = "folders",
    params(
        ("id" = Uuid, Path, description = "Folder UUID")
    ),
    responses(
        (status = 200, description = "Folder deleted successfully", body = ApiResponse<()>),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Folder not found")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn delete_folder(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("删除文件夹: {}, 用户: {}", id, claims.0.username);
    
    if !claims.0.is_admin() {
        if let Some(user_id) = claims.0.get_user_id() {
            if let Some(service) = &state.permission_service {
                match service.check_folder_permission(
                    id,
                    user_id,
                    &[],
                    &Permission::Delete,
                ).await {
                    Ok(true) => {
                        tracing::debug!("用户 {} 有文件夹 {} 的删除权限", claims.0.username, id);
                    }
                    Ok(false) => {
                        tracing::warn!("用户 {} 没有文件夹 {} 的删除权限", claims.0.username, id);
                        return Json(ApiResponse::error(403, "权限不足"));
                    }
                    Err(e) => {
                        tracing::error!("检查文件夹权限失败: {}", e);
                    }
                }
            }
        }
    }
    
    tracing::debug!("用户 {} 已通过权限检查，允许删除文件夹", claims.0.username);
    
    match state.storage_mode {
        StorageMode::Database => {
            if let Some(repo) = &state.folder_repo {
                if let Ok(true) = repo.delete(id).await {
                    return Json(ApiResponse::ok("文件夹删除成功"));
                }
            }
        }
        StorageMode::Memory => {
            let mut folders = state.memory_folders.lock().unwrap();
            if let Some(pos) = folders.iter().position(|f| f.metadata.id == id) {
                folders.remove(pos);
                return Json(ApiResponse::ok("文件夹删除成功"));
            }
        }
    }
    
    Json(ApiResponse::error(404, "文件夹不存在"))
}

// === File Version Management Functions ===

async fn get_next_file_version(state: &AppState, file_id: Uuid) -> i32 {
    match state.storage_mode {
        StorageMode::Database => {
            if let Some(repo) = &state.file_version_repo {
                match repo.get_latest_version(file_id).await {
                    Ok(Some(version)) => version.version + 1,
                    Ok(None) => 1,
                    Err(e) => {
                        tracing::error!("获取文件版本失败: {}", e);
                        1
                    }
                }
            } else {
                1
            }
        }
        StorageMode::Memory => {
            let versions = state.memory_file_versions.lock().unwrap();
            let max_version = versions
                .iter()
                .filter(|v| v.version.file_id == file_id)
                .map(|v| v.version.version)
                .max()
                .unwrap_or(0);
            max_version + 1
        }
    }
}

async fn save_file_version(
    state: &AppState,
    file_id: Uuid,
    version: i32,
    content: Vec<u8>,
    created_by: String,
) -> models::FileVersion {
    let now = Utc::now();
    let version_id = Uuid::new_v4();
    
    let checksum = format!("{:x}", md5::compute(&content));
    let storage_path = format!("db://version/{}", version_id);
    
    let file_version = models::FileVersion {
        id: version_id,
        file_id,
        version,
        size: content.len() as i64,
        checksum,
        storage_path: storage_path.clone(),
        created_at: now,
        created_by,
    };
    
    match state.storage_mode {
        StorageMode::Database => {
            if let Some(repo) = &state.file_version_repo {
                if let Err(e) = repo.create(file_version.clone()).await {
                    tracing::error!("保存文件版本到数据库失败: {}", e);
                }
            }
            // 在数据库模式下，内容存储在存储服务中
            if let Some(storage_service) = &state.storage_service {
                let _ = storage_service.save_file(&version_id, &content).await;
            }
        }
        StorageMode::Memory => {
            let stored_version = MemoryStoredFileVersion {
                version: file_version.clone(),
                content,
            };
            state.memory_file_versions.lock().unwrap().push(stored_version);
        }
    }
    
    file_version
}

#[utoipa::path(
    get,
    path = "/api/v1/files/{file_id}/versions",
    tag = "files",
    params(
        ("file_id" = Uuid, Path, description = "File UUID"),
        ListFileVersionsQuery
    ),
    responses(
        (status = 200, description = "List file versions successfully", body = ApiResponse<ListFileVersionsResponse>),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn list_file_versions(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path(file_id): Path<Uuid>,
    Query(query): Query<ListFileVersionsQuery>,
) -> Json<ApiResponse<ListFileVersionsResponse>> {
    tracing::debug!("获取文件 {} 的版本列表，用户: {}", file_id, claims.0.username);
    
    if let Some(user_id) = claims.0.get_user_id() {
        if let Some(service) = &state.permission_service {
            if !claims.0.is_admin() {
                match service.check_file_permission(
                    file_id,
                    user_id,
                    &[],
                    &Permission::Read,
                ).await {
                    Ok(true) => {
                        tracing::debug!("用户 {} 有文件 {} 的读取权限", claims.0.username, file_id);
                    }
                    Ok(false) => {
                        tracing::warn!("用户 {} 没有文件 {} 的读取权限", claims.0.username, file_id);
                        return Json(ApiResponse::error(403, "权限不足"));
                    }
                    Err(e) => {
                        tracing::error!("检查文件权限失败: {}", e);
                    }
                }
            }
        }
    }
    
    tracing::debug!("用户 {} 已通过身份验证，允许查看文件版本", claims.0.username);
    
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    
    let versions: Vec<models::FileVersion> = match state.storage_mode {
        StorageMode::Database => {
            if let Some(repo) = &state.file_version_repo {
                match repo.list_by_file_id(file_id).await {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::error!("获取文件版本列表失败: {}", e);
                        vec![]
                    }
                }
            } else {
                vec![]
            }
        }
        StorageMode::Memory => {
            let all_versions = state.memory_file_versions.lock().unwrap();
            all_versions
                .iter()
                .filter(|v| v.version.file_id == file_id)
                .map(|v| v.version.clone())
                .collect()
        }
    };
    
    let total = versions.len() as u64;
    let start = (page - 1) * page_size;
    let end = std::cmp::min(start + page_size, versions.len() as u32);
    
    let paged_versions = if start < versions.len() as u32 {
        versions[start as usize..end as usize].to_vec()
    } else {
        vec![]
    };
    
    Json(ApiResponse::success(
        ListFileVersionsResponse {
            versions: paged_versions,
            total,
            page,
            page_size,
        },
        "获取文件版本列表成功",
    ))
}

#[utoipa::path(
    get,
    path = "/api/v1/files/{file_id}/versions/{version_id}",
    tag = "files",
    params(
        ("file_id" = Uuid, Path, description = "File UUID"),
        ("version_id" = Uuid, Path, description = "Version UUID")
    ),
    responses(
        (status = 200, description = "Get file version successfully", body = ApiResponse<models::FileVersion>),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Version not found")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn get_file_version(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path((file_id, version_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<models::FileVersion>> {
    tracing::debug!("获取文件 {} 的版本 {}，用户: {}", file_id, version_id, claims.0.username);
    
    if let Some(user_id) = claims.0.get_user_id() {
        if let Some(service) = &state.permission_service {
            if !claims.0.is_admin() {
                match service.check_file_permission(
                    file_id,
                    user_id,
                    &[],
                    &Permission::Read,
                ).await {
                    Ok(true) => {
                        tracing::debug!("用户 {} 有文件 {} 的读取权限", claims.0.username, file_id);
                    }
                    Ok(false) => {
                        tracing::warn!("用户 {} 没有文件 {} 的读取权限", claims.0.username, file_id);
                        return Json(ApiResponse::error(403, "权限不足"));
                    }
                    Err(e) => {
                        tracing::error!("检查文件权限失败: {}", e);
                    }
                }
            }
        }
    }
    
    tracing::debug!("用户 {} 已通过身份验证，允许获取文件版本", claims.0.username);
    
    let version: Option<models::FileVersion> = match state.storage_mode {
        StorageMode::Database => {
            if let Some(repo) = &state.file_version_repo {
                match repo.find_by_id(version_id).await {
                    Ok(Some(v)) if v.file_id == file_id => Some(v),
                    Ok(_) => None,
                    Err(e) => {
                        tracing::error!("获取文件版本失败: {}", e);
                        None
                    }
                }
            } else {
                None
            }
        }
        StorageMode::Memory => {
            state
                .memory_file_versions
                .lock()
                .unwrap()
                .iter()
                .find(|v| v.version.id == version_id && v.version.file_id == file_id)
                .map(|v| v.version.clone())
        }
    };
    
    if let Some(v) = version {
        Json(ApiResponse::success(v, "获取文件版本成功"))
    } else {
        Json(ApiResponse::error(404, "文件版本不存在"))
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/files/{file_id}/versions/{version_id}/download",
    tag = "files",
    params(
        ("file_id" = Uuid, Path, description = "File UUID"),
        ("version_id" = Uuid, Path, description = "Version UUID")
    ),
    responses(
        (status = 200, description = "Download file version content"),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Version not found")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn download_file_version(
    State(state): State<AppState>,
    Path((file_id, version_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
    tracing::debug!("下载文件 {} 的版本 {}", file_id, version_id);
    
    let content: Option<Vec<u8>> = match state.storage_mode {
        StorageMode::Database => {
            if let Some(storage_service) = &state.storage_service {
                match storage_service.load_file(&version_id).await {
                    Ok(c) => Some(c),
                    Err(e) => {
                        tracing::error!("从存储服务加载版本内容失败: {}", e);
                        None
                    }
                }
            } else {
                None
            }
        }
        StorageMode::Memory => {
            state
                .memory_file_versions
                .lock()
                .unwrap()
                .iter()
                .find(|v| v.version.id == version_id && v.version.file_id == file_id)
                .map(|v| v.content.clone())
        }
    };
    
    if let Some(c) = content {
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, "application/octet-stream".parse().unwrap());
        return (StatusCode::OK, headers, c);
    }
    
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, "text/plain".parse().unwrap());
    (StatusCode::NOT_FOUND, headers, b"Version not found".to_vec())
}

#[utoipa::path(
    post,
    path = "/api/v1/files/restore-version",
    tag = "files",
    request_body(content = RestoreFileVersionRequest, description = "Restore file version request", content_type = "application/json"),
    responses(
        (status = 200, description = "File version restored successfully", body = ApiResponse<FileMetadata>),
        (status = 403, description = "Permission denied"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Version not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn restore_file_version(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Json(req): Json<RestoreFileVersionRequest>,
) -> Json<ApiResponse<FileMetadata>> {
    tracing::debug!(
        "恢复文件 {} 到版本 {}，用户: {}",
        req.file_id,
        req.version_id,
        claims.0.username
    );
    
    // 权限检查：验证用户是否拥有 doc_write 权限
    if !claims.0.has_permission("doc_write") {
        tracing::warn!("用户 {} 缺少 doc_write 权限，拒绝恢复文件版本", claims.0.username);
        return Json(ApiResponse::error(403, "权限不足：缺少修改文档的权限"));
    }
    
    let content_version: Option<Vec<u8>> = match state.storage_mode {
        StorageMode::Database => {
            if let Some(storage_service) = &state.storage_service {
                match storage_service.load_file(&req.version_id).await {
                    Ok(c) => Some(c),
                    Err(e) => {
                        tracing::error!("从存储服务加载版本内容失败: {}", e);
                        None
                    }
                }
            } else {
                None
            }
        }
        StorageMode::Memory => {
            state
                .memory_file_versions
                .lock()
                .unwrap()
                .iter()
                .find(|v| v.version.id == req.version_id && v.version.file_id == req.file_id)
                .map(|v| v.content.clone())
        }
    };
    
    if content_version.is_none() {
        return Json(ApiResponse::error(404, "文件版本不存在"));
    }
    let content = content_version.unwrap();
    
    // 更新当前文件
    match state.storage_mode {
        StorageMode::Database => {
            if let Some(repo) = &state.file_repo {
                match repo.find_by_id(req.file_id).await {
                    Ok(Some(mut file)) => {
                        file.updated_at = Utc::now();
                        // 更新文件内容到存储服务
                        if let Some(storage_service) = &state.storage_service {
                            if let Err(e) = storage_service.save_file(&req.file_id, &content).await {
                                tracing::error!("保存文件内容失败: {}", e);
                                return Json(ApiResponse::error(500, "保存文件内容失败"));
                            }
                        }
                        // 保存新版本
                        let next_version = get_next_file_version(&state, req.file_id).await;
                        let _ = save_file_version(&state, req.file_id, next_version, content.clone(), claims.0.username.clone()).await;
                        return Json(ApiResponse::success(file, "文件版本恢复成功"));
                    }
                    Ok(None) => return Json(ApiResponse::error(404, "文件不存在")),
                    Err(e) => {
                        tracing::error!("查找文件失败: {}", e);
                        return Json(ApiResponse::error(500, "查找文件失败"));
                    }
                }
            } else {
                return Json(ApiResponse::error(500, "数据库连接未初始化"));
            }
        }
        StorageMode::Memory => {
            let mut files = state.memory_files.lock().unwrap();
            if let Some(pos) = files.iter().position(|f| f.metadata.id == req.file_id) {
                let now = Utc::now();
                files[pos].metadata.updated_at = now;
                files[pos].content = content.clone();
                
                // 保存新版本（恢复操作也创建一个新版本）
                let next_version = get_next_file_version(&state, req.file_id).await;
                let _ = save_file_version(&state, req.file_id, next_version, content, claims.0.username.clone()).await;
                
                return Json(ApiResponse::success(files[pos].metadata.clone(), "文件版本恢复成功"));
            }
        }
    }
    
    Json(ApiResponse::error(404, "文件不存在"))
}

// Update upload_file to also save version
async fn upload_file_with_versioning(
    state: &AppState,
    file_id: Uuid,
    file_content: Vec<u8>,
    created_by: String,
) -> models::FileVersion {
    let next_version = get_next_file_version(state, file_id).await;
    save_file_version(state, file_id, next_version, file_content, created_by).await
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SetFilePermissionRequest {
    pub user_id: Option<Uuid>,
    pub role_id: Option<Uuid>,
    pub permission: Permission,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SetFolderPermissionRequest {
    pub user_id: Option<Uuid>,
    pub role_id: Option<Uuid>,
    pub permission: Permission,
    pub inherit: bool,
}

async fn set_file_permission(
    State(state): State<AppState>,
    Path(file_id): Path<Uuid>,
    claims: OptionalClaims,
    Json(req): Json<SetFilePermissionRequest>,
) -> Json<ApiResponse<models::FilePermission>> {
    if !claims.0.is_admin() {
        return Json(ApiResponse::error(403, "权限不足：需要管理员权限"));
    }

    if req.user_id.is_none() && req.role_id.is_none() {
        return Json(ApiResponse::error(400, "必须指定用户ID或角色ID"));
    }

    if let Some(service) = &state.permission_service {
        match service.set_file_permission(
            file_id,
            req.user_id,
            req.role_id,
            req.permission,
        ).await {
            Ok(perm) => Json(ApiResponse::success(perm, "文件权限设置成功")),
            Err(e) => {
                tracing::error!("设置文件权限失败: {}", e);
                Json(ApiResponse::error(500, "设置文件权限失败"))
            }
        }
    } else {
        Json(ApiResponse::error(500, "权限服务不可用"))
    }
}

async fn get_file_permissions(
    State(state): State<AppState>,
    Path(file_id): Path<Uuid>,
    claims: OptionalClaims,
) -> Json<ApiResponse<Vec<models::FilePermission>>> {
    let user_id = claims.0.get_user_id();
    
    if !claims.0.is_admin() {
        if let Some(uid) = user_id {
            if let Some(service) = &state.permission_service {
                if let Ok(has_access) = service.check_file_permission(
                    file_id,
                    uid,
                    &[],
                    &Permission::Read,
                ).await {
                    if !has_access {
                        return Json(ApiResponse::error(403, "权限不足"));
                    }
                }
            }
        }
    }

    if let Some(service) = &state.permission_service {
        match service.get_file_permissions(file_id).await {
            Ok(perms) => Json(ApiResponse::success(perms, "获取文件权限成功")),
            Err(e) => {
                tracing::error!("获取文件权限失败: {}", e);
                Json(ApiResponse::error(500, "获取文件权限失败"))
            }
        }
    } else {
        Json(ApiResponse::error(500, "权限服务不可用"))
    }
}

async fn delete_file_permission(
    State(state): State<AppState>,
    Path((file_id, permission_id)): Path<(Uuid, Uuid)>,
    claims: OptionalClaims,
) -> Json<ApiResponse<()>> {
    if !claims.0.is_admin() {
        return Json(ApiResponse::error(403, "权限不足：需要管理员权限"));
    }

    if let Some(service) = &state.permission_service {
        match service.remove_file_permission(permission_id).await {
            Ok(success) => {
                if success {
                    Json(ApiResponse::ok("文件权限删除成功"))
                } else {
                    Json(ApiResponse::error(404, "权限不存在"))
                }
            }
            Err(e) => {
                tracing::error!("删除文件权限失败: {}", e);
                Json(ApiResponse::error(500, "删除文件权限失败"))
            }
        }
    } else {
        Json(ApiResponse::error(500, "权限服务不可用"))
    }
}

async fn set_folder_permission(
    State(state): State<AppState>,
    Path(folder_id): Path<Uuid>,
    claims: OptionalClaims,
    Json(req): Json<SetFolderPermissionRequest>,
) -> Json<ApiResponse<models::FolderPermission>> {
    if !claims.0.is_admin() {
        return Json(ApiResponse::error(403, "权限不足：需要管理员权限"));
    }

    if req.user_id.is_none() && req.role_id.is_none() {
        return Json(ApiResponse::error(400, "必须指定用户ID或角色ID"));
    }

    if let Some(service) = &state.permission_service {
        match service.set_folder_permission(
            folder_id,
            req.user_id,
            req.role_id,
            req.permission,
            req.inherit,
        ).await {
            Ok(perm) => Json(ApiResponse::success(perm, "文件夹权限设置成功")),
            Err(e) => {
                tracing::error!("设置文件夹权限失败: {}", e);
                Json(ApiResponse::error(500, "设置文件夹权限失败"))
            }
        }
    } else {
        Json(ApiResponse::error(500, "权限服务不可用"))
    }
}

async fn get_folder_permissions(
    State(state): State<AppState>,
    Path(folder_id): Path<Uuid>,
    claims: OptionalClaims,
) -> Json<ApiResponse<Vec<models::FolderPermission>>> {
    let user_id = claims.0.get_user_id();
    
    if !claims.0.is_admin() {
        if let Some(uid) = user_id {
            if let Some(service) = &state.permission_service {
                if let Ok(has_access) = service.check_folder_permission(
                    folder_id,
                    uid,
                    &[],
                    &Permission::Read,
                ).await {
                    if !has_access {
                        return Json(ApiResponse::error(403, "权限不足"));
                    }
                }
            }
        }
    }

    if let Some(service) = &state.permission_service {
        match service.get_folder_permissions(folder_id).await {
            Ok(perms) => Json(ApiResponse::success(perms, "获取文件夹权限成功")),
            Err(e) => {
                tracing::error!("获取文件夹权限失败: {}", e);
                Json(ApiResponse::error(500, "获取文件夹权限失败"))
            }
        }
    } else {
        Json(ApiResponse::error(500, "权限服务不可用"))
    }
}

async fn delete_folder_permission(
    State(state): State<AppState>,
    Path((folder_id, permission_id)): Path<(Uuid, Uuid)>,
    claims: OptionalClaims,
) -> Json<ApiResponse<()>> {
    if !claims.0.is_admin() {
        return Json(ApiResponse::error(403, "权限不足：需要管理员权限"));
    }

    if let Some(service) = &state.permission_service {
        match service.remove_folder_permission(permission_id).await {
            Ok(success) => {
                if success {
                    Json(ApiResponse::ok("文件夹权限删除成功"))
                } else {
                    Json(ApiResponse::error(404, "权限不存在"))
                }
            }
            Err(e) => {
                tracing::error!("删除文件夹权限失败: {}", e);
                Json(ApiResponse::error(500, "删除文件夹权限失败"))
            }
        }
    } else {
        Json(ApiResponse::error(500, "权限服务不可用"))
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

    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "topems_secret_key_for_jwt_signing_2024".to_string());

    let (pool, storage_mode) = try_connect_db().await;

    let (file_repo, folder_repo) = match pool.clone() {
        Some(p) => (Some(FileRepository::new(p.clone())), Some(FolderRepository::new(p))),
        None => (None, None),
    };

    let storage_service = match StorageService::from_env().await {
        Ok(service) => Some(service),
        Err(e) => {
            tracing::warn!("⚠️ Failed to initialize storage service: {}, using in-memory only", e);
            None
        }
    };

    let conversion_service = ConversionService::new();
    if conversion_service.is_available() {
        tracing::info!("✅ LibreOffice conversion service available");
    } else {
        tracing::warn!("⚠️ LibreOffice conversion service not available (install LibreOffice for DOCX preview)");
    }

    let now = Utc::now();
    
    let file_version_repo = pool.as_ref().map(|p| FileVersionRepository::new(p.clone()));
    let permission_service = pool.as_ref().map(|p| PermissionService::new(p.clone()));
    
    let admin_user_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap_or_else(|_| Uuid::new_v4());
    
    let state = AppState {
        memory_files: Arc::new(Mutex::new(vec![
            MemoryStoredFile {
                metadata: models::FileMetadata {
                    id: Uuid::new_v4(),
                    name: "README.md".to_string(),
                    folder_id: None,
                    size: 2048,
                    content_type: "text/markdown".to_string(),
                    storage_path: "memory://readme".to_string(),
                    created_at: now,
                    updated_at: now,
                    created_by: "admin".to_string(),
                },
                content: b"# TOPEMS-DOC Document Management System\n\nThis is an example document content.\n\n## Features\n- File upload\n- File download\n- File management\n- Folder management\n- File versioning\n".to_vec(),
            },
        ])),
        memory_folders: Arc::new(Mutex::new(vec![
            MemoryStoredFolder {
                metadata: models::Folder {
                    id: Uuid::new_v4(),
                    name: "项目文档".to_string(),
                    parent_id: None,
                    created_at: now,
                    updated_at: now,
                    created_by: "admin".to_string(),
                },
            },
            MemoryStoredFolder {
                metadata: models::Folder {
                    id: Uuid::new_v4(),
                    name: "实验记录".to_string(),
                    parent_id: None,
                    created_at: now,
                    updated_at: now,
                    created_by: "admin".to_string(),
                },
            },
            MemoryStoredFolder {
                metadata: models::Folder {
                    id: Uuid::new_v4(),
                    name: "报告文件".to_string(),
                    parent_id: None,
                    created_at: now,
                    updated_at: now,
                    created_by: "admin".to_string(),
                },
            },
        ])),
        memory_file_versions: Arc::new(Mutex::new(vec![])),
        folder_repo,
        file_repo,
        file_version_repo,
        storage_service,
        conversion_service,
        permission_service,
        storage_mode,
        jwt_secret: jwt_secret.clone(),
    };

    let auth_state = AuthState { jwt_secret };

    // 配置 CORS：从环境变量读取允许的来源
    let cors_origins = std::env::var("CORS_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000,http://localhost:5173".to_string());
    
    // 解析允许的来源列表
    let allowed_origins: Vec<axum::http::HeaderValue> = cors_origins
        .split(',')
        .filter_map(|origin| {
            origin.trim().parse().ok()
        })
        .collect();
    
    let cors = CorsLayer::new()
        .allow_origin(if allowed_origins.is_empty() {
            AllowOrigin::any() // 如果没有配置，回退到允许任意来源（开发环境）
        } else {
            AllowOrigin::list(allowed_origins) // 只允许配置的来源
        })
        .allow_methods(tower_http::cors::Any)
        .allow_headers([
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::ACCEPT,
            header::ORIGIN,
            header::ACCESS_CONTROL_REQUEST_HEADERS,
            header::ACCESS_CONTROL_REQUEST_METHOD,
        ]);

    // 不需要认证的路由（预览、下载）
    let public_routes = Router::new()
        .route("/files/:id/download", get(download_file))
        .route("/files/:id/preview", get(preview_file))
        .route("/files/:id/preview-pdf", get(preview_file))
        .route("/files/:file_id/versions/:version_id/download", get(download_file_version));
    
    // 需要认证的路由
    let api_routes = Router::new()
        .route("/files", get(list_files))
        .route("/files", post(upload_file))
        .route("/files/:id", get(get_file))
        .route("/files/:id", delete(delete_file))
        .route("/files/:id/extract-text", get(extract_text))
        .route("/folders", get(list_folders))
        .route("/folders", post(create_folder))
        .route("/folders/:id", get(get_folder))
        .route("/folders/:id", put(update_folder))
        .route("/folders/:id", delete(delete_folder))
        .route("/files/:file_id/versions", get(list_file_versions))
        .route("/files/:file_id/versions/:version_id", get(get_file_version))
        // 权限管理API
        .route("/files/:file_id/permissions", get(get_file_permissions))
        .route("/files/:file_id/permissions", post(set_file_permission))
        .route("/files/:file_id/permissions/:permission_id", delete(delete_file_permission))
        .route("/folders/:folder_id/permissions", get(get_folder_permissions))
        .route("/folders/:folder_id/permissions", post(set_folder_permission))
        .route("/folders/:folder_id/permissions/:permission_id", delete(delete_folder_permission))
        // .route("/files/restore-version", post(restore_file_version))
        .layer(axum_middleware::from_fn_with_state(auth_state, optional_auth_middleware));
    
    // 合并路由
    let combined_routes = Router::new()
        .merge(public_routes)
        .merge(api_routes);

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api-docs/openapi.json", get(|| async { Json(ApiDoc::openapi()) }))
        .nest("/api/v1", combined_routes)
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .layer(DefaultBodyLimit::max(500 * 1024 * 1024))
        .with_state(state);

    let _host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8001".to_string())
        .parse()
        .unwrap_or(8001);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    
    tracing::info!("✅ TOPEMS-DOC 服务运行在 http://{}", addr);
    tracing::info!("💾 存储模式: {:?}", storage_mode);
    tracing::info!("📋 已加载示例文件");
    
    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
