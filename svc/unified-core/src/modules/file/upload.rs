//! Upload submodule - File upload handlers with multipart support

use axum::{
    extract::{Multipart, State},
    Json,
};
use serde::Serialize;
use std::fs;
use std::path::Path;
use uuid::Uuid;

use crate::AppState;
use axum::Extension;
use topems_shared_auth::auth::Claims;

#[derive(Debug, Clone, Serialize)]
struct FileUploadResponse {
    id: String,
    name: String,
    size: u64,
    mime_type: String,
    path: String,
    folder_id: Option<String>,
    created_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize)]
struct UploadResult {
    success: bool,
    message: String,
    files: Vec<FileUploadResponse>,
    failed: Vec<String>,
}

/// 上传单个文件
#[utoipa::path(
    post,
    path = "/api/core/file/upload",
    tag = "File",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "文件上传成功"),
        (status = 400, description = "文件上传失败（大小超限或类型不支持）"),
        (status = 500, description = "服务器错误"),
    ),
)]
pub async fn upload_file(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Json<serde_json::Value> {
    tracing::info!(
        "File upload upload_file called for user: {}",
        claims.username
    );

    let mut results: Vec<FileUploadResponse> = Vec::new();
    let mut failed: Vec<String> = Vec::new();
    let mut folder_id: Option<Uuid> = None;

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("unknown").to_string();

        if name == "folder_id" {
            if let Ok(data) = field.bytes().await {
                let folder_id_str = String::from_utf8_lossy(&data);
                if let Ok(fid) = Uuid::parse_str(folder_id_str.trim()) {
                    folder_id = Some(fid);
                }
            }
            continue;
        }

        if name != "file" {
            continue;
        }

        let file_name = field.file_name().unwrap_or("unknown").to_string();
        let content_type = field
            .content_type()
            .map(|ct| ct.to_string())
            .unwrap_or("application/octet-stream".to_string());

        let data = match field.bytes().await {
            Ok(d) => d,
            Err(e) => {
                tracing::error!("Failed to read file content: {}", e);
                failed.push(format!("{}: {}", file_name, e));
                continue;
            }
        };

        let file_size = data.len() as u64;

        // 检查文件大小限制（最大50MB）
        if file_size > 50 * 1024 * 1024 {
            failed.push(format!("{}: 文件大小超过限制（最大50MB）", file_name));
            continue;
        }

        // 检查文件类型（简单的白名单）
        let allowed_types = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "application/json",
            "application/zip",
        ];
        if !allowed_types.contains(&content_type.as_str()) {
            failed.push(format!("{}: 不支持的文件类型", file_name));
            continue;
        }

        // 生成文件ID和存储路径
        let file_id = Uuid::new_v4();
        let storage_path = format!("uploads/{}/{:x}", claims.sub, file_id);

        // 创建存储目录
        let path = Path::new(&storage_path);
        if let Some(parent) = path.parent() {
            if let Err(e) = fs::create_dir_all(parent) {
                tracing::error!("Failed to create storage directory: {}", e);
                return Json(serde_json::json!({
                    "success": false,
                    "message": "创建存储目录失败",
                    "data": null,
                    "code": 500
                }));
            }
        }

        // 保存文件
        if let Err(e) = fs::write(&storage_path, &data) {
            tracing::error!("Failed to save file: {}", e);
            failed.push(format!("{}: 保存失败", file_name));
            continue;
        }

        // 保存文件元数据到数据库
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

        match sqlx::query(
            r#"
            INSERT INTO core_files (id, name, size, mime_type, path, folder_id, uploader_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            "#,
        )
        .bind(file_id)
        .bind(&file_name)
        .bind(file_size as i64)
        .bind(&content_type)
        .bind(&storage_path)
        .bind(folder_id)
        .bind(user_id)
        .execute(&state.pool)
        .await
        {
            Ok(_) => {
                tracing::info!("File uploaded successfully: {}", file_name);
                results.push(FileUploadResponse {
                    id: file_id.to_string(),
                    name: file_name,
                    size: file_size,
                    mime_type: content_type,
                    path: storage_path,
                    folder_id: folder_id.map(|id| id.to_string()),
                    created_at: chrono::Utc::now().to_rfc3339(),
                });
            }
            Err(e) => {
                tracing::error!("Failed to save file metadata: {}", e);
                // 清理已保存的文件
                let _ = fs::remove_file(&storage_path);
                failed.push(format!("{}: 数据库保存失败", file_name));
            }
        }
    }

    if failed.is_empty() && !results.is_empty() {
        Json(serde_json::json!({
            "success": true,
            "message": "文件上传成功",
            "data": {
                "files": results,
                "failed": []
            },
            "code": 0
        }))
    } else if !results.is_empty() && !failed.is_empty() {
        Json(serde_json::json!({
            "success": true,
            "message": format!("部分文件上传成功，{} 个成功，{} 个失败", results.len(), failed.len()),
            "data": {
                "files": results,
                "failed": failed
            },
            "code": 0
        }))
    } else {
        Json(serde_json::json!({
            "success": false,
            "message": "文件上传失败",
            "data": {
                "files": [],
                "failed": failed
            },
            "code": 400
        }))
    }
}

