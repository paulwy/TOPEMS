//! Manage submodule - File management handlers

use axum::{extract::{Path, Query, State}, Json};
use serde::Serialize;
use sqlx::Row;
use uuid::Uuid;
use std::fs;

use crate::AppState;
use topems_shared::auth::Claims;
use axum::Extension;

#[derive(Debug, Clone, Serialize)]
struct FileInfo {
    id: String,
    name: String,
    size: u64,
    mime_type: String,
    path: String,
    folder_id: Option<String>,
    created_by: String,
    created_at: String,
    updated_at: String,
    is_deleted: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FileQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    folder_id: Option<String>,
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
pub async fn list_files(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<FileQuery>,
) -> Json<serde_json::Value> {
    tracing::info!("File manage list_files called for user: {}", claims.username);

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

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

    // 构建查询条件
    let mut query = String::from(
        "SELECT id, name, size, mime_type, path, folder_id, created_by, created_at, updated_at, is_deleted 
         FROM core_files 
         WHERE is_deleted = FALSE AND (created_by = $1 OR ",
    );

    // 管理员可以查看所有文件
    if claims.is_superuser || claims.has_permission("file:admin") {
        query.push_str("TRUE)");
    } else {
        query.push_str("FALSE)");
    }

    // 添加文件夹过滤
    if let Some(folder_id) = params.folder_id {
        if let Ok(fid) = Uuid::parse_str(&folder_id) {
            query.push_str(" AND folder_id = $2");
        }
    }

    // 添加搜索过滤
    if let Some(search) = params.search {
        query.push_str(" AND (name ILIKE $3 OR name ILIKE $3)");
    }

    query.push_str(" ORDER BY created_at DESC LIMIT $4 OFFSET $5");

    let result = sqlx::query(&query)
        .bind(user_id)
        .fetch_all(&state.pool)
        .await;

    match result {
        Ok(rows) => {
            let files: Vec<FileInfo> = rows
                .into_iter()
                .map(|row| FileInfo {
                    id: row.get::<Uuid, _>("id").to_string(),
                    name: row.get::<String, _>("name"),
                    size: row.get::<i64, _>("size") as u64,
                    mime_type: row.get::<String, _>("mime_type"),
                    path: row.get::<String, _>("path"),
                    folder_id: row.get::<Option<Uuid>, _>("folder_id").map(|id| id.to_string()),
                    created_by: row.get::<Uuid, _>("created_by").to_string(),
                    created_at: row.get::<chrono::NaiveDateTime, _>("created_at").to_string(),
                    updated_at: row.get::<chrono::NaiveDateTime, _>("updated_at").to_string(),
                    is_deleted: row.get::<bool, _>("is_deleted"),
                })
                .collect();

            // 获取总数
            let count_query = if claims.is_superuser || claims.has_permission("file:admin") {
                "SELECT COUNT(*) FROM core_files WHERE is_deleted = FALSE"
            } else {
                "SELECT COUNT(*) FROM core_files WHERE is_deleted = FALSE AND created_by = $1"
            };

            let total = match sqlx::query_scalar::<_, i64>(count_query)
                .bind(user_id)
                .fetch_one(&state.pool)
                .await
            {
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

/// 获取文件详情
pub async fn get_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("File manage get_file called with id: {} for user: {}", id, claims.username);

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

    let row = match sqlx::query(
        "SELECT id, name, size, mime_type, path, folder_id, created_by, created_at, updated_at, is_deleted 
         FROM core_files WHERE id = $1",
    )
    .bind(file_id)
    .fetch_optional(&state.pool)
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
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch file: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("获取文件失败: {}", e),
                "data": null,
                "code": 500
            }));
        }
    };

    let file_created_by: Uuid = row.get("created_by");
    if file_created_by != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限查看此文件",
            "data": null,
            "code": 403
        }));
    }

    let file_info = FileInfo {
        id: row.get::<Uuid, _>("id").to_string(),
        name: row.get::<String, _>("name"),
        size: row.get::<i64, _>("size") as u64,
        mime_type: row.get::<String, _>("mime_type"),
        path: row.get::<String, _>("path"),
        folder_id: row.get::<Option<Uuid>, _>("folder_id").map(|id| id.to_string()),
        created_by: row.get::<Uuid, _>("created_by").to_string(),
        created_at: row.get::<chrono::NaiveDateTime, _>("created_at").to_string(),
        updated_at: row.get::<chrono::NaiveDateTime, _>("updated_at").to_string(),
        is_deleted: row.get::<bool, _>("is_deleted"),
    };

    Json(serde_json::json!({
        "success": true,
        "message": "获取文件详情成功",
        "data": file_info,
        "code": 0
    }))
}

