use axum::{
    extract::{Extension, Multipart, Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;

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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:media:read"])),
    path = "/media/photos",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "media"
)]
pub async fn get_photos(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
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
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let photos: Vec<MediaFile> = match sqlx::query_as::<_, MediaFile>(
        only_own_schema_query!("mobile", "SELECT id, file_name, file_type, file_url, file_size, mime_type, uploaded_by, uploaded_by_name, description, tags, created_at
         FROM mobile.media_files
         WHERE deleted_at IS NULL AND file_type = 'photo' AND uploaded_by = $1 AND ($2::uuid IS NULL OR tenant_id = $2::uuid)
         ORDER BY created_at DESC")
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_all(&mut scope)
    .await
    {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("查询照片失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("查询失败"));
        }
    };

    let __mobile_response =
        { (StatusCode::OK, ApiResponse::success(photos, "获取照片成功")) };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:media:read"])),
    path = "/media/audio",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "media"
)]
pub async fn get_audio(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
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
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let __mobile_response = {
        let audio_files: Vec<MediaFile> = match sqlx::query_as::<_, MediaFile>(
        only_own_schema_query!("mobile", "SELECT id, file_name, file_type, file_url, file_size, mime_type, uploaded_by, uploaded_by_name, description, tags, created_at
         FROM mobile.media_files
         WHERE deleted_at IS NULL AND file_type = 'audio' AND uploaded_by = $1 AND ($2::uuid IS NULL OR tenant_id = $2::uuid)
         ORDER BY created_at DESC")
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_all(&mut scope)

    .await
    {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("查询音频失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("查询失败"));
        }
    };

        (
            StatusCode::OK,
            ApiResponse::success(audio_files, "获取音频成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:media:read"])),
    path = "/media/video",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "media"
)]
pub async fn get_video(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
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
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let videos: Vec<MediaFile> = match sqlx::query_as::<_, MediaFile>(
        only_own_schema_query!("mobile", "SELECT id, file_name, file_type, file_url, file_size, mime_type, uploaded_by, uploaded_by_name, description, tags, created_at
         FROM mobile.media_files
         WHERE deleted_at IS NULL AND file_type = 'video' AND uploaded_by = $1 AND ($2::uuid IS NULL OR tenant_id = $2::uuid)
         ORDER BY created_at DESC")
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询视频失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("查询失败"));
        }
    };

    let __mobile_response =
        { (StatusCode::OK, ApiResponse::success(videos, "获取视频成功")) };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:media:write"])),
    path = "/media/upload/{file_type}",
    params(
("file_type" = String, Path, description = "file_type")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "media"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn upload_media(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(file_type): Path<String>,
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
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let valid_types = ["photo", "audio", "video"];
    if !valid_types.contains(&file_type.as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            ApiResponse::bad_request("无效的文件类型"),
        );
    }

    let mut file_name = String::new();
    let mut file_size = 0i64;
    let mut mime_type = String::new();
    let mut description: Option<String> = None;
    let mut has_file = false;

    loop {
        match multipart.next_field().await {
            Ok(Some(field)) => {
                let name = field.name().unwrap_or("").to_string();

                if name == "file" {
                    file_name = field.file_name().unwrap_or("unknown").to_string();
                    let content_type = field.content_type().unwrap_or_default().to_string();
                    match field.bytes().await {
                        Ok(bytes) => {
                            file_size = bytes.len() as i64;
                            mime_type = content_type;
                            has_file = true;
                        }
                        Err(e) => {
                            tracing::error!("读取文件失败: {}", e);
                            return (
                                StatusCode::BAD_REQUEST,
                                ApiResponse::bad_request("读取文件失败"),
                            );
                        }
                    }
                } else if name == "description" {
                    if let Ok(text) = field.text().await {
                        description = Some(text);
                    }
                }
            }
            Ok(None) => break,
            Err(e) => {
                tracing::error!("解析上传数据失败: {}", e);
                return (
                    StatusCode::BAD_REQUEST,
                    ApiResponse::bad_request("解析上传数据失败"),
                );
            }
        }
    }

    if !has_file {
        return (
            StatusCode::BAD_REQUEST,
            ApiResponse::bad_request("请上传文件"),
        );
    }

    let media_id = Uuid::new_v4();
    let file_url = format!("/api/media/{}/{}", file_type, media_id);

    if let Err(e) = sqlx::query(
        only_own_schema_query!("mobile", "INSERT INTO mobile.media_files (id, file_name, file_type, file_url, file_size, mime_type, uploaded_by, description, created_at, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)")
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
    .bind(tenant_filter.unwrap_or(Uuid::nil()))
    .execute(&mut scope)
    .await
    {
        tracing::error!("上传媒体文件失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("上传失败"));
    }

    let __mobile_response = {
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

        (
            StatusCode::CREATED,
            ApiResponse::success(media_file, "上传成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mobile:media:write"])),
    path = "/media/{file_type}/{id}",
    params(
("file_type" = String, Path, description = "file_type"),
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "media"
)]
pub async fn delete_media(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path((file_type, id)): Path<(String, Uuid)>,
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

    let result = sqlx::query(
        only_own_schema_query!("mobile", "UPDATE mobile.media_files SET deleted_at = NOW() WHERE id = $1 AND file_type = $2 AND uploaded_by = $3 "),
    )
    .bind(id)
    .bind(&file_type)
    .bind(&user_id)
    .execute(&mut scope)
    .await;

    let __mobile_response = {
        match result {
            Ok(r) if r.rows_affected() > 0 => {
                (StatusCode::OK, ApiResponse::success((), "删除成功"))
            }
            Ok(_) => (
                // 数据不存在语义：HTTP 200 + 内层 code 404。
                StatusCode::OK,
                ApiResponse::not_found("文件不存在或无权删除"),
            ),
            Err(e) => {
                tracing::error!("删除媒体文件失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("删除失败"),
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
    fn media_file_roundtrip() {
        use chrono::Utc;
        roundtrip(&MediaFile {
            id: uuid::Uuid::new_v4(),
            file_name: "a.jpg".into(),
            file_type: "photo".into(),
            file_url: Some("/uploads/a.jpg".into()),
            file_size: 1024,
            mime_type: "image/jpeg".into(),
            uploaded_by: "user".into(),
            uploaded_by_name: None,
            description: None,
            tags: Some(vec!["tag1".into()]),
            created_at: Utc::now(),
        });
    }
}
