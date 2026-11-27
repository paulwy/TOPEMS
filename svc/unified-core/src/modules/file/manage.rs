//! Manage submodule - File management handlers

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::fs;
use uuid::Uuid;

use crate::AppState;
use axum::Extension;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::{BindTenantScope, TenantScope};

#[derive(Debug, Clone, Serialize)]
struct FileInfo {
    id: String,
    name: String,
    size: u64,
    /// BE-09 P1-2：前端契约读 `content_type`（doc/index.ts:45）；alias 保留 `mime_type`。
    #[serde(rename = "content_type", alias = "mime_type")]
    mime_type: String,
    path: String,
    folder_id: Option<String>,
    /// BE-09 P1-5：前端 doc 契约读 `created_by`（doc/index.ts:48）；alias 保留 `uploader_id`。
    #[serde(rename = "created_by", alias = "uploader_id")]
    uploader_id: String,
    /// BE-09 P1-5：前端 file 契约读 `filename`/`original_filename`（file/index.ts:42-43）。
    #[serde(rename = "filename")]
    filename: String,
    original_filename: String,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FileQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    #[allow(dead_code)]
    folder_id: Option<String>,
    #[allow(dead_code)]
    search: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateFileRequest {
    name: Option<String>,
    folder_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FilePermissionRequest {
    user_id: String,
    permission: String, // read, write, delete
}

/// 列出文件列表
#[allow(clippy::as_conversions, clippy::cast_sign_loss)]
// admin-only: gate 显式标注（Perm-Gate R3）
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/file/files",
    tag = "Core-File",
    responses((status = 200, description = "/file/files get"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_files(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<FileQuery>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "File manage list_files called for user: {}",
        claims.username
    );

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let _offset = (page - 1) * page_size;

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    // A 类：超管显式携带 x-tenant-id 时按该租户读写（缺失租户的超管在中间件即 400）；
    // 服务令牌走系统通道，由请求事务上的 app.rls_system='on' 放行。
    let tenant_scope =
        match TenantScope::from_claims(&claims, "unified-core.file.list_files", "core_files") {
            Ok(scope) => scope,
            Err((_, message)) => {
                return Json(serde_json::json!({
                    "success": false,
                    "message": message,
                    "data": null,
                    "code": 400
                }));
            }
        };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(serde_json::json!({
            "success": false,
            "message": "缺少请求事务上下文",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to open request scope: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    // 构建查询条件 - 简化版本，避免动态参数问题
    let base_query = format!(
        "SELECT id, name, size, mime_type, path, folder_id, uploader_id, created_at, updated_at, original_name
         FROM public.core_files
         WHERE deleted_at IS NULL AND {}",
        tenant_scope.sql_predicate("tenant_id", "$1")
    );

    let _count_query = "SELECT COUNT(*) FROM public.core_files WHERE deleted_at IS NULL";

    let result = sqlx::query_as::<
        _,
        (
            Uuid,
            String,
            i64,
            Option<String>,
            String,
            Option<Uuid>,
            Uuid,
            chrono::DateTime<chrono::Utc>,
            chrono::DateTime<chrono::Utc>,
            Option<String>,
        ),
    >(sqlx::AssertSqlSafe(base_query))
    .bind_tenant_scope(&tenant_scope)
    .fetch_all(&mut scope)
    .await;

    match result {
        Ok(rows) => {
            let files: Vec<FileInfo> = rows
                .into_iter()
                .map(
                    |(
                        id,
                        name,
                        size,
                        mime_type,
                        path,
                        folder_id,
                        uploader_id,
                        created_at,
                        updated_at,
                        original_name,
                    )| FileInfo {
                        filename: name.clone(),
                        original_filename: original_name.unwrap_or_else(|| name.clone()),
                        id: id.to_string(),
                        name,
                        size: size as u64,
                        mime_type: mime_type.unwrap_or_default(),
                        path,
                        folder_id: folder_id.map(|id| id.to_string()),
                        uploader_id: uploader_id.to_string(),
                        created_at,
                        updated_at,
                    },
                )
                .collect();

            // 获取总数（与列表共用同一租户作用域，避免"总数全量、列表本租户"错位）
            let uploader_filter = if claims.is_superuser || claims.has_permission("file:admin") {
                None
            } else {
                Some(user_id)
            };
            let total = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(format!(
                "SELECT COUNT(*) FROM public.core_files WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR uploader_id = $1) AND {}",
                tenant_scope.sql_predicate("tenant_id", "$2")
            )))
            .bind(uploader_filter)
            .bind_tenant_scope(&tenant_scope)
            .fetch_one(&mut scope)
            .await;

            let total = match total {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("Failed to count files: {}", e);
                    0
                }
            };

            Json(serde_json::json!({
                "success": true,
                "message": "获取文件列表成功",
                "data": {
                    "files": files,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                },
                "code": 0
            }))
        }
        Err(e) => {
            tracing::error!("Failed to fetch files: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("获取文件列表失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

/// 权限不足响应：必须返回真实 HTTP 403，而非 200 + body.code。
fn forbidden_response(message: &str) -> Response {
    (
        StatusCode::FORBIDDEN,
        Json(serde_json::json!({
            "success": false,
            "message": message,
            "data": null,
            "code": 403
        })),
    )
        .into_response()
}

/// 获取文件详情
#[allow(clippy::as_conversions, clippy::cast_sign_loss)]
// admin-only: gate 显式标注（Perm-Gate R3）
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/file/files/{id}",
    tag = "Core-File",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "get /file/files/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
) -> Response {
    tracing::info!(
        "File manage get_file called with id: {} for user: {}",
        id,
        claims.username
    );

    let file_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid file ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的文件ID",
                "data": null,
                "code": 400
            }))
            .into_response();
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }))
            .into_response();
        }
    };

    let tenant_scope =
        match TenantScope::from_claims(&claims, "unified-core.file.get_file", "core_files") {
            Ok(scope) => scope,
            Err((_, message)) => {
                return Json(serde_json::json!({
                    "success": false,
                    "message": message,
                    "data": null,
                    "code": 400
                }))
                .into_response();
            }
        };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(serde_json::json!({
            "success": false,
            "message": "缺少请求事务上下文",
            "data": null,
            "code": 500
        }))
        .into_response();
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to open request scope: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }))
            .into_response();
        }
    };

    let row = match sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT id, name, size, mime_type, path, folder_id, uploader_id, created_at, updated_at, original_name
         FROM public.core_files WHERE id = $1 AND {}",
        tenant_scope.sql_predicate("tenant_id", "$2")
    )))
    .bind(file_id)
    .bind_tenant_scope(&tenant_scope)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            tracing::warn!("File not found: {}", id);
            return Json(serde_json::json!({
                "success": false,
                "message": "文件不存在",
                "data": null,
                "code": 404
            }))
            .into_response();
        }
        Err(e) => {
            tracing::error!("Failed to fetch file: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("获取文件失败: {}", e),
                "data": null,
                "code": 500
            }))
            .into_response();
        }
    };

    let file_uploader_id: Uuid = row.get("uploader_id");
    if file_uploader_id != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
        return forbidden_response("没有权限查看此文件");
    }

    let file_info = FileInfo {
        id: row.get::<Uuid, _>("id").to_string(),
        name: row.get::<String, _>("name"),
        size: row.get::<i64, _>("size") as u64,
        mime_type: row.get::<String, _>("mime_type"),
        path: row.get::<String, _>("path"),
        folder_id: row
            .get::<Option<Uuid>, _>("folder_id")
            .map(|id| id.to_string()),
        uploader_id: row.get::<Uuid, _>("uploader_id").to_string(),
        filename: row.get::<String, _>("name"),
        original_filename: row
            .get::<Option<String>, _>("original_name")
            .unwrap_or_else(|| row.get::<String, _>("name")),
        created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
        updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
    };

    Json(serde_json::json!({
        "success": true,
        "message": "获取文件详情成功",
        "data": file_info,
        "code": 0
    }))
    .into_response()
}