/// 更新文件信息
pub async fn update_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateFileRequest>,
) -> Json<serde_json::Value> {
    tracing::info!("File manage update_file called with id: {} for user: {}", id, claims.username);

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

    // 检查文件是否存在且有权限
    let row = match sqlx::query("SELECT created_by, is_deleted FROM core_files WHERE id = $1")
        .bind(file_id)
        .fetch_optional(&state.pool)
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

    let file_created_by: Uuid = row.get("created_by");
    if file_created_by != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
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
        "UPDATE core_files SET {} WHERE id = $1",
        updates.join(", ")
    );

    // 执行更新查询
    let mut query_builder = sqlx::query(&query).bind(file_id);
    
    // 绑定额外参数
    for (_, value) in params {
        if value.is_string() {
            query_builder = query_builder.bind(value.as_str().map(|s| s.to_string()).unwrap_or_default());
        } else if value.is_null() {
            query_builder = query_builder.bind::<Option<Uuid>>(None);
        } else if let Some(uuid) = value.as_str().and_then(|s| Uuid::parse_str(s).ok()) {
            query_builder = query_builder.bind(uuid);
        } else {
            query_builder = query_builder.bind(value);
        }
    }

    match query_builder.execute(&state.pool).await {
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
pub async fn delete_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("File manage delete_file called with id: {} for user: {}", id, claims.username);

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

    // 获取文件信息
    let row = match sqlx::query("SELECT created_by, path, is_deleted FROM core_files WHERE id = $1")
        .bind(file_id)
        .fetch_optional(&state.pool)
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

    let file_created_by: Uuid = row.get("created_by");
    let file_path: String = row.get("path");
    let is_deleted: bool = row.get("is_deleted");

    if file_created_by != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限删除此文件",
            "data": null,
            "code": 403
        }));
    }

    if is_deleted {
        return Json(serde_json::json!({
            "success": false,
            "message": "文件已被删除",
            "data": null,
            "code": 400
        }));
    }

    // 软删除文件
    match sqlx::query(
        "UPDATE core_files SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1",
    )
    .bind(file_id)
    .execute(&state.pool)
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
pub async fn move_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("File manage move_file called with id: {} for user: {}", id, claims.username);

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

    // 检查文件权限
    let row = match sqlx::query("SELECT created_by FROM core_files WHERE id = $1 AND is_deleted = FALSE")
        .bind(file_id)
        .fetch_optional(&state.pool)
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

    let file_created_by: Uuid = row.get("created_by");
    if file_created_by != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限移动此文件",
            "data": null,
            "code": 403
        }));
    }

    // 更新文件的文件夹ID
    match sqlx::query(
        "UPDATE core_files SET folder_id = $2, updated_at = NOW() WHERE id = $1",
    )
    .bind(file_id)
    .bind(target_folder_uuid)
    .execute(&state.pool)
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
pub async fn copy_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("File manage copy_file called with id: {} for user: {}", id, claims.username);

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

    // 获取源文件信息
    let row = match sqlx::query("SELECT name, size, mime_type, path, created_by FROM core_files WHERE id = $1 AND is_deleted = FALSE")
        .bind(file_id)
        .fetch_optional(&state.pool)
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

    let file_created_by: Uuid = row.get("created_by");
    if file_created_by != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
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
        INSERT INTO core_files (id, name, size, mime_type, path, folder_id, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        "#,
    )
    .bind(new_file_id)
    .bind(&new_name)
    .bind(size)
    .bind(&mime_type)
    .bind(&new_path)
    .bind(target_folder_uuid)
    .bind(user_id)
    .execute(&state.pool)
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

/// 设置文件权限
pub async fn set_file_permission(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<FilePermissionRequest>,
) -> Json<serde_json::Value> {
    tracing::info!("File manage set_file_permission called with id: {} for user: {}", id, claims.username);

    // 只有管理员可以设置权限
    if !claims.is_superuser && !claims.has_permission("file:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限设置文件权限",
            "data": null,
            "code": 403
        }));
    }

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

    let target_user_id = match Uuid::parse_str(&payload.user_id) {
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

    // 验证权限类型
    let valid_permissions = ["read", "write", "delete"];
    if !valid_permissions.contains(&payload.permission.as_str()) {
        return Json(serde_json::json!({
            "success": false,
            "message": "无效的权限类型，可选值：read, write, delete",
            "data": null,
            "code": 400
        }));
    }

    // 检查文件是否存在
    let exists = match sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM core_files WHERE id = $1 AND is_deleted = FALSE)",
    )
    .bind(file_id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(e) => e,
        Err(e) => {
            tracing::error!("Failed to check file existence: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    if !exists {
        return Json(serde_json::json!({
            "success": false,
            "message": "文件不存在",
            "data": null,
            "code": 404
        }));
    }

    // 保存文件权限（简化版本，实际应使用专门的权限表）
    match sqlx::query(
        "INSERT INTO core_file_permissions (file_id, user_id, permission) VALUES ($1, $2, $3) 
         ON CONFLICT (file_id, user_id) DO UPDATE SET permission = $3",
    )
    .bind(file_id)
    .bind(target_user_id)
    .bind(&payload.permission)
    .execute(&state.pool)
    .await
    {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "文件权限设置成功",
            "data": {
                "file_id": file_id.to_string(),
                "user_id": target_user_id.to_string(),
                "permission": payload.permission
            },
            "code": 0
        })),
        Err(e) => {
            tracing::error!("Failed to set file permission: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("文件权限设置失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

use serde::Deserialize;
