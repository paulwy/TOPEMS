use axum::{
    extract::{Path, State, Multipart, Query},
    Json,
    http::StatusCode,
};
use chrono::Utc;
use uuid::Uuid;
use serde_json::json;
use sqlx::PgPool;
use std::env;
use anyhow::Result;

use crate::models::{FileTransfer, ShareFile};
use topems_shared::ApiResponse;

// ==================== 文件传输API ====================

/// POST /api/v1/files/upload - 上传文件
pub async fn upload_file(
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let upload_dir = env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".to_string());
    
    // 创建上传目录
    tokio::fs::create_dir_all(&upload_dir).await.map_err(|e| {
        tracing::error!("Failed to create upload directory: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut uploaded_files = Vec::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        tracing::error!("Failed to get multipart field: {}", e);
        StatusCode::BAD_REQUEST
    })? {
        let file_name = field.file_name().unwrap_or("unknown").to_string();
        let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
        
        let data = field.bytes().await.map_err(|e| {
            tracing::error!("Failed to read file data: {}", e);
            StatusCode::BAD_REQUEST
        })?;

        let file_id = Uuid::new_v4();
        let file_path = format!("{}/{}-{}", upload_dir, file_id, file_name);
        let file_size = data.len() as i64;
        let now = Utc::now().naive_utc();

        // 保存文件到磁盘
        tokio::fs::write(&file_path, &data).await.map_err(|e| {
            tracing::error!("Failed to write file: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        // 保存文件信息到数据库
        let result = sqlx::query_as::<_, FileTransfer>(
            r#"
            INSERT INTO file_transfers (id, file_name, file_path, file_size, content_type, 
                                       uploader_id, uploader_name, chat_room_id, message_id, 
                                       is_shared, share_link, download_count, expires_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'system', 'System', NULL, NULL, FALSE, NULL, 0, NULL, $6, $6)
            RETURNING id, file_name, file_path, file_size, content_type, uploader_id, uploader_name, 
                      chat_room_id, message_id, is_shared, share_link, download_count, expires_at, created_at, updated_at
            "#
        )
        .bind(file_id)
        .bind(file_name.clone())
        .bind(file_path.clone())
        .bind(file_size)
        .bind(content_type.clone())
        .bind(now)
        .fetch_one(&pool)
        .await;

        match result {
            Ok(file_record) => {
                uploaded_files.push(json!({
                    "file_id": file_record.id.to_string(),
                    "file_name": file_record.file_name,
                    "file_path": file_record.file_path,
                    "content_type": file_record.content_type,
                    "size": file_record.file_size,
                    "upload_url": format!("/uploads/{}-{}", file_id, file_name)
                }));
            }
            Err(e) => {
                tracing::error!("Failed to save file record: {}", e);
                // 删除已上传的文件
                let _ = tokio::fs::remove_file(&file_path).await;
            }
        }
    }

    Ok(Json(ApiResponse::success(json!({
        "files": uploaded_files,
        "total": uploaded_files.len()
    }), "文件上传成功")))
}

/// GET /api/v1/files/:id - 获取文件信息
pub async fn get_file_info(
    State(pool): State<PgPool>,
    Path(file_id): Path<Uuid>,
) -> Json<ApiResponse<FileTransfer>> {
    let result = sqlx::query_as::<_, FileTransfer>(
        r#"
        SELECT id, file_name, file_path, file_size, content_type, uploader_id, uploader_name, 
               chat_room_id, message_id, is_shared, share_link, download_count, expires_at, created_at, updated_at
        FROM file_transfers
        WHERE id = $1
        "#
    )
    .bind(file_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(file)) => Json(ApiResponse::success(file, "获取文件信息成功")),
        Ok(None) => Json(ApiResponse::error(404, "文件不存在")),
        Err(e) => {
            tracing::error!("Failed to get file info: {}", e);
            Json(ApiResponse::error(500, "获取文件信息失败"))
        }
    }
}

/// GET /api/v1/files/:id/download - 下载文件（返回下载链接）
pub async fn download_file(
    State(pool): State<PgPool>,
    Path(file_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, FileTransfer>(
        r#"
        SELECT id, file_name, file_path, file_size, content_type, uploader_id, uploader_name, 
               chat_room_id, message_id, is_shared, share_link, download_count, expires_at, created_at, updated_at
        FROM file_transfers
        WHERE id = $1
        "#
    )
    .bind(file_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(file)) => {
            // 检查文件是否过期
            if let Some(expires_at) = file.expires_at {
                if expires_at < Utc::now().naive_utc() {
                    return Json(ApiResponse::error(410, "文件已过期"));
                }
            }

            // 更新下载次数
            let _ = sqlx::query(
                r#"
                UPDATE file_transfers
                SET download_count = download_count + 1, updated_at = $1
                WHERE id = $2
                "#
            )
            .bind(Utc::now().naive_utc())
            .bind(file_id)
            .execute(&pool)
            .await;

            let upload_dir = env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".to_string());
            let download_url = format!("/uploads/{}", file.file_path.replace(&upload_dir, "").trim_start_matches('/'));

            Json(ApiResponse::success(json!({
                "file_id": file.id.to_string(),
                "file_name": file.file_name,
                "file_size": file.file_size,
                "content_type": file.content_type,
                "download_url": download_url,
                "download_count": file.download_count + 1
            }), "获取下载链接成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "文件不存在")),
        Err(e) => {
            tracing::error!("Failed to get file for download: {}", e);
            Json(ApiResponse::error(500, "获取下载链接失败"))
        }
    }
}

/// DELETE /api/v1/files/:id - 删除文件
pub async fn delete_file(
    State(pool): State<PgPool>,
    Path(file_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    // 获取文件信息
    let result = sqlx::query_as::<_, FileTransfer>(
        r#"
        SELECT id, file_name, file_path, file_size, content_type, uploader_id, uploader_name, 
               chat_room_id, message_id, is_shared, share_link, download_count, expires_at, created_at, updated_at
        FROM file_transfers
        WHERE id = $1
        "#
    )
    .bind(file_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(file)) => {
            // 删除磁盘上的文件
            let _ = tokio::fs::remove_file(&file.file_path).await;

            // 删除数据库记录
            let _ = sqlx::query(
                r#"
                DELETE FROM file_transfers
                WHERE id = $1
                "#
            )
            .bind(file_id)
            .execute(&pool)
            .await;

            Json(ApiResponse::success(json!({ "deleted": true }), "删除文件成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "文件不存在")),
        Err(e) => {
            tracing::error!("Failed to delete file: {}", e);
            Json(ApiResponse::error(500, "删除文件失败"))
        }
    }
}

/// POST /api/v1/files/:id/share - 分享文件
pub async fn share_file(
    State(pool): State<PgPool>,
    Path(file_id): Path<Uuid>,
    Json(payload): Json<ShareFile>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now().naive_utc();
    
    // 生成分享链接
    let share_link = Uuid::new_v4().to_string();
    
    // 计算过期时间
    let expires_at = payload.expires_days.map(|days| {
        now + chrono::Duration::days(days as i64)
    });

    let result = sqlx::query(
        r#"
        UPDATE file_transfers
        SET is_shared = TRUE, share_link = $1, expires_at = $2, updated_at = $3
        WHERE id = $4
        "#
    )
    .bind(&share_link)
    .bind(expires_at)
    .bind(now)
    .bind(file_id)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => {
            let share_url = format!("/api/v1/files/share/{}/download", share_link);
            
            Json(ApiResponse::success(json!({
                "file_id": file_id.to_string(),
                "share_link": share_link,
                "share_url": share_url,
                "expires_at": expires_at,
                "share_to_users": payload.share_to_users
            }), "分享文件成功"))
        }
        Err(e) => {
            tracing::error!("Failed to share file: {}", e);
            Json(ApiResponse::error(500, "分享文件失败"))
        }
    }
}

/// GET /api/v1/files/history - 获取文件传输历史
pub async fn get_file_history(
    State(pool): State<PgPool>,
    Query(params): Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let user_id = params.get("user_id").and_then(|v| v.as_str()).unwrap_or("");
    let limit = params.get("limit").and_then(|v| v.as_i64()).unwrap_or(50) as i32;
    
    if user_id.is_empty() {
        return Json(ApiResponse::error(400, "用户ID不能为空"));
    }

    let result = sqlx::query_as::<_, FileTransfer>(
        r#"
        SELECT id, file_name, file_path, file_size, content_type, uploader_id, uploader_name, 
               chat_room_id, message_id, is_shared, share_link, download_count, expires_at, created_at, updated_at
        FROM file_transfers
        WHERE uploader_id = $1 OR chat_room_id IN (
            SELECT chat_room_id FROM chat_room_members WHERE user_id = $1
        )
        ORDER BY created_at DESC
        LIMIT $2
        "#
    )
    .bind(user_id)
    .bind(limit)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(files) => Json(ApiResponse::success(json!({
            "files": files,
            "total": files.len()
        }), "获取文件传输历史成功")),
        Err(e) => {
            tracing::error!("Failed to get file history: {}", e);
            Json(ApiResponse::error(500, "获取文件传输历史失败"))
        }
    }
}

/// GET /api/v1/files/share/:share_link/download - 通过分享链接下载
pub async fn download_shared_file(
    State(pool): State<PgPool>,
    Path(share_link): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, FileTransfer>(
        r#"
        SELECT id, file_name, file_path, file_size, content_type, uploader_id, uploader_name, 
               chat_room_id, message_id, is_shared, share_link, download_count, expires_at, created_at, updated_at
        FROM file_transfers
        WHERE share_link = $1 AND is_shared = TRUE
        "#
    )
    .bind(&share_link)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(file)) => {
            // 检查文件是否过期
            if let Some(expires_at) = file.expires_at {
                if expires_at < Utc::now().naive_utc() {
                    return Json(ApiResponse::error(410, "分享链接已过期"));
                }
            }

            // 更新下载次数
            let _ = sqlx::query(
                r#"
                UPDATE file_transfers
                SET download_count = download_count + 1, updated_at = $1
                WHERE id = $2
                "#
            )
            .bind(Utc::now().naive_utc())
            .bind(file.id)
            .execute(&pool)
            .await;

            let upload_dir = env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".to_string());
            let download_url = format!("/uploads/{}", file.file_path.replace(&upload_dir, "").trim_start_matches('/'));

            Json(ApiResponse::success(json!({
                "file_id": file.id.to_string(),
                "file_name": file.file_name,
                "file_size": file.file_size,
                "content_type": file.content_type,
                "download_url": download_url
            }), "获取分享文件下载链接成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "分享链接无效或文件不存在")),
        Err(e) => {
            tracing::error!("Failed to get shared file: {}", e);
            Json(ApiResponse::error(500, "获取分享文件失败"))
        }
    }
}