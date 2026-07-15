use axum::{
    extract::{Json, Multipart, Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use crate::db::repository::*;
use crate::models::{CreatePhotoUpload, PhotoUpload};
use sqlx::Row;
use topems_shared::{ApiResponse, AuthState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoUploadRequest {
    pub file_name: String,
    pub file_size: i64,
    pub mime_type: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub compression_ratio: Option<f64>,
    pub has_watermark: bool,
    pub watermark_text: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoUploadResponse {
    pub upload_id: Uuid,
    pub file_path: String,
    pub thumbnail_url: Option<String>,
    pub status: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchUploadRequest {
    pub photos: Vec<PhotoUploadRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchUploadResponse {
    pub success_count: i32,
    pub failed_count: i32,
    pub results: Vec<PhotoUploadResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoListResponse {
    pub items: Vec<PhotoUpload>,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadProgressResponse {
    pub upload_id: Uuid,
    pub progress: i32,
    pub status: String,
    pub file_url: Option<String>,
}

pub async fn upload_photo(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let mut file_name = String::new();
    let mut file_size = 0i64;
    let mut mime_type = String::new();
    let mut width: Option<i32> = None;
    let mut height: Option<i32> = None;
    let mut compression_ratio: Option<f64> = None;
    let mut has_watermark = false;
    let mut watermark_text: Option<String> = None;
    let mut location_lat: Option<f64> = None;
    let mut location_lng: Option<f64> = None;

    loop {
        let field = match multipart.next_field().await {
            Ok(Some(f)) => f,
            Ok(None) => break,
            Err(_) => break,
        };
        let name = field.name().unwrap_or("");

        match name {
            "file" => {
                file_name = field.file_name().unwrap_or("unknown").to_string();
                mime_type = field.content_type().unwrap_or_default().to_string();
                let bytes = match field.bytes().await {
                    Ok(b) => b,
                    Err(_) => continue,
                };
                file_size = bytes.len() as i64;
            }
            "width" => {
                width = field.text().await.ok().and_then(|t| t.parse().ok());
            }
            "height" => {
                height = field.text().await.ok().and_then(|t| t.parse().ok());
            }
            "compression_ratio" => {
                compression_ratio = field.text().await.ok().and_then(|t| t.parse().ok());
            }
            "has_watermark" => {
                has_watermark = field
                    .text()
                    .await
                    .ok()
                    .and_then(|t| t.parse().ok())
                    .unwrap_or(false);
            }
            "watermark_text" => {
                watermark_text = field.text().await.ok();
            }
            "location_lat" => {
                location_lat = field.text().await.ok().and_then(|t| t.parse().ok());
            }
            "location_lng" => {
                location_lng = field.text().await.ok().and_then(|t| t.parse().ok());
            }
            _ => {}
        }
    }

    if !mime_type.starts_with("image/") {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error(400, "无效的文件类型，仅支持图片")),
        );
    }

    let create_data = CreatePhotoUpload {
        file_name,
        file_size,
        mime_type,
        width,
        height,
        compression_ratio,
        has_watermark,
        watermark_text,
        location_lat,
        location_lng,
    };

    let tenant_id = Uuid::new_v4();
    let upload = match db_create_photo_upload(&pool, tenant_id, user_id, create_data).await {
        Ok(u) => u,
        Err(e) => {
            tracing::error!("创建上传记录失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "创建上传记录失败")),
            );
        }
    };

    let thumbnail_url = Some(format!("/api/core/mobile/photos/{}/thumbnail", upload.id));

    if let Err(e) =
        db_update_photo_upload_status(&pool, upload.id, "completed", 100, thumbnail_url.as_deref())
            .await
    {
        tracing::error!("更新上传状态失败: {}", e);
    }

    let response = PhotoUploadResponse {
        upload_id: upload.id,
        file_path: upload.file_path,
        thumbnail_url,
        status: "completed".to_string(),
        message: "上传成功".to_string(),
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "照片上传成功")),
    )
}

pub async fn batch_upload_photos(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<BatchUploadRequest>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let mut success_count = 0;
    let mut failed_count = 0;
    let mut results = Vec::new();

    for photo in payload.photos {
        let create_data = CreatePhotoUpload {
            file_name: photo.file_name,
            file_size: photo.file_size,
            mime_type: photo.mime_type,
            width: photo.width,
            height: photo.height,
            compression_ratio: photo.compression_ratio,
            has_watermark: photo.has_watermark,
            watermark_text: photo.watermark_text,
            location_lat: photo.location_lat,
            location_lng: photo.location_lng,
        };

        let tenant_id = Uuid::new_v4();
        match db_create_photo_upload(&pool, tenant_id, user_id, create_data).await {
            Ok(upload) => {
                let thumbnail_url =
                    Some(format!("/api/core/mobile/photos/{}/thumbnail", upload.id));
                let _ = db_update_photo_upload_status(
                    &pool,
                    upload.id,
                    "completed",
                    100,
                    thumbnail_url.as_deref(),
                )
                .await;

                results.push(PhotoUploadResponse {
                    upload_id: upload.id,
                    file_path: upload.file_path,
                    thumbnail_url,
                    status: "completed".to_string(),
                    message: "上传成功".to_string(),
                });
                success_count += 1;
            }
            Err(e) => {
                tracing::error!("批量上传失败: {}", e);
                results.push(PhotoUploadResponse {
                    upload_id: Uuid::new_v4(),
                    file_path: String::new(),
                    thumbnail_url: None,
                    status: "failed".to_string(),
                    message: format!("上传失败: {}", e),
                });
                failed_count += 1;
            }
        }
    }

    let response = BatchUploadResponse {
        success_count,
        failed_count,
        results,
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "批量上传完成")),
    )
}

pub async fn get_photo_list(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Query(params): Query<PhotoListQuery>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(20);

    let photos = match db_get_photo_uploads(&pool, user_id, params.status.as_deref()).await {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("获取照片列表失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取照片列表失败")),
            );
        }
    };

    let total = photos.len() as i64;
    let start = ((page - 1) * size) as usize;
    let end = (start + size as usize).min(photos.len());
    let items = photos[start..end].to_vec();

    let response = PhotoListResponse { items, total };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "获取照片列表成功")),
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoListQuery {
    pub page: Option<i64>,
    pub size: Option<i64>,
    pub status: Option<String>,
}

