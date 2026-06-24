//! Download submodule - File download handlers

use axum::{
    extract::{Path as AxumPath, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use sqlx::Row;
use std::fs;
use std::path::Path;

use crate::AppState;
use topems_shared::auth::Claims;
use axum::Extension;
use uuid::Uuid;

/// 下载文件
pub async fn download_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    AxumPath(id): AxumPath<String>,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    tracing::info!("File download download_file called with id: {} for user: {}", id, claims.username);

    // 解析文件ID
    let file_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid file ID format: {}", e);
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "无效的文件ID",
                    "data": null,
                    "code": 400
                })),
            ));
        }
    };

    // 查询文件信息
    let row = match sqlx::query(
        "SELECT name, path, mime_type, size, created_by FROM core_files WHERE id = $1 AND is_deleted = FALSE",
    )
    .bind(file_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            tracing::warn!("File not found: {}", id);
            return Err((
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "success": false,
                    "message": "文件不存在",
                    "data": null,
                    "code": 404
                })),
            ));
        }
        Err(e) => {
            tracing::error!("Failed to query file: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "内部服务器错误",
                    "data": null,
                    "code": 500
                })),
            ));
        }
    };

    let file_name: String = row.get("name");
    let file_path: String = row.get("path");
    let mime_type: String = row.get("mime_type");
    let created_by: Uuid = row.get("created_by");

    // 检查权限：只有文件所有者或管理员可以下载
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "无效的用户ID",
                    "data": null,
                    "code": 400
                })),
            ));
        }
    };

    if created_by != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
        tracing::warn!("Permission denied: user {} cannot download file {}", claims.username, id);
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "没有权限下载此文件",
                "data": null,
                "code": 403
            })),
        ));
    }

    // 读取文件内容
    let file_content = match fs::read(&file_path) {
        Ok(content) => content,
        Err(e) => {
            tracing::error!("Failed to read file: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "无法读取文件",
                    "data": null,
                    "code": 500
                })),
            ));
        }
    };

    // 设置响应头
    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime_type)
        .header(header::CONTENT_DISPOSITION, format!("attachment; filename=\"{}\"", file_name))
        .header(header::CONTENT_LENGTH, file_content.len())
        .body(file_content.into())
        .unwrap();

    Ok(response)
}

/// 预览文件（在线查看）
pub async fn preview_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    AxumPath(id): AxumPath<String>,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    tracing::info!("File preview preview_file called with id: {} for user: {}", id, claims.username);

    // 解析文件ID
    let file_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid file ID format: {}", e);
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "无效的文件ID",
                    "data": null,
                    "code": 400
                })),
            ));
        }
    };

    // 查询文件信息
    let row = match sqlx::query(
        "SELECT name, path, mime_type, size, created_by FROM core_files WHERE id = $1 AND is_deleted = FALSE",
    )
    .bind(file_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            tracing::warn!("File not found: {}", id);
            return Err((
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "success": false,
                    "message": "文件不存在",
                    "data": null,
                    "code": 404
                })),
            ));
        }
        Err(e) => {
            tracing::error!("Failed to query file: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "内部服务器错误",
                    "data": null,
                    "code": 500
                })),
            ));
        }
    };

    let file_name: String = row.get("name");
    let file_path: String = row.get("path");
    let mime_type: String = row.get("mime_type");
    let created_by: Uuid = row.get("created_by");

    // 检查权限
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "无效的用户ID",
                    "data": null,
                    "code": 400
                })),
            ));
        }
    };

    if created_by != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
        tracing::warn!("Permission denied: user {} cannot preview file {}", claims.username, id);
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "没有权限预览此文件",
                "data": null,
                "code": 403
            })),
        ));
    }

    // 读取文件内容
    let file_content = match fs::read(&file_path) {
        Ok(content) => content,
        Err(e) => {
            tracing::error!("Failed to read file: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "无法读取文件",
                    "data": null,
                    "code": 500
                })),
            ));
        }
    };

    // 设置响应头（内联预览）
    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime_type)
        .header(header::CONTENT_DISPOSITION, format!("inline; filename=\"{}\"", file_name))
        .header(header::CONTENT_LENGTH, file_content.len())
        .body(file_content.into())
        .unwrap();

    Ok(response)
}

/// 获取文件缩略图（仅图片）
pub async fn get_thumbnail(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    AxumPath(id): AxumPath<String>,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    tracing::info!("File thumbnail get_thumbnail called with id: {} for user: {}", id, claims.username);

    // 解析文件ID
    let file_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid file ID format: {}", e);
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "无效的文件ID",
                    "data": null,
                    "code": 400
                })),
            ));
        }
    };

    // 查询文件信息
    let row = match sqlx::query(
        "SELECT name, path, mime_type, created_by FROM core_files WHERE id = $1 AND is_deleted = FALSE",
    )
    .bind(file_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            tracing::warn!("File not found: {}", id);
            return Err((
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "success": false,
                    "message": "文件不存在",
                    "data": null,
                    "code": 404
                })),
            ));
        }
        Err(e) => {
            tracing::error!("Failed to query file: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "内部服务器错误",
                    "data": null,
                    "code": 500
                })),
            ));
        }
    };

    let file_path: String = row.get("path");
    let mime_type: String = row.get("mime_type");
    let created_by: Uuid = row.get("created_by");

    // 检查权限
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "无效的用户ID",
                    "data": null,
                    "code": 400
                })),
            ));
        }
    };

    if created_by != user_id && !claims.is_superuser && !claims.has_permission("file:admin") {
        tracing::warn!("Permission denied: user {} cannot access thumbnail {}", claims.username, id);
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "没有权限访问此缩略图",
                "data": null,
                "code": 403
            })),
        ));
    }

    // 检查是否是图片类型
    let image_types = ["image/jpeg", "image/png", "image/gif"];
    if !image_types.contains(&mime_type.as_str()) {
        tracing::warn!("File is not an image: {}", mime_type);
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "只有图片文件可以生成缩略图",
                "data": null,
                "code": 400
            })),
        ));
    }

    // 尝试读取缩略图或原图
    let thumbnail_path = format!("{}.thumb", file_path);
    let file_content = if Path::new(&thumbnail_path).exists() {
        match fs::read(&thumbnail_path) {
            Ok(content) => content,
            Err(_) => fs::read(&file_path).unwrap_or_default(),
        }
    } else {
        // 如果没有缩略图，返回原图
        match fs::read(&file_path) {
            Ok(content) => content,
            Err(e) => {
                tracing::error!("Failed to read file: {}", e);
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "无法读取文件",
                        "data": null,
                        "code": 500
                    })),
                ));
            }
        }
    };

    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime_type)
        .header(header::CONTENT_LENGTH, file_content.len())
        .body(file_content.into())
        .unwrap();

    Ok(response)
}