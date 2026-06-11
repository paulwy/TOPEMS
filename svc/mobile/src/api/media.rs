use axum::{
    extract::{State, Path, Multipart},
    http::{StatusCode, HeaderMap},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared::{ApiResponse, AuthState};
use super::auth_utils::extract_user_id_from_token;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MediaFile {
    pub id: Uuid,
    pub file_name: String,
    pub file_type: String,
    pub file_url: Option<String>,
    pub file_size: i64,
    pub mime_type: String,
    pub uploaded_by: String,
    pub uploaded_by_name: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MediaStats {
    pub photos_count: i64,
    pub audio_count: i64,
    pub video_count: i64,
}

pub async fn get_photos(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let photos: Vec<MediaFile> = match sqlx::query_as::<_, MediaFile>(
        "SELECT id, file_name, file_type, file_url, file_size, mime_type, uploaded_by, uploaded_by_name, description, tags, created_at 
         FROM media_files 
         WHERE file_type = 'photo' AND uploaded_by = $1 
         ORDER BY created_at DESC"
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await
    {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("查询照片失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "查询失败")));
        }
    };

    (StatusCode::OK, Json(ApiResponse::success(photos, "获取照片成功")))
}

pub async fn get_audio(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let audio_files: Vec<MediaFile> = match sqlx::query_as::<_, MediaFile>(
        "SELECT id, file_name, file_type, file_url, file_size, mime_type, uploaded_by, uploaded_by_name, description, tags, created_at 
         FROM media_files 
         WHERE file_type = 'audio' AND uploaded_by = $1 
         ORDER BY created_at DESC"
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await
    {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("查询音频失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "查询失败")));
        }
    };

    (StatusCode::OK, Json(ApiResponse::success(audio_files, "获取音频成功")))
}

pub async fn get_video(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let videos: Vec<MediaFile> = match sqlx::query_as::<_, MediaFile>(
        "SELECT id, file_name, file_type, file_url, file_size, mime_type, uploaded_by, uploaded_by_name, description, tags, created_at 
         FROM media_files 
         WHERE file_type = 'video' AND uploaded_by = $1 
         ORDER BY created_at DESC"
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询视频失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "查询失败")));
        }
    };

    (StatusCode::OK, Json(ApiResponse::success(videos, "获取视频成功")))
}

pub async fn upload_media(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(file_type): Path<String>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let valid_types = ["photo", "audio", "video"];
    if !valid_types.contains(&file_type.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(ApiResponse::error(400, "无效的文件类型")));
    }

    let mut file_name = String::new();
    let mut file_size = 0i64;
    let mut mime_type = String::new();
    let mut description: Option<String> = None;

    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.name().unwrap_or("");
        
        if name == "file" {
            file_name = field.file_name().unwrap_or("unknown").to_string();
            let content_type = field.content_type().unwrap_or_default().to_string();
            let bytes = field.bytes().await.unwrap();
            file_size = bytes.len() as i64;
            mime_type = content_type;
        } else if name == "description" {
            description = Some(field.text().await.unwrap());
        }
    }

    let media_id = Uuid::new_v4();
    let file_url = format!("/api/v1/media/{}/{}", file_type, media_id);

    if let Err(e) = sqlx::query(
        "INSERT INTO media_files (id, file_name, file_type, file_url, file_size, mime_type, uploaded_by, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
    )
    .bind(media_id)
    .bind(&file_name)
    .bind(&file_type)
    .bind(&file_url)
    .bind(file_size)
    .bind(&mime_type)
    .bind(&user_id)
    .bind(&description)
    .bind(Utc::now())
    .execute(&pool)
    .await
    {
        tracing::error!("上传媒体文件失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "上传失败")));
    }

    let media_file = MediaFile {
        id: media_id,
        file_name,
        file_type,
        file_url: Some(file_url),
        file_size,
        mime_type,
        uploaded_by: user_id,
        uploaded_by_name: None,
        description,
        tags: None,
        created_at: Utc::now(),
    };

    (StatusCode::CREATED, Json(ApiResponse::success(media_file, "上传成功")))
}

pub async fn delete_media(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path((file_type, id)): Path<(String, Uuid)>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let result = sqlx::query("DELETE FROM media_files WHERE id = $1 AND file_type = $2 AND uploaded_by = $3")
        .bind(id)
        .bind(&file_type)
        .bind(&user_id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => (StatusCode::OK, Json(ApiResponse::success((), "删除成功"))),
        Ok(_) => (StatusCode::NOT_FOUND, Json(ApiResponse::error(404, "文件不存在或无权删除"))),
        Err(e) => {
            tracing::error!("删除媒体文件失败: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "删除失败")))
        }
    }
}