/// 更新文件信息
// admin-only: gate 显式标注（Perm-Gate R3）
#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/file/files/{id}",
    tag = "Core-File",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "put /file/files/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateFileRequest>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "File manage update_file called with id: {} for user: {}",
        id,
        claims.username
    );

    let file_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid file ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的文件ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let tenant_scope =
        match TenantScope::from_claims(&claims, "unified-core.file.update_file", "core_files") {
            Ok(scope) => scope,
            Err((_, message)) => {
                return Json(serde_json::json!({
                    "success": false,
                    "message": message,
                    "data": null,
                    "code": 400
                }));
            }
        };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(serde_json::json!({
            "success": false,
            "message": "缺少请求事务上下文",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to open request scope: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    // 检查文件是否存在且有权限
    let row = match sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT uploader_id FROM public.core_files WHERE id = $1 AND deleted_at IS NULL AND {}",
        tenant_scope.sql_predicate("tenant_id", "$2")
    )))
    .bind(file_id)
    .bind_tenant_scope(&tenant_scope)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Json(serde_json::json!({
                "success": false,
                "message": "文件不存在",
                "data": null,
                "code": 404
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch file: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    let file_uploader_id: Uuid = row.get("uploader_id");
    if file_uploader_id != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限更新此文件",
            "data": null,
            "code": 403
        }));
    }

    // 构建更新语句和参数
    let mut updates = Vec::new();
    let mut params: Vec<(String, serde_json::Value)> = Vec::new();

    if let Some(name) = payload.name {
        if !name.trim().is_empty() {
            updates.push("name = $2");
            params.push(("name".to_string(), serde_json::json!(name)));
        }
    }

    if let Some(folder_id) = payload.folder_id {
        if folder_id.is_empty() {
            updates.push("folder_id = NULL");
        } else if let Ok(fid) = Uuid::parse_str(&folder_id) {
            updates.push("folder_id = $2");
            params.push(("folder_id".to_string(), serde_json::json!(fid)));
        }
    }

    if updates.is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有提供更新内容",
            "data": null,
            "code": 400
        }));
    }

    updates.push("updated_at = NOW()");
    let query = format!(
        "UPDATE public.core_files SET {} WHERE id = $1",
        updates.join(", ")
    );

    // 执行更新查询
    let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(query)).bind(file_id);

    // 绑定额外参数
    for (_, value) in params {
        if value.is_string() {
            query_builder =
                query_builder.bind(value.as_str().map(|s| s.to_string()).unwrap_or_default());
        } else if value.is_null() {
            query_builder = query_builder.bind::<Option<Uuid>>(None);
        } else if let Some(uuid) = value.as_str().and_then(|s| Uuid::parse_str(s).ok()) {
            query_builder = query_builder.bind(uuid);
        } else {
            query_builder = query_builder.bind(value);
        }
    }

    match query_builder.execute(&mut scope).await {
        Ok(r) if r.rows_affected() > 0 => Json(serde_json::json!({
            "success": true,
            "message": "文件更新成功",
            "data": null,
            "code": 0
        })),
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "文件更新失败",
            "data": null,
            "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to update file: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("文件更新失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

/// 删除文件（软删除）
// admin-only: gate 显式标注（Perm-Gate R3）
#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/file/files/{id}",
    tag = "Core-File",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "delete /file/files/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "File manage delete_file called with id: {} for user: {}",
        id,
        claims.username
    );

    let file_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid file ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的文件ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let tenant_scope =
        match TenantScope::from_claims(&claims, "unified-core.file.delete_file", "core_files") {
            Ok(scope) => scope,
            Err((_, message)) => {
                return Json(serde_json::json!({
                    "success": false,
                    "message": message,
                    "data": null,
                    "code": 400
                }));
            }
        };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(serde_json::json!({
            "success": false,
            "message": "缺少请求事务上下文",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to open request scope: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    // 获取文件信息
    let row = match sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT uploader_id, path, deleted_at FROM public.core_files WHERE id = $1 AND {}",
        tenant_scope.sql_predicate("tenant_id", "$2")
    )))
    .bind(file_id)
    .bind_tenant_scope(&tenant_scope)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Json(serde_json::json!({
                "success": false,
                "message": "文件不存在",
                "data": null,
                "code": 404
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch file: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    let file_uploader_id: Uuid = row.get("uploader_id");
    let file_path: String = row.get("path");
    let deleted_at: Option<chrono::DateTime<chrono::Utc>> = row.get("deleted_at");

    if file_uploader_id != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限删除此文件",
            "data": null,
            "code": 403
        }));
    }

    if deleted_at.is_some() {
        return Json(serde_json::json!({
            "success": false,
            "message": "文件已被删除",
            "data": null,
            "code": 400
        }));
    }

    // 软删除文件
    match sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE public.core_files SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL AND {}",
        tenant_scope.sql_predicate("tenant_id", "$2")
    )))
    .bind(file_id)
    .bind_tenant_scope(&tenant_scope)
    .execute(&mut scope)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => {
            // 如果是管理员或超级管理员，也可以选择物理删除文件
            if claims.is_superuser || claims.has_permission("file:admin") {
                let _ = fs::remove_file(&file_path);
            }

            Json(serde_json::json!({
                "success": true,
                "message": "文件删除成功",
                "data": null,
                "code": 0
            }))
        }
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "文件删除失败",
            "data": null,
            "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to delete file: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("文件删除失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

