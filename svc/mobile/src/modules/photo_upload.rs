use axum::{
    extract::{Extension, Json, Multipart, Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use crate::db::repository::*;
use crate::models::{CreatePhotoUpload, PhotoUpload};
use sqlx::Row;
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:photos:write"])),
    path = "/photos/upload",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "photos"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn upload_photo(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    mut multipart: Multipart,
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
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
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
            ApiResponse::bad_request("无效的文件类型，仅支持图片"),
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
    let upload = match db_create_photo_upload(&mut scope, tenant_id, user_id, create_data).await {
        Ok(u) => u,
        Err(e) => {
            tracing::error!("创建上传记录失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("创建上传记录失败"),
            );
        }
    };

    let thumbnail_url = Some(format!("/photos/{}/thumbnail", upload.id));

    if let Err(e) = db_update_photo_upload_status(
        &mut scope,
        upload.id,
        "completed",
        100,
        thumbnail_url.as_deref(),
        None,
    )
    .await
    {
        tracing::error!("更新上传状态失败: {}", e);
    }

    let __mobile_response = {
        let response = PhotoUploadResponse {
            upload_id: upload.id,
            file_path: upload.file_path,
            thumbnail_url,
            status: "completed".to_string(),
            message: "上传成功".to_string(),
        };

        (
            StatusCode::OK,
            ApiResponse::success(response, "照片上传成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:photos:write"])),
    path = "/photos/batch-upload",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "photos"
)]
pub async fn batch_upload_photos(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<BatchUploadRequest>,
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
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
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
        match db_create_photo_upload(&mut scope, tenant_id, user_id, create_data).await {
            Ok(upload) => {
                let thumbnail_url = Some(format!("/photos/{}/thumbnail", upload.id));
                let _ = db_update_photo_upload_status(
                    &mut scope,
                    upload.id,
                    "completed",
                    100,
                    thumbnail_url.as_deref(),
                    None,
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

    let __mobile_response = {
        let response = BatchUploadResponse {
            success_count,
            failed_count,
            results,
        };

        (
            StatusCode::OK,
            ApiResponse::success(response, "批量上传完成"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:photos:read"])),
    path = "/photos",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "photos"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss
)]
pub async fn get_photo_list(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Query(params): Query<PhotoListQuery>,
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
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(20);

    // 根因：旧查询引用了 mobile.photo_uploads 不存在的 error_message 列，
    // 且未覆盖 PhotoUpload::from_row 所需列。按真实表结构内联查询（含软删除过滤）。
    let query = if let Some(status) = &params.status {
        sqlx::query(only_own_schema_query!(
            "mobile",
            "SELECT id, tenant_id, user_id, file_name, file_path, file_size, mime_type,
             width, height, compression_ratio, has_watermark, watermark_text, upload_status,
             upload_progress, thumbnail_url, location_lat, location_lng, created_at, uploaded_at
             FROM mobile.photo_uploads
             WHERE user_id = $1 AND upload_status = $2 AND deleted_at IS NULL
             ORDER BY created_at DESC"
        ))
        .bind(user_id)
        .bind(status)
    } else {
        sqlx::query(only_own_schema_query!(
            "mobile",
            "SELECT id, tenant_id, user_id, file_name, file_path, file_size, mime_type,
             width, height, compression_ratio, has_watermark, watermark_text, upload_status,
             upload_progress, thumbnail_url, location_lat, location_lng, created_at, uploaded_at
             FROM mobile.photo_uploads
             WHERE user_id = $1 AND deleted_at IS NULL
             ORDER BY created_at DESC"
        ))
        .bind(user_id)
    };
    let rows = match query.fetch_all(&mut scope).await {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("获取照片列表失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("获取照片列表失败"),
            );
        }
    };
    let photos: Vec<PhotoUpload> = rows
        .iter()
        .filter_map(|row| PhotoUpload::from_row(row).ok())
        .collect();

    let total = photos.len() as i64;
    let start = ((page - 1) * size) as usize;
    let end = (start + size as usize).min(photos.len());
    let items = photos[start..end].to_vec();

    let response = PhotoListResponse { items, total };

    (
        StatusCode::OK,
        ApiResponse::success(response, "获取照片列表成功"),
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoListQuery {
    pub page: Option<i64>,
    pub size: Option<i64>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:photos:read"])),
    path = "/photos/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "photos"
)]
pub async fn get_photo_by_id(
    headers: HeaderMap,
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
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    // 根因：旧 SELECT 引用了不存在的 error_message 列，且列不全导致 from_row 失败。
    // 按真实表结构与 PhotoUpload::from_row 所需列内联查询。
    let row = match sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT id, tenant_id, user_id, file_name, file_path, file_size, mime_type,
         width, height, compression_ratio, has_watermark, watermark_text, upload_status,
         upload_progress, thumbnail_url, location_lat, location_lng, created_at, uploaded_at
         FROM mobile.photo_uploads WHERE id = $1 AND deleted_at IS NULL"
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询照片失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("查询照片失败"),
            );
        }
    };

    let __mobile_response = {
        if let Some(row) = row {
            let photo = match PhotoUpload::from_row(&row) {
                Ok(p) => p,
                Err(e) => {
                    tracing::error!("解析照片失败: {}", e);
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        ApiResponse::server_error("解析照片失败"),
                    );
                }
            };
            (StatusCode::OK, ApiResponse::success(photo, "获取照片成功"))
        } else {
            // 数据不存在语义：HTTP 200 + 内层 code 404（与 announcements 约定一致），
            // 避免裸 HTTP 404 被前端契约探测判为路由缺失。
            (StatusCode::OK, ApiResponse::not_found("照片不存在"))
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:photos:read"])),
    path = "/photos/{id}/progress",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "photos"
)]
pub async fn get_upload_progress(
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
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let row = match sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT upload_progress, upload_status, file_path FROM mobile.photo_uploads WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询上传进度失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("查询上传进度失败"),
            );
        }
    };

    let __mobile_response = {
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
                ApiResponse::success(response, "获取上传进度成功"),
            )
        } else {
            // 数据不存在语义：HTTP 200 + 内层 code 404。
            (StatusCode::OK, ApiResponse::not_found("上传记录不存在"))
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    delete,
    path = "/api/mobile/photos/{id}",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn delete_photo(
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
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "mobile",
        "DELETE FROM mobile.photo_uploads WHERE id = $1 AND user_id = $2"
    ))
    .bind(id)
    .bind(user_id)
    .execute(&mut scope)
    .await;

    let __mobile_response = {
        match result {
            Ok(r) if r.rows_affected() > 0 => {
                (StatusCode::OK, ApiResponse::success((), "删除照片成功"))
            }
            Ok(_) => (
                // 数据不存在语义：HTTP 200 + 内层 code 404。
                StatusCode::OK,
                ApiResponse::not_found("照片不存在或无权删除"),
            ),
            Err(e) => {
                tracing::error!("删除照片失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("删除照片失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        // roundtrip verified by JSON comparison
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn photo_upload_request_roundtrip() {
        roundtrip(&PhotoUploadRequest {
            file_name: "a.jpg".into(),
            file_size: 1024,
            mime_type: "image/jpeg".into(),
            width: None,
            height: None,
            compression_ratio: None,
            has_watermark: false,
            watermark_text: None,
            location_lat: None,
            location_lng: None,
        });
    }

    #[test]
    fn photo_upload_response_roundtrip() {
        roundtrip(&PhotoUploadResponse {
            upload_id: Uuid::new_v4(),
            file_path: "/tmp/a.jpg".into(),
            thumbnail_url: None,
            status: "done".into(),
            message: "ok".into(),
        });
    }

    #[test]
    fn batch_upload_request_roundtrip() {
        roundtrip(&BatchUploadRequest {
            photos: vec![PhotoUploadRequest {
                file_name: "a.jpg".into(),
                file_size: 100,
                mime_type: "image/png".into(),
                width: None,
                height: None,
                compression_ratio: None,
                has_watermark: false,
                watermark_text: None,
                location_lat: None,
                location_lng: None,
            }],
        });
    }

    #[test]
    fn batch_upload_response_roundtrip() {
        roundtrip(&BatchUploadResponse {
            success_count: 1,
            failed_count: 0,
            results: vec![],
        });
    }

    #[test]
    fn photo_list_response_roundtrip() {
        roundtrip(&PhotoListResponse {
            items: vec![],
            total: 0,
        });
    }

    #[test]
    fn upload_progress_response_roundtrip() {
        roundtrip(&UploadProgressResponse {
            upload_id: Uuid::new_v4(),
            progress: 50,
            status: "uploading".into(),
            file_url: None,
        });
    }

    #[test]
    fn photo_list_query_roundtrip() {
        roundtrip(&PhotoListQuery {
            page: Some(1),
            size: Some(20),
            status: None,
        });
    }
}
