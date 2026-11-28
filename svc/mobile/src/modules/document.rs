//! 文档模块（前端 mobile/document.ts 契约对齐，2026-10-05）
//! 无外部文档服务，落地 mobile 本地表（mobile.documents）

use axum::{
    extract::{Extension, Json, Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use utoipa::ToSchema;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use super::mobile_content_status::MobileDocumentStatus;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;

fn tenant_filter(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MobileDocument {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub file_name: String,
    pub file_size: i64,
    pub file_type: String,
    pub url: String,
    pub status: String,
    pub author_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DocumentListParams {
    pub page: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateDocumentRequest {
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub file_name: Option<String>,
    pub file_size: Option<i64>,
    pub file_type: Option<String>,
    pub url: Option<String>,
    pub status: Option<String>,
}

/// 文档列表（前端 GET /documents）
#[utoipa::path(
    get,
    path = "/api/mobile/documents",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn list_documents(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Query(params): Query<DocumentListParams>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let search = params.search.unwrap_or_default();
    let category = params.category.unwrap_or_default();

    let __mobile_response = {
        let documents: Vec<MobileDocument> = match sqlx::query_as::<_, MobileDocument>(
        only_own_schema_query!(
            "mobile",
            "SELECT id, title, description, category, file_name, file_size, file_type, url, status, author_id, created_at, updated_at
             FROM mobile.documents
             WHERE deleted_at IS NULL AND (author_id::text = $1 OR author_id IS NULL)
               AND ($2::text = '' OR title ILIKE '%' || $2 || '%')
               AND ($3::text = '' OR category = $3)
             ORDER BY created_at DESC
             LIMIT $4 OFFSET $5"
        ),
    )
    .bind(&user_id)
    .bind(&search)
    .bind(&category)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)

    .await
    {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("查询文档列表失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("查询文档列表失败"),
            );
        }
    };

        (
            StatusCode::OK,
            ApiResponse::success(
                serde_json::json!({ "items": documents, "total": documents.len() }),
                "获取文档列表成功",
            ),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 文档分类（前端 GET /documents/categories → 内置业务分类）
pub async fn get_document_categories() -> impl IntoResponse {
    let categories = serde_json::json!([
        { "id": "general", "name": "通用文档" },
        { "id": "contract", "name": "合同" },
        { "id": "report", "name": "报告" },
        { "id": "manual", "name": "操作手册" },
        { "id": "training", "name": "培训资料" },
        { "id": "quality", "name": "质量文件" }
    ]);
    (
        StatusCode::OK,
        ApiResponse::success(categories, "获取文档分类成功"),
    )
}

/// 文档统计（前端 GET /documents/stats）—— 按状态/分类聚合当前用户可见文档。
#[utoipa::path(
    get,
    path = "/api/mobile/documents/stats",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 401, description = "Unauthorized")
    )
)]
pub async fn get_document_stats(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let rows: Result<Vec<(String, String)>, sqlx::Error> = sqlx::query_as(only_own_schema_query!(
        "mobile",
        "SELECT COALESCE(status, ''), COALESCE(category, '')
         FROM mobile.documents
         WHERE deleted_at IS NULL AND (author_id::text = $1 OR author_id IS NULL)"
    ))
    .bind(&user_id)
    .fetch_all(&mut scope)
    .await;

    let rows = match rows {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询文档统计失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("查询文档统计失败"),
            );
        }
    };

    let mut by_status: std::collections::BTreeMap<String, i64> = std::collections::BTreeMap::new();
    let mut by_category: std::collections::BTreeMap<String, i64> =
        std::collections::BTreeMap::new();
    for (status, category) in &rows {
        *by_status.entry(status.clone()).or_insert(0) += 1;
        *by_category.entry(category.clone()).or_insert(0) += 1;
    }
    let _ = scope.commit().await;

    (
        StatusCode::OK,
        ApiResponse::success(
            serde_json::json!({
                "total": rows.len() as i64,
                "by_status": by_status,
                "by_category": by_category
            }),
            "获取文档统计成功",
        ),
    )
}