/// 移动文件
// admin-only: gate 显式标注（Perm-Gate R3）
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/file/files/{id}/move",
    tag = "Core-File",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "post /file/files/{id}/move"), (status = 500, description = "服务内部错误")),
)]
pub async fn move_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "File manage move_file called with id: {} for user: {}",
        id,
        claims.username
    );

    let file_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid file ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的文件ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let target_folder_id = payload.get("folder_id").and_then(|v| v.as_str());
    let target_folder_uuid = if let Some(fid) = target_folder_id {
        if fid.is_empty() {
            None
        } else {
            match Uuid::parse_str(fid) {
                Ok(id) => Some(id),
                Err(e) => {
                    tracing::error!("Invalid folder ID: {}", e);
                    return Json(serde_json::json!({
                        "success": false,
                        "message": "无效的文件夹ID",
                        "data": null,
                        "code": 400
                    }));
                }
            }
        }
    } else {
        None
    };

    let tenant_scope =
        match TenantScope::from_claims(&claims, "unified-core.file.move_file", "core_files") {
            Ok(scope) => scope,
            Err((_, message)) => {
                return Json(serde_json::json!({
                    "success": false,
                    "message": message,
                    "data": null,
                    "code": 400
                }));
            }
        };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(serde_json::json!({
            "success": false,
            "message": "缺少请求事务上下文",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to open request scope: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    // 检查文件权限
    let row = match sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT uploader_id FROM public.core_files WHERE id = $1 AND deleted_at IS NULL AND {}",
        tenant_scope.sql_predicate("tenant_id", "$2")
    )))
    .bind(file_id)
    .bind_tenant_scope(&tenant_scope)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Json(serde_json::json!({
                "success": false,
                "message": "文件不存在",
                "data": null,
                "code": 404
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch file: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    let file_uploader_id: Uuid = row.get("uploader_id");
    if file_uploader_id != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限移动此文件",
            "data": null,
            "code": 403
        }));
    }

    // 更新文件的文件夹ID
    match sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE public.core_files SET folder_id = $2, updated_at = NOW() WHERE id = $1 AND {}",
        tenant_scope.sql_predicate("tenant_id", "$3")
    )))
    .bind(file_id)
    .bind(target_folder_uuid)
    .bind_tenant_scope(&tenant_scope)
    .execute(&mut scope)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(serde_json::json!({
            "success": true,
            "message": "文件移动成功",
            "data": null,
            "code": 0
        })),
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "文件移动失败",
            "data": null,
            "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to move file: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("文件移动失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

