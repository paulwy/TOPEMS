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
use tower_http::cors::{AllowOrigin, CorsLayer};
use uuid::Uuid;
use utoipa::{OpenApi, ToSchema};
use topems_shared::init_logging;

mod models;
mod db;
mod services;
mod middleware;

use db::repository::{FileRepository, FolderRepository, FileVersionRepository, TemplateRepository, TemplateCategoryRepository};
use models::{FileMetadata, Permission};
use services::storage_service::StorageService;
use services::conversion_service::ConversionService;
use services::permission_service::PermissionService;
use middleware::auth::{AuthState, optional_auth_middleware, OptionalClaims};

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
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

#[derive(Clone)]
pub struct AppState {
    file_repo: FileRepository,
    folder_repo: FolderRepository,
    file_version_repo: FileVersionRepository,
    template_repo: TemplateRepository,
    template_category_repo: TemplateCategoryRepository,
    storage_service: StorageService,
    conversion_service: ConversionService,
    permission_service: PermissionService,
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

#[derive(Debug, Serialize, Deserialize, ToSchema, utoipa::IntoParams)]
pub struct ListTemplatesQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub module: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub code: String,
    pub category_id: Option<Uuid>,
    pub module: String,
    pub description: Option<String>,
    pub content: String,
    pub variables: Option<serde_json::Value>,
    pub is_active: Option<bool>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub category_id: Option<Uuid>,
    pub module: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub variables: Option<serde_json::Value>,
    pub is_active: Option<bool>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListTemplatesResponse {
    pub items: Vec<models::TemplateResponse>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
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
        download_file_version,
        list_templates,
        get_template,
        create_template,
        update_template,
        delete_template,
        list_template_categories,
        duplicate_template,
        toggle_template_status
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
            ApiResponse::<ListFileVersionsResponse>,
            ListTemplatesQuery,
            CreateTemplateRequest,
            UpdateTemplateRequest,
            ListTemplatesResponse,
            ApiResponse::<ListTemplatesResponse>,
            ApiResponse::<models::Template>,
            ApiResponse::<models::TemplateCategory>,
            ApiResponse::<Vec<models::TemplateCategoryResponse>>
        )
    ),
    info(
        title = "TOPEMS Document Management Service API",
        version = "1.0.0",
        description = "API documentation for TOPEMS Document Management Service"
    )
)]
struct ApiDoc;

async fn connect_db() -> sqlx::PgPool {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    tracing::info!("🔌 正在连接数据库: {}", database_url);

    match db::create_pool(&database_url).await {
        Ok(pool) => {
            tracing::info!("✅ 数据库连接成功");
            if let Err(e) = init_database_tables(&pool).await {
                tracing::warn!("⚠️ 数据库表初始化警告: {}", e);
            }
            pool
        }
        Err(e) => {
            tracing::error!("❌ 数据库连接失败: {}", e);
            tracing::error!("💡 请确保 PostgreSQL 服务已启动并配置正确的 DATABASE_URL");
            panic!("无法连接到数据库: {}", e);
        }
    }
}

async fn init_database_tables(pool: &sqlx::PgPool) -> anyhow::Result<()> {
    // 定义所有迁移的 SQL
    let migrations: Vec<(&str, &str)> = vec![
        ("基础表结构", include_str!("./db/migrations/20260523000001_create_doc_schema.sql")),
        ("模板和帮助中心表", include_str!("./db/migrations/20260527000001_create_templates_and_help_center_schema.sql")),
        ("预置数据", include_str!("./db/migrations/20260527000002_seed_templates_and_help_center.sql")),
    ];
    
    for (name, migration) in migrations {
        tracing::info!("🔄 执行迁移: {}", name);
        
        // 将 SQL 文件分割成单独的语句
        for statement in migration.split(';') {
            let statement = statement.trim();
            if !statement.is_empty() && !statement.starts_with("--") {
                match sqlx::query(statement).execute(pool).await {
                    Ok(_) => {}
                    Err(e) => {
                        // 忽略已经存在的表的错误
                        if !e.to_string().contains("already exists") && 
                           !e.to_string().contains("duplicate key") {
                            tracing::warn!("⚠️ 迁移 {} 执行警告: {}", name, e);
                        }
                    }
                }
            }
        }
    }
    
    tracing::info!("🗄️ 数据库表初始化完成");
    Ok(())
}