/// 上传多个文件
#[utoipa::path(
    post,
    path = "/api/core/file/upload/multiple",
    tag = "File",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "文件上传成功"),
        (status = 400, description = "文件上传失败"),
        (status = 500, description = "服务器错误"),
    ),
)]
pub async fn upload_multiple(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Json<serde_json::Value> {
    tracing::info!(
        "File upload upload_multiple called for user: {}",
        claims.username
    );

    let mut results: Vec<FileUploadResponse> = Vec::new();
    let mut failed: Vec<String> = Vec::new();
    let mut folder_id: Option<Uuid> = None;

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("unknown").to_string();

        if name == "folder_id" {
            if let Ok(data) = field.bytes().await {
                let folder_id_str = String::from_utf8_lossy(&data);
                if let Ok(fid) = Uuid::parse_str(folder_id_str.trim()) {
                    folder_id = Some(fid);
                }
            }
            continue;
        }

        if name != "files" && name != "file" {
            continue;
        }

        let file_name = field.file_name().unwrap_or("unknown").to_string();
        let content_type = field
            .content_type()
            .map(|ct| ct.to_string())
            .unwrap_or("application/octet-stream".to_string());

        let data = match field.bytes().await {
            Ok(d) => d,
            Err(e) => {
                tracing::error!("Failed to read file content: {}", e);
                failed.push(format!("{}: {}", file_name, e));
                continue;
            }
        };

        let file_size = data.len() as u64;

        // 检查文件大小限制（最大50MB）
        if file_size > 50 * 1024 * 1024 {
            failed.push(format!("{}: 文件大小超过限制（最大50MB）", file_name));
            continue;
        }

        // 生成文件ID和存储路径
        let file_id = Uuid::new_v4();
        let storage_path = format!("uploads/{}/{:x}", claims.sub, file_id);

        // 创建存储目录
        let path = Path::new(&storage_path);
        if let Some(parent) = path.parent() {
            if let Err(e) = fs::create_dir_all(parent) {
                tracing::error!("Failed to create storage directory: {}", e);
                continue;
            }
        }

        // 保存文件
        if let Err(e) = fs::write(&storage_path, &data) {
            tracing::error!("Failed to save file: {}", e);
            failed.push(format!("{}: 保存失败", file_name));
            continue;
        }

        // 保存文件元数据到数据库
        let user_id = match Uuid::parse_str(&claims.sub) {
            Ok(id) => id,
            Err(e) => {
                tracing::error!("Invalid user ID: {}", e);
                continue;
            }
        };

        match sqlx::query(
            r#"
            INSERT INTO core_files (id, name, size, mime_type, path, folder_id, uploader_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            "#,
        )
        .bind(file_id)
        .bind(&file_name)
        .bind(file_size as i64)
        .bind(&content_type)
        .bind(&storage_path)
        .bind(folder_id)
        .bind(user_id)
        .execute(&state.pool)
        .await
        {
            Ok(_) => {
                tracing::info!("File uploaded successfully: {}", file_name);
                results.push(FileUploadResponse {
                    id: file_id.to_string(),
                    name: file_name,
                    size: file_size,
                    mime_type: content_type,
                    path: storage_path,
                    folder_id: folder_id.map(|id| id.to_string()),
                    created_at: chrono::Utc::now().to_rfc3339(),
                });
            }
            Err(e) => {
                tracing::error!("Failed to save file metadata: {}", e);
                let _ = fs::remove_file(&storage_path);
                failed.push(format!("{}: 数据库保存失败", file_name));
            }
        }
    }

    Json(serde_json::json!({
        "success": !results.is_empty(),
        "message": if failed.is_empty() {
            "所有文件上传成功".to_string()
        } else if results.is_empty() {
            "所有文件上传失败".to_string()
        } else {
            format!("部分文件上传成功，{} 个成功，{} 个失败", results.len(), failed.len())
        },
        "data": {
            "files": results,
            "failed": failed,
            "success_count": results.len(),
            "failed_count": failed.len()
        },
        "code": if results.is_empty() { 400 } else { 0 }
    }))
}