/// 复制文件
// admin-only: gate 显式标注（Perm-Gate R3）
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/file/files/{id}/copy",
    tag = "Core-File",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "post /file/files/{id}/copy"), (status = 500, description = "服务内部错误")),
)]
pub async fn copy_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    // 文件写操作必须携带有效租户：缺失或零租户时返回 400，禁止把文件写入零 UUID 区间。
    let tenant_bind = match claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .filter(|t| !t.is_nil())
    {
        Some(t) => t,
        None => {
            return Json(topems_shared_core::response::error_value(
                400,
                "缺少租户上下文：拒绝文件写操作",
            ))
        }
    };
    tracing::info!(
        "File manage copy_file called with id: {} for user: {}",
        id,
        claims.username
    );

    let file_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid file ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的文件ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let tenant_scope =
        match TenantScope::from_claims(&claims, "unified-core.file.copy_file", "core_files") {
            Ok(scope) => scope,
            Err((_, message)) => {
                return Json(serde_json::json!({
                    "success": false,
                    "message": message,
                    "data": null,
                    "code": 400
                }));
            }
        };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(serde_json::json!({
            "success": false,
            "message": "缺少请求事务上下文",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to open request scope: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    // 获取源文件信息
    let row = match sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT name, size, mime_type, path, uploader_id FROM public.core_files WHERE id = $1 AND deleted_at IS NULL AND {}",
        tenant_scope.sql_predicate("tenant_id", "$2")
    )))
        .bind(file_id)
        .bind_tenant_scope(&tenant_scope)
        .fetch_optional(&mut scope)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Json(serde_json::json!({
                "success": false,
                "message": "文件不存在",
                "data": null,
                "code": 404
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch file: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    let file_uploader_id: Uuid = row.get("uploader_id");
    if file_uploader_id != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限复制此文件",
            "data": null,
            "code": 403
        }));
    }

    let name: String = row.get("name");
    let size: i64 = row.get("size");
    let mime_type: String = row.get("mime_type");
    let source_path: String = row.get("path");

    // 获取目标文件夹ID
    let target_folder_id = payload.get("folder_id").and_then(|v| v.as_str());
    let target_folder_uuid = if let Some(fid) = target_folder_id {
        if fid.is_empty() {
            None
        } else {
            match Uuid::parse_str(fid) {
                Ok(id) => Some(id),
                Err(e) => {
                    tracing::error!("Invalid folder ID: {}", e);
                    return Json(serde_json::json!({
                        "success": false,
                        "message": "无效的文件夹ID",
                        "data": null,
                        "code": 400
                    }));
                }
            }
        }
    } else {
        None
    };

    // 生成新文件名（添加副本标记）
    let new_name = format!("{}_copy", name);
    let new_file_id = Uuid::new_v4();
    let new_path = format!("uploads/{}/{:x}", claims.sub, new_file_id);

    // 复制文件
    match fs::copy(&source_path, &new_path) {
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to copy file: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "文件复制失败",
                "data": null,
                "code": 500
            }));
        }
    }

    // 保存新文件记录到数据库
    match sqlx::query(
        r#"
        INSERT INTO public.core_files (id, name, size, mime_type, path, folder_id, uploader_id, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        "#,
    )
    .bind(new_file_id)
    .bind(&new_name)
    .bind(size)
    .bind(&mime_type)
    .bind(&new_path)
    .bind(target_folder_uuid)
    .bind(user_id)
    .bind(tenant_bind)
    .execute(&mut scope)
    .await
    {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "文件复制成功",
            "data": {
                "id": new_file_id.to_string(),
                "name": new_name
            },
            "code": 0
        })),
        Err(e) => {
            tracing::error!("Failed to save copied file: {}", e);
            let _ = fs::remove_file(&new_path);
            Json(serde_json::json!({
                "success": false,
                "message": format!("文件复制失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

/// 分享文件
/// 获取文件的分享列表
/// 删除分享
/// 设置文件权限
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/file/files/{id}/permissions",
    tag = "Core-File",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "post /file/files/{id}/permissions"), (status = 500, description = "服务内部错误")),
)]
pub async fn set_file_permissions(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(_payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "File manage set_file_permissions called with id: {} for user: {}",
        id,
        claims.username
    );
    Json(serde_json::json!({
        "success": false,
        "message": "批量设置文件权限功能尚未实现 (Not Implemented)",
        "data": null,
        "code": 501
    }))
}

/// 获取文件权限
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/file/files/{id}/permissions",
    tag = "Core-File",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "get /file/files/{id}/permissions"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_file_permissions(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "File manage get_file_permissions called with id: {} for user: {}",
        id,
        claims.username
    );
    Json(serde_json::json!({
        "success": false,
        "message": "获取文件权限功能尚未实现 (Not Implemented)",
        "data": null,
        "code": 501
    }))
}