async fn get_file_by_id(state: &AppState, id: Uuid) -> Option<FileMetadata> {
    state.file_repo.find_by_id(id).await.ok().flatten()
}

async fn get_file_content(state: &AppState, id: Uuid) -> Option<Vec<u8>> {
    state.storage_service.load_file(&id).await.ok()
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
    let storage_backend = state.storage_service.get_backend_type().to_string();

    Json(ApiResponse::success(
        HealthResponse {
            service: "topems-doc".to_string(),
            status: "healthy".to_string(),
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

    // 检查是否是 guest 用户
    if claims.0.role == "guest" {
        return Json(ApiResponse::error(401, "未授权：需要有效的认证令牌"));
    }

    tracing::debug!("用户 {} 已通过身份验证，允许读取文件列表", claims.0.username);

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);

    let files = state.file_repo.list(query.folder_id, page_size as i64, ((page - 1) * page_size) as i64).await.unwrap_or_default();
    let total = state.file_repo.count(query.folder_id).await.unwrap_or(0);

    Json(ApiResponse::success(
        ListFilesResponse {
            files,
            total: total as u64,
            page,
            page_size,
        },
        "获取文件列表成功",
    ))
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

    match state.storage_service.save_file(&id, &file_content).await {
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

            match state.file_repo.create(file.clone()).await {
                Ok(saved_file) => {
                    let _ = save_file_version(&state, id, 1, file_content.clone(), uploader).await;
                    return Json(ApiResponse::success(saved_file, "文件上传成功"));
                }
                Err(e) => {
                    tracing::error!("保存文件到数据库失败: {:?}", e);
                    let _ = state.storage_service.delete_file(&id).await;
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

    // 检查是否是 guest 用户
    if claims.0.role == "guest" {
        return Json(ApiResponse::error(401, "未授权：需要有效的认证令牌"));
    }

    if let Some(user_id) = claims.0.get_user_id() {
        if !claims.0.is_admin() {
            match state.permission_service.check_file_permission(
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
        if !claims.0.is_admin() {
            match state.permission_service.check_file_permission(
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

    tracing::debug!("用户 {} 已通过身份验证，允许删除文件", claims.0.username);

    if let Ok(true) = state.file_repo.delete(id).await {
        let _ = state.storage_service.delete_file(&id).await;
        return Json(ApiResponse::ok("文件删除成功"));
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
        if !claims.0.is_admin() {
            match state.permission_service.check_file_permission(
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

    tracing::debug!("用户 {} 已通过身份验证，允许提取文本", claims.0.username);

    if let Some(content) = get_file_content(&state, id).await {
        if let Ok(text) = String::from_utf8(content) {
            return Json(ApiResponse::success(text, "提取文本成功"));
        }
        return Json(ApiResponse::error(400, "无法提取文本：文件不是UTF-8编码"));
    }

    Json(ApiResponse::error(404, "文件不存在"))
}

async fn get_folder_by_id(state: &AppState, id: Uuid) -> Option<models::Folder> {
    state.folder_repo.find_by_id(id).await.ok().flatten()
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

    tracing::debug!("用户 {} 已通过身份验证，允许读取文件夹列表", claims.0.username);

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);

    let folders = state.folder_repo.list(query.parent_id).await.unwrap_or_default();
    let total = folders.len() as u64;

    let start = (page - 1) * page_size;
    let end = std::cmp::min(start + page_size, folders.len() as u32);
    let paged_folders = if start < folders.len() as u32 {
        folders[start as usize..end as usize].to_vec()
    } else {
        vec![]
    };

    Json(ApiResponse::success(
        ListFoldersResponse {
            folders: paged_folders,
            total,
            page,
            page_size,
        },
        "获取文件夹列表成功",
    ))
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

    match state.folder_repo.create(folder.clone()).await {
        Ok(saved_folder) => {
            return Json(ApiResponse::success(saved_folder, "文件夹创建成功"));
        }
        Err(_) => {
            return Json(ApiResponse::error(500, "创建文件夹失败"));
        }
    }
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
        if !claims.0.is_admin() {
            match state.permission_service.check_folder_permission(
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
        if !claims.0.is_admin() {
            match state.permission_service.check_folder_permission(
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

    tracing::debug!("用户 {} 已通过身份验证，允许更新文件夹", claims.0.username);

    match state.folder_repo.update(id, &req.name, req.parent_id).await {
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
            match state.permission_service.check_folder_permission(
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

    tracing::debug!("用户 {} 已通过权限检查，允许删除文件夹", claims.0.username);

    if let Ok(true) = state.folder_repo.delete(id).await {
        return Json(ApiResponse::ok("文件夹删除成功"));
    }

    Json(ApiResponse::error(404, "文件夹不存在"))
}

async fn get_next_file_version(state: &AppState, file_id: Uuid) -> i32 {
    match state.file_version_repo.get_latest_version(file_id).await {
        Ok(Some(version)) => version.version + 1,
        Ok(None) => 1,
        Err(e) => {
            tracing::error!("获取文件版本失败: {}", e);
            1
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

    if let Err(e) = state.file_version_repo.create(file_version.clone()).await {
        tracing::error!("保存文件版本到数据库失败: {}", e);
    }
    let _ = state.storage_service.save_file(&version_id, &content).await;

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
        if !claims.0.is_admin() {
            match state.permission_service.check_file_permission(
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

    tracing::debug!("用户 {} 已通过身份验证，允许查看文件版本", claims.0.username);

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);

    let versions: Vec<models::FileVersion> = match state.file_version_repo.list_by_file_id(file_id).await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("获取文件版本列表失败: {}", e);
            vec![]
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
        if !claims.0.is_admin() {
            match state.permission_service.check_file_permission(
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

    tracing::debug!("用户 {} 已通过身份验证，允许获取文件版本", claims.0.username);

    let version: Option<models::FileVersion> = match state.file_version_repo.find_by_id(version_id).await {
        Ok(Some(v)) if v.file_id == file_id => Some(v),
        Ok(_) => None,
        Err(e) => {
            tracing::error!("获取文件版本失败: {}", e);
            None
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
    Path((_file_id, version_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
    tracing::debug!("下载文件版本 {}", version_id);

    let content: Option<Vec<u8>> = match state.storage_service.load_file(&version_id).await {
        Ok(c) => Some(c),
        Err(e) => {
            tracing::error!("从存储服务加载版本内容失败: {}", e);
            None
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

    if !claims.0.has_permission("doc_write") {
        tracing::warn!("用户 {} 缺少 doc_write 权限，拒绝恢复文件版本", claims.0.username);
        return Json(ApiResponse::error(403, "权限不足：缺少修改文档的权限"));
    }

    let content_version: Option<Vec<u8>> = match state.storage_service.load_file(&req.version_id).await {
        Ok(c) => Some(c),
        Err(e) => {
            tracing::error!("从存储服务加载版本内容失败: {}", e);
            None
        }
    };

    if content_version.is_none() {
        return Json(ApiResponse::error(404, "文件版本不存在"));
    }
    let content = content_version.unwrap();

    match state.file_repo.find_by_id(req.file_id).await {
        Ok(Some(mut file)) => {
            file.updated_at = Utc::now();
            if let Err(e) = state.storage_service.save_file(&req.file_id, &content).await {
                tracing::error!("保存文件内容失败: {}", e);
                return Json(ApiResponse::error(500, "保存文件内容失败"));
            }
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
}

#[utoipa::path(
    get,
    path = "/api/v1/templates",
    tag = "templates",
    params(ListTemplatesQuery),
    responses(
        (status = 200, description = "List templates successfully", body = ApiResponse<ListTemplatesResponse>),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn list_templates(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Query(query): Query<ListTemplatesQuery>,
) -> Json<ApiResponse<ListTemplatesResponse>> {
    tracing::debug!("获取模板列表: {:?}, 用户: {}", query, claims.0.username);

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    let limit = page_size as i64;
    let offset = ((page - 1) * page_size) as i64;

    let (templates, total) = state.template_repo.list(
        query.search.as_deref(),
        query.category.as_deref(),
        query.module.as_deref(),
        query.is_active,
        limit,
        offset,
    ).await.unwrap_or_else(|e| {
        tracing::error!("获取模板列表失败: {}", e);
        (vec![], 0)
    });

    // Enrich templates with category names
    let mut enriched_templates = vec![];
    for template in templates {
        let category_name = if let Some(cat_id) = template.category_id {
            state.template_category_repo.find_by_code(&cat_id.to_string()).await
                .ok()
                .flatten()
                .map(|c| c.name)
        } else {
            None
        };

        enriched_templates.push(models::TemplateResponse {
            id: template.id,
            name: template.name,
            code: template.code,
            category_id: template.category_id,
            category_name,
            module: template.module,
            description: template.description,
            content: template.content,
            variables: template.variables,
            is_active: template.is_active.unwrap_or(true),
            is_system: template.is_system.unwrap_or(false),
            view_count: template.view_count.unwrap_or(0),
            use_count: template.use_count.unwrap_or(0),
            created_at: template.created_at,
            updated_at: template.updated_at,
            created_by: template.created_by,
        });
    }

    Json(ApiResponse::success(
        ListTemplatesResponse {
            items: enriched_templates,
            total: total as u64,
            page,
            page_size,
        },
        "获取模板列表成功",
    ))
}

#[utoipa::path(
    get,
    path = "/api/v1/templates/{id}",
    tag = "templates",
    params(
        ("id" = Uuid, Path, description = "Template UUID")
    ),
    responses(
        (status = 200, description = "Get template successfully", body = ApiResponse<models::Template>),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Template not found")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn get_template(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<models::Template>> {
    tracing::debug!("获取模板: {}, 用户: {}", id, claims.0.username);

    match state.template_repo.find_by_id(id).await {
        Ok(Some(template)) => {
            // Increment view count
            let _ = state.template_repo.increment_view_count(id).await;
            Json(ApiResponse::success(template, "获取模板成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "模板不存在")),
        Err(e) => {
            tracing::error!("获取模板失败: {}", e);
            Json(ApiResponse::error(500, "获取模板失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/templates",
    tag = "templates",
    request_body(content = CreateTemplateRequest, description = "Create template data", content_type = "application/json"),
    responses(
        (status = 200, description = "Template created successfully", body = ApiResponse<models::Template>),
        (status = 400, description = "Invalid request"),
        (status = 401, description = "Unauthorized"),
        (status = 409, description = "Template code already exists"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn create_template(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Json(req): Json<CreateTemplateRequest>,
) -> Json<ApiResponse<models::Template>> {
    tracing::debug!("创建模板: {:?}, 用户: {}", req, claims.0.username);

    if !claims.0.has_permission("doc_write") {
        return Json(ApiResponse::error(403, "权限不足"));
    }

    // Check if code already exists
    if let Ok(Some(_)) = state.template_repo.find_by_code(&req.code).await {
        return Json(ApiResponse::error(409, "模板编码已存在"));
    }

    let now = Utc::now();
    let template = models::Template {
        id: Uuid::new_v4(),
        name: req.name,
        code: req.code,
        category_id: req.category_id,
        module: req.module,
        description: req.description,
        content: req.content,
        variables: req.variables,
        is_active: req.is_active.or(Some(true)),
        is_system: Some(false),
        sort_order: req.sort_order.or(Some(0)),
        view_count: Some(0),
        use_count: Some(0),
        created_at: now,
        updated_at: now,
        created_by: claims.0.username.clone(),
    };

    match state.template_repo.create(&template).await {
        Ok(created) => Json(ApiResponse::success(created, "模板创建成功")),
        Err(e) => {
            tracing::error!("创建模板失败: {}", e);
            Json(ApiResponse::error(500, "创建模板失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/v1/templates/{id}",
    tag = "templates",
    params(
        ("id" = Uuid, Path, description = "Template UUID")
    ),
    request_body(content = UpdateTemplateRequest, description = "Update template data", content_type = "application/json"),
    responses(
        (status = 200, description = "Template updated successfully", body = ApiResponse<models::Template>),
        (status = 400, description = "Invalid request"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Cannot modify system template"),
        (status = 404, description = "Template not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn update_template(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Json<ApiResponse<models::Template>> {
    tracing::debug!("更新模板: {}, 请求: {:?}, 用户: {}", id, req, claims.0.username);

    if !claims.0.has_permission("doc_write") {
        return Json(ApiResponse::error(403, "权限不足"));
    }

    let existing = match state.template_repo.find_by_id(id).await {
        Ok(Some(t)) => t,
        Ok(None) => return Json(ApiResponse::error(404, "模板不存在")),
        Err(e) => {
            tracing::error!("查找模板失败: {}", e);
            return Json(ApiResponse::error(500, "查找模板失败"));
        }
    };

    // Cannot modify system templates
    if existing.is_system.unwrap_or(false) {
        return Json(ApiResponse::error(403, "不能修改系统模板"));
    }

    let now = Utc::now();
    let updated_template = models::Template {
        id,
        name: req.name.unwrap_or(existing.name),
        code: req.code.unwrap_or(existing.code),
        category_id: req.category_id.or(existing.category_id),
        module: req.module.unwrap_or(existing.module),
        description: req.description.or(existing.description),
        content: req.content.unwrap_or(existing.content),
        variables: req.variables.or(existing.variables),
        is_active: req.is_active.or(existing.is_active),
        is_system: existing.is_system,
        sort_order: req.sort_order.or(existing.sort_order),
        view_count: existing.view_count,
        use_count: existing.use_count,
        created_at: existing.created_at,
        updated_at: now,
        created_by: existing.created_by,
    };

    match state.template_repo.update(id, &updated_template).await {
        Ok(Some(template)) => Json(ApiResponse::success(template, "模板更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "模板不存在")),
        Err(e) => {
            tracing::error!("更新模板失败: {}", e);
            Json(ApiResponse::error(500, "更新模板失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/v1/templates/{id}",
    tag = "templates",
    params(
        ("id" = Uuid, Path, description = "Template UUID")
    ),
    responses(
        (status = 200, description = "Template deleted successfully", body = ApiResponse<()>),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Cannot delete system template"),
        (status = 404, description = "Template not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn delete_template(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("删除模板: {}, 用户: {}", id, claims.0.username);

    if !claims.0.has_permission("doc_write") {
        return Json(ApiResponse::error(403, "权限不足"));
    }

    // Check if it's a system template
    if let Ok(Some(template)) = state.template_repo.find_by_id(id).await {
        if template.is_system.unwrap_or(false) {
            return Json(ApiResponse::error(403, "不能删除系统模板"));
        }
    }

    match state.template_repo.delete(id).await {
        Ok(true) => Json(ApiResponse::ok("模板删除成功")),
        Ok(false) => Json(ApiResponse::error(404, "模板不存在")),
        Err(e) => {
            tracing::error!("删除模板失败: {}", e);
            Json(ApiResponse::error(500, "删除模板失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/templates/categories",
    tag = "templates",
    responses(
        (status = 200, description = "List template categories successfully", body = ApiResponse<Vec<models::TemplateCategoryResponse>>),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn list_template_categories(
    State(state): State<AppState>,
    claims: OptionalClaims,
) -> Json<ApiResponse<Vec<models::TemplateCategoryResponse>>> {
    tracing::debug!("获取模板分类列表, 用户: {}", claims.0.username);

    match state.template_category_repo.list(Some(true)).await {
        Ok(categories) => {
            let mut responses = vec![];
            for cat in categories {
                let template_count = state.template_category_repo.get_template_count(cat.id).await.unwrap_or(0);
                responses.push(models::TemplateCategoryResponse {
                    id: cat.id,
                    name: cat.name,
                    code: cat.code,
                    icon: cat.icon,
                    description: cat.description,
                    template_count,
                    is_active: cat.is_active.unwrap_or(true),
                });
            }
            Json(ApiResponse::success(responses, "获取模板分类列表成功"))
        }
        Err(e) => {
            tracing::error!("获取模板分类列表失败: {}", e);
            Json(ApiResponse::error(500, "获取模板分类列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/templates/{id}/duplicate",
    tag = "templates",
    params(
        ("id" = Uuid, Path, description = "Template UUID to duplicate")
    ),
    responses(
        (status = 200, description = "Template duplicated successfully", body = ApiResponse<models::Template>),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Template not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn duplicate_template(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<models::Template>> {
    tracing::debug!("复制模板: {}, 用户: {}", id, claims.0.username);

    if !claims.0.has_permission("doc_write") {
        return Json(ApiResponse::error(403, "权限不足"));
    }

    let original = match state.template_repo.find_by_id(id).await {
        Ok(Some(t)) => t,
        Ok(None) => return Json(ApiResponse::error(404, "模板不存在")),
        Err(e) => {
            tracing::error!("查找模板失败: {}", e);
            return Json(ApiResponse::error(500, "查找模板失败"));
        }
    };

    let now = Utc::now();
    let new_code = format!("{}-copy", original.code);
    
    // Check if new code already exists
    if let Ok(Some(_)) = state.template_repo.find_by_code(&new_code).await {
        // Generate unique code
        let new_code = format!("{}-{}-copy", original.code, Uuid::new_v4().to_string()[..8].to_string());
        let duplicated = models::Template {
            id: Uuid::new_v4(),
            name: format!("{} (副本)", original.name),
            code: new_code,
            category_id: original.category_id,
            module: original.module,
            description: original.description,
            content: original.content,
            variables: original.variables,
            is_active: original.is_active,
            is_system: Some(false),
            sort_order: original.sort_order,
            view_count: Some(0),
            use_count: Some(0),
            created_at: now,
            updated_at: now,
            created_by: claims.0.username.clone(),
        };

        match state.template_repo.create(&duplicated).await {
            Ok(created) => Json(ApiResponse::success(created, "模板复制成功")),
            Err(e) => {
                tracing::error!("复制模板失败: {}", e);
                Json(ApiResponse::error(500, "复制模板失败"))
            }
        }
    } else {
        let duplicated = models::Template {
            id: Uuid::new_v4(),
            name: format!("{} (副本)", original.name),
            code: new_code,
            category_id: original.category_id,
            module: original.module,
            description: original.description,
            content: original.content,
            variables: original.variables,
            is_active: original.is_active,
            is_system: Some(false),
            sort_order: original.sort_order,
            view_count: Some(0),
            use_count: Some(0),
            created_at: now,
            updated_at: now,
            created_by: claims.0.username.clone(),
        };

        match state.template_repo.create(&duplicated).await {
            Ok(created) => Json(ApiResponse::success(created, "模板复制成功")),
            Err(e) => {
                tracing::error!("复制模板失败: {}", e);
                Json(ApiResponse::error(500, "复制模板失败"))
            }
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/v1/templates/{id}/toggle-status",
    tag = "templates",
    params(
        ("id" = Uuid, Path, description = "Template UUID")
    ),
    responses(
        (status = 200, description = "Template status toggled successfully", body = ApiResponse<models::Template>),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Cannot toggle system template status"),
        (status = 404, description = "Template not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn toggle_template_status(
    State(state): State<AppState>,
    claims: OptionalClaims,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<models::Template>> {
    tracing::debug!("切换模板状态: {}, 用户: {}", id, claims.0.username);

    if !claims.0.has_permission("doc_write") {
        return Json(ApiResponse::error(403, "权限不足"));
    }

    let existing = match state.template_repo.find_by_id(id).await {
        Ok(Some(t)) => t,
        Ok(None) => return Json(ApiResponse::error(404, "模板不存在")),
        Err(e) => {
            tracing::error!("查找模板失败: {}", e);
            return Json(ApiResponse::error(500, "查找模板失败"));
        }
    };

    // Cannot toggle system templates
    if existing.is_system.unwrap_or(false) {
        return Json(ApiResponse::error(403, "不能切换系统模板状态"));
    }

    let now = Utc::now();
    let updated_template = models::Template {
        id,
        name: existing.name,
        code: existing.code,
        category_id: existing.category_id,
        module: existing.module,
        description: existing.description,
        content: existing.content,
        variables: existing.variables,
        is_active: Some(!existing.is_active.unwrap_or(true)),
        is_system: existing.is_system,
        sort_order: existing.sort_order,
        view_count: existing.view_count,
        use_count: existing.use_count,
        created_at: existing.created_at,
        updated_at: now,
        created_by: existing.created_by,
    };

    match state.template_repo.update(id, &updated_template).await {
        Ok(Some(template)) => Json(ApiResponse::success(template, "模板状态切换成功")),
        Ok(None) => Json(ApiResponse::error(404, "模板不存在")),
        Err(e) => {
            tracing::error!("切换模板状态失败: {}", e);
            Json(ApiResponse::error(500, "切换模板状态失败"))
        }
    }
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

    match state.permission_service.set_file_permission(
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
}

async fn get_file_permissions(
    State(state): State<AppState>,
    Path(file_id): Path<Uuid>,
    claims: OptionalClaims,
) -> Json<ApiResponse<Vec<models::FilePermission>>> {
    let user_id = claims.0.get_user_id();

    if !claims.0.is_admin() {
        if let Some(uid) = user_id {
            if let Ok(has_access) = state.permission_service.check_file_permission(
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

    match state.permission_service.get_file_permissions(file_id).await {
        Ok(perms) => Json(ApiResponse::success(perms, "获取文件权限成功")),
        Err(e) => {
            tracing::error!("获取文件权限失败: {}", e);
            Json(ApiResponse::error(500, "获取文件权限失败"))
        }
    }
}

async fn delete_file_permission(
    State(state): State<AppState>,
    Path((_file_id, permission_id)): Path<(Uuid, Uuid)>,
    claims: OptionalClaims,
) -> Json<ApiResponse<()>> {
    if !claims.0.is_admin() {
        return Json(ApiResponse::error(403, "权限不足：需要管理员权限"));
    }

    match state.permission_service.remove_file_permission(permission_id).await {
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

    match state.permission_service.set_folder_permission(
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
}

async fn get_folder_permissions(
    State(state): State<AppState>,
    Path(folder_id): Path<Uuid>,
    claims: OptionalClaims,
) -> Json<ApiResponse<Vec<models::FolderPermission>>> {
    let user_id = claims.0.get_user_id();

    if !claims.0.is_admin() {
        if let Some(uid) = user_id {
            if let Ok(has_access) = state.permission_service.check_folder_permission(
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

    match state.permission_service.get_folder_permissions(folder_id).await {
        Ok(perms) => Json(ApiResponse::success(perms, "获取文件夹权限成功")),
        Err(e) => {
            tracing::error!("获取文件夹权限失败: {}", e);
            Json(ApiResponse::error(500, "获取文件夹权限失败"))
        }
    }
}

async fn delete_folder_permission(
    State(state): State<AppState>,
    Path((_folder_id, permission_id)): Path<(Uuid, Uuid)>,
    claims: OptionalClaims,
) -> Json<ApiResponse<()>> {
    if !claims.0.is_admin() {
        return Json(ApiResponse::error(403, "权限不足：需要管理员权限"));
    }

    match state.permission_service.remove_folder_permission(permission_id).await {
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
}

#[tokio::main]
async fn main() {
    init_logging("topems-doc");

    tracing::info!("🚀 TOPEMS-DOC 文档管理服务启动中...");
    dotenv::dotenv().ok();

    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "topems_secret_key_for_jwt_signing_2024".to_string());

    let pool = connect_db().await;

    let file_repo = FileRepository::new(pool.clone());
    let folder_repo = FolderRepository::new(pool.clone());
    let file_version_repo = FileVersionRepository::new(pool.clone());
    let template_repo = TemplateRepository::new(pool.clone());
    let template_category_repo = TemplateCategoryRepository::new(pool.clone());

    let storage_service = match StorageService::from_env().await {
        Ok(service) => service,
        Err(e) => {
            tracing::error!("❌ 存储服务初始化失败: {}", e);
            panic!("无法初始化存储服务: {}", e);
        }
    };

    let conversion_service = ConversionService::new();
    if conversion_service.is_available() {
        tracing::info!("✅ LibreOffice conversion service available");
    } else {
        tracing::warn!("⚠️ LibreOffice conversion service not available (install LibreOffice for DOCX preview)");
    }

    let permission_service = PermissionService::new(pool.clone());

    let state = AppState {
        file_repo,
        folder_repo,
        file_version_repo,
        template_repo,
        template_category_repo,
        storage_service,
        conversion_service,
        permission_service,
        jwt_secret: jwt_secret.clone(),
    };

    let auth_state = AuthState { jwt_secret };

    let cors_origins = std::env::var("CORS_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000,http://localhost:5173".to_string());

    let allowed_origins: Vec<axum::http::HeaderValue> = cors_origins
        .split(',')
        .filter_map(|origin| {
            origin.trim().parse().ok()
        })
        .collect();

    // 生产环境禁用通配符，使用明确的允许源列表
    let cors = CorsLayer::new()
        .allow_origin(if allowed_origins.is_empty() {
            // 只有在没有配置允许源时才使用通配符（仅用于开发）
            AllowOrigin::any()
        } else {
            AllowOrigin::list(allowed_origins)
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

    let public_routes = Router::new()
        .route("/files/{id}/download", get(download_file))
        .route("/files/{id}/preview", get(preview_file))
        .route("/files/{id}/preview-pdf", get(preview_file))
        .route("/files/{file_id}/versions/{version_id}/download", get(download_file_version))
        .without_v07_checks();

    let api_routes = Router::new()
        .route("/files", get(list_files))
        .route("/files", post(upload_file))
        .route("/files/{id}", get(get_file))
        .route("/files/{id}", delete(delete_file))
        .route("/files/{id}/extract-text", get(extract_text))
        .route("/folders", get(list_folders))
        .route("/folders", post(create_folder))
        .route("/folders/{id}", get(get_folder))
        .route("/folders/{id}", put(update_folder))
        .route("/folders/{id}", delete(delete_folder))
        .route("/files/{file_id}/versions", get(list_file_versions))
        .route("/files/{file_id}/versions/{version_id}", get(get_file_version))
        .route("/files/{file_id}/permissions", get(get_file_permissions))
        .route("/files/{file_id}/permissions", post(set_file_permission))
        .route("/files/{file_id}/permissions/{permission_id}", delete(delete_file_permission))
        .route("/folders/{folder_id}/permissions", get(get_folder_permissions))
        .route("/folders/{folder_id}/permissions", post(set_folder_permission))
        .route("/folders/{folder_id}/permissions/{permission_id}", delete(delete_folder_permission))
        .route("/templates", get(list_templates))
        .route("/templates", post(create_template))
        .route("/templates/{id}", get(get_template))
        .route("/templates/{id}", put(update_template))
        .route("/templates/{id}", delete(delete_template))
        .route("/templates/{id}/duplicate", post(duplicate_template))
        .route("/templates/{id}/toggle-status", put(toggle_template_status))
        .route("/templates/categories", get(list_template_categories))
        .layer(axum_middleware::from_fn_with_state(auth_state, optional_auth_middleware))
        .without_v07_checks();

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
        .with_state(state)
        .without_v07_checks();

    let _host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8001".to_string())
        .parse()
        .unwrap_or(8001);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    tracing::info!("✅ TOPEMS-DOC 服务运行在 http://{}", addr);
    tracing::info!("💾 使用真实数据库模式");

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