/// 文档详情（前端 GET /documents/{id}）
#[utoipa::path(
    get,
    path = "/api/mobile/documents/{id}",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_document(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let document = sqlx::query_as::<_, MobileDocument>(
        only_own_schema_query!(
            "mobile",
            "SELECT id, title, description, category, file_name, file_size, file_type, url, status, author_id, created_at, updated_at
             FROM mobile.documents WHERE id = $1 AND deleted_at IS NULL"
        ),
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    let __mobile_response = {
        match document {
            Ok(Some(d)) => (StatusCode::OK, ApiResponse::success(d, "获取文档详情成功")),
            Ok(None) => (
                // 数据不存在语义：HTTP 200 + 内层 code 404，避免裸 404 被前端契约探测判为路由缺失。
                StatusCode::OK,
                ApiResponse::not_found("文档不存在"),
            ),
            Err(e) => {
                tracing::error!("查询文档详情失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("查询文档详情失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 新建文档（前端 POST /documents）
#[utoipa::path(
    post,
    path = "/api/mobile/documents",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn create_document(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(req): Json<CreateDocumentRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let status = match req.status.as_deref() {
        None | Some("") => MobileDocumentStatus::DEFAULT,
        Some(raw) => match MobileDocumentStatus::from_db_str(raw) {
            Some(status) => status,
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    ApiResponse::bad_request("无效的文档状态"),
                )
            }
        },
    };

    let id = Uuid::new_v4();
    let tenant_id = match tenant_filter(&claims) {
        Some(t) if !t.is_nil() => t,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("缺少租户上下文：拒绝创建文档"),
            )
        }
    };
    let result = sqlx::query(
        only_own_schema_query!(
            "mobile",
            "INSERT INTO mobile.documents (id, title, description, category, file_name, file_size, file_type, url, status, author_id, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CAST($10 AS uuid), $11)"
        ),
    )
    .bind(id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(req.category.as_deref().unwrap_or("general"))
    .bind(req.file_name.as_deref().unwrap_or(""))
    .bind(req.file_size.unwrap_or(0))
    .bind(req.file_type.as_deref().unwrap_or(""))
    .bind(req.url.as_deref().unwrap_or(""))
    .bind(status.as_db_str())
    .bind(&user_id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    let __mobile_response = {
        match result {
            Ok(_) => (
                StatusCode::OK,
                ApiResponse::success(serde_json::json!({ "id": id }), "创建文档成功"),
            ),
            Err(e) => {
                tracing::error!("创建文档失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("创建文档失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 更新文档（前端 PUT /documents/{id}）
#[utoipa::path(
    put,
    path = "/api/mobile/documents/{id}",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn update_document(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let title = req.get("title").and_then(|v| v.as_str());
    let category = req.get("category").and_then(|v| v.as_str());
    let status = match req.get("status").and_then(|v| v.as_str()) {
        None | Some("") => None,
        Some(raw) => match MobileDocumentStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str()),
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    ApiResponse::bad_request("无效的文档状态"),
                )
            }
        },
    };

    let result = sqlx::query(
        only_own_schema_query!(
            "mobile",
            "UPDATE mobile.documents SET title = COALESCE($2, title), category = COALESCE($3, category), status = COALESCE($4, status), updated_at = NOW()
             WHERE id = $1 AND deleted_at IS NULL"
        ),
    )
    .bind(id)
    .bind(title)
    .bind(category)
    .bind(status)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            let _ = scope.commit().await;
            (StatusCode::OK, ApiResponse::success((), "更新文档成功"))
        }
        Ok(_) => {
            let _ = scope.rollback().await;
            (StatusCode::NOT_FOUND, ApiResponse::not_found("文档不存在"))
        }
        Err(e) => {
            tracing::error!("更新文档失败: {}", e);
            let _ = scope.rollback().await;
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("更新文档失败"),
            )
        }
    }
}

/// 删除文档（前端 DELETE /documents/{id}）
#[utoipa::path(
    delete,
    path = "/api/mobile/documents/{id}",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn delete_document(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "mobile",
        "UPDATE mobile.documents SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"
    ))
    .bind(id)
    .execute(&mut scope)
    .await;

    let __mobile_response = {
        match result {
            Ok(r) if r.rows_affected() > 0 => {
                (StatusCode::OK, ApiResponse::success((), "删除文档成功"))
            }
            Ok(_) => (StatusCode::OK, ApiResponse::not_found("文档不存在")),
            Err(e) => {
                tracing::error!("删除文档失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("删除文档失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}