/// 获取我分享的文件列表
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/file/files/shared",
    tag = "Core-File",
    responses((status = 200, description = "get /file/files/shared"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_shared_files(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "File manage get_shared_files called for user: {}",
        claims.username
    );
    Json(serde_json::json!({
        "success": false,
        "message": "获取我分享的文件列表功能尚未实现 (Not Implemented)",
        "data": null,
        "code": 501
    }))
}

/// 获取分享给我的文件列表
/// 获取文件统计信息
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/file/stats",
    tag = "Core-File",
    responses((status = 200, description = "get /file/stats"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_file_stats(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "File manage get_file_stats called for user: {}",
        claims.username
    );
    Json(serde_json::json!({
        "success": false,
        "message": "获取文件统计信息功能尚未实现 (Not Implemented)",
        "data": null,
        "code": 501
    }))
}

/// 收藏文件
/// 取消收藏
/// 列出收藏的文件
/// 导出文件（批量）
// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/file/files/export",
    tag = "Core-File",
    responses((status = 200, description = "post /file/files/export"), (status = 500, description = "服务内部错误")),
)]
pub async fn export_files(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(_payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "File manage export_files called for user: {}",
        claims.username
    );
    Json(serde_json::json!({
        "success": false,
        "message": "导出文件功能尚未实现 (Not Implemented)",
        "data": null,
        "code": 501
    }))
}

/// 搜索文件
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/file/files/search",
    tag = "Core-File",
    responses((status = 200, description = "/file/files/search get"), (status = 500, description = "服务内部错误")),
)]
pub async fn search_files(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<FileQuery>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "File manage search_files called for user: {}",
        claims.username
    );
    Json(serde_json::json!({
        "success": false,
        "message": "搜索文件功能尚未实现 (Not Implemented)",
        "data": null,
        "code": 501
    }))
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_file_forbidden_response_returns_http_403() {
        let res = forbidden_response("没有权限查看此文件");
        assert_eq!(res.status(), StatusCode::FORBIDDEN);
        let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
            .await
            .expect("read response body");
        let body: serde_json::Value = serde_json::from_slice(&bytes).expect("response body json");
        assert_eq!(body.get("success"), Some(&serde_json::json!(false)));
        assert_eq!(body.get("code"), Some(&serde_json::json!(403)));
    }
}