pub async fn get_photo_by_id(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let row = match sqlx::query("SELECT * FROM photo_uploads WHERE id = $1")
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询照片失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "查询照片失败")),
            );
        }
    };

    if let Some(row) = row {
        let photo = match PhotoUpload::from_row(&row) {
            Ok(p) => p,
            Err(e) => {
                tracing::error!("解析照片失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "解析照片失败")),
                );
            }
        };
        (
            StatusCode::OK,
            Json(ApiResponse::success(photo, "获取照片成功")),
        )
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "照片不存在")),
        )
    }
}

pub async fn get_upload_progress(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let row = match sqlx::query(
        "SELECT upload_progress, upload_status, file_path FROM photo_uploads WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询上传进度失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "查询上传进度失败")),
            );
        }
    };

    if let Some(row) = row {
        let response = UploadProgressResponse {
            upload_id: id,
            progress: row.try_get("upload_progress").unwrap_or(0),
            status: row
                .try_get("upload_status")
                .unwrap_or("unknown".to_string()),
            file_url: row.try_get("file_path").ok(),
        };
        (
            StatusCode::OK,
            Json(ApiResponse::success(response, "获取上传进度成功")),
        )
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "上传记录不存在")),
        )
    }
}

pub async fn delete_photo(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let result = sqlx::query("DELETE FROM photo_uploads WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            Json(ApiResponse::success((), "删除照片成功")),
        ),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "照片不存在或无权删除")),
        ),
        Err(e) => {
            tracing::error!("删除照片失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "删除照片失败")),
            )
        }
    }
}
