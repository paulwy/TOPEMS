use axum::{
    body::Body,
    extract::State,
    http::{header, StatusCode},
    response::{AppendHeaders, IntoResponse},
    Json,
};
use chrono::Utc;
use futures::{StreamExt, TryStreamExt};
use sqlx::PgPool;
use std::sync::Arc;
use tracing::{error, info};
use uuid::Uuid;

use crate::api::response::{ApiResponse, PagedResponse};
use crate::backends::traits::FileStorage;
use crate::backends::local::LocalStorage;
use crate::models::file::{FileMetadata, ListFilesQuery};
use crate::models::permission::{ShareFileRequest};
use crate::services::file_service::FileService;
use crate::services::permission_service::PermissionService;
use topems_shared::{AuthState, auth::Claims};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub storage: Arc<LocalStorage>,
    pub auth_state: AuthState,
}

pub async fn health_check() -> Json<ApiResponse<String>> {
    Json(ApiResponse {
        code: 200,
        success: true,
        data: Some("healthy".to_string()),
        message: "健康检查".to_string(),
        timestamp: Utc::now().to_rfc3339(),
        errors: None,
    })
}

pub async fn upload_file(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    mut multipart: axum::extract::Multipart,
) -> impl IntoResponse {
    let mut filename = String::new();
    let mut content_type = String::from("application/octet-stream");
    let mut category: Option<String> = None;
    let mut visibility: Option<String> = None;
    let mut external_id: Option<Uuid> = None;

    let mut file_chunks: Vec<bytes::Bytes> = Vec::new();

    while let Some(field) = match multipart.next_field().await {
        Ok(Some(f)) => Some(f),
        Ok(None) => None,
        Err(e) => {
            error!("Error reading multipart field: {}", e);
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::<()>::bad_request("解析上传数据失败")),
            ));
        }
    } {
        let name = field.name().unwrap_or_default();

        match name {
            "file" => {
                filename = field.file_name().unwrap_or("unnamed").to_string();

                if let Some(ext) = std::path::Path::new(&filename).extension() {
                    content_type = mime_guess::from_ext(ext.to_str().unwrap_or(""))
                        .first_or_octet_stream()
                        .to_string();
                }

                let mut stream = field.into_stream();
                while let Some(chunk_result) = stream.next().await {
                    match chunk_result {
                        Ok(chunk) => {
                            file_chunks.push(chunk);
                        }
                        Err(e) => {
                            error!("Error reading file chunk: {}", e);
                            return Err((
                                StatusCode::BAD_REQUEST,
                                Json(ApiResponse::<()>::bad_request("读取文件数据失败")),
                            ));
                        }
                    }
                }
            }
            "category" => {
                if let Ok(data) = field.text().await {
                    category = Some(data);
                }
            }
            "visibility" => {
                if let Ok(data) = field.text().await {
                    visibility = Some(data);
                }
            }
            "external_id" => {
                if let Ok(data) = field.text().await {
                    if let Ok(id) = Uuid::parse_str(&data) {
                        external_id = Some(id);
                    }
                }
            }
            _ => {}
        }
    }

    if file_chunks.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::<()>::bad_request("未提供文件")),
        ));
    }

    let owner_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            error!("Invalid user ID in claims");
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::internal_error("用户ID无效")),
            ));
        }
    };
    
    let owner_department_id = claims.department.map(|d| Uuid::parse_str(&d).ok()).flatten();

    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    let total_size: usize = file_chunks.iter().map(|c| c.len()).sum();
    let mut file_data = Vec::with_capacity(total_size);
    for chunk in file_chunks {
        file_data.extend_from_slice(&chunk);
    }

    match file_service.upload_file(
        owner_id,
        owner_department_id,
        &filename,
        file_data,
        &content_type,
        external_id,
        None,
        category,
        visibility,
    ).await {
        Ok(metadata) => {
            info!("File uploaded successfully by user {}: {}", claims.sub, metadata.id);
            Ok(Json(ApiResponse::success(metadata, "文件上传成功")))
        }
        Err(e) => {
            error!("Failed to upload file: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::internal_error(&format!("上传失败: {}", e))),
            ))
        }
    }
}

pub async fn get_file(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(file_id): axum::extract::Path<Uuid>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    match file_service.get_file(file_id).await {
        Ok(Some(metadata)) => {
            if !has_file_access(&state.db, &claims, &metadata).await {
                return Err((
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<()>::forbidden("无权访问此文件")),
                ));
            }
            Ok(Json(ApiResponse::success(metadata, "获取成功")))
        }
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::not_found("文件不存在")),
        )),
        Err(e) => {
            error!("Failed to get file: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::internal_error("获取失败")),
            ))
        }
    }
}

pub async fn download_file(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(file_id): axum::extract::Path<Uuid>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    let metadata_result = file_service.get_file(file_id).await;
    
    match metadata_result {
        Ok(Some(metadata)) => {
            if !has_file_access(&state.db, &claims, &metadata).await {
                return Err((
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<()>::forbidden("无权下载此文件")),
                ));
            }
            
            match file_service.download_file(file_id).await {
                Ok((metadata, data)) => {
                    let filename = &metadata.filename;
                    let content_type = &metadata.content_type;

                    let headers = AppendHeaders([
                        (header::CONTENT_TYPE, content_type.clone()),
                        (
                            header::CONTENT_DISPOSITION,
                            format!("attachment; filename=\"{}\"", filename),
                        ),
                        (header::CONTENT_LENGTH, data.len().to_string()),
                    ]);

                    Ok((StatusCode::OK, headers, Body::from(data)).into_response())
                }
                Err(e) => {
                    error!("Failed to download file: {}", e);
                    Err((
                        StatusCode::NOT_FOUND,
                        Json(ApiResponse::<()>::not_found("文件不存在")),
                    ))
                }
            }
        }
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::not_found("文件不存在")),
        )),
        Err(e) => {
            error!("Failed to get file metadata: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::internal_error("获取失败")),
            ))
        }
    }
}

pub async fn delete_file(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(file_id): axum::extract::Path<Uuid>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    match file_service.get_file(file_id).await {
        Ok(Some(metadata)) => {
            if !is_file_owner(&claims, &metadata) && !claims.is_superuser {
                return Err((
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<()>::forbidden("无权删除此文件")),
                ));
            }
            
            match file_service.delete_file(file_id).await {
                Ok(()) => Ok(Json(ApiResponse::success((), "删除成功"))),
                Err(e) => {
                    error!("Failed to delete file: {}", e);
                    Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::<()>::internal_error("删除失败")),
                    ))
                }
            }
        }
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::not_found("文件不存在")),
        )),
        Err(e) => {
            error!("Failed to get file: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::internal_error("获取失败")),
            ))
        }
    }
}

pub async fn list_files(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<ListFilesQuery>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    let mut effective_query = query.clone();
    
    if !claims.is_superuser {
        let user_id = match Uuid::parse_str(&claims.sub) {
            Ok(id) => id,
            Err(_) => {
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::<()>::internal_error("用户ID无效")),
                ));
            }
        };
        effective_query.owner_id = Some(user_id);
    }

    match file_service.list_files(effective_query.clone()).await {
        Ok(files) => {
            let total = files.len() as i64;
            let page = query.page.unwrap_or(1);
            let page_size = query.page_size.unwrap_or(20);

            Ok(Json(ApiResponse::success(
                PagedResponse::new(files, total, page, page_size),
                "获取成功",
            )))
        }
        Err(e) => {
            error!("Failed to list files: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::internal_error("获取失败")),
            ))
        }
    }
}

pub async fn share_file(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(file_id): axum::extract::Path<Uuid>,
    axum::extract::Json(request): axum::extract::Json<ShareFileRequest>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    match file_service.get_file(file_id).await {
        Ok(Some(metadata)) => {
            if !is_file_owner(&claims, &metadata) && !claims.is_superuser {
                return Err((
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<()>::forbidden("无权分享此文件")),
                ));
            }
            
            let permission_service = PermissionService::new(state.db.clone());
            let granted_by = match Uuid::parse_str(&claims.sub) {
                Ok(id) => id,
                Err(_) => return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::<()>::internal_error("用户ID无效")),
                )),
            };

            match permission_service.share_file(file_id, request, granted_by).await {
                Ok(permission) => Ok(Json(ApiResponse::success(permission, "分享成功"))),
                Err(e) => {
                    error!("Failed to share file: {}", e);
                    Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::<()>::internal_error("分享失败")),
                    ))
                }
            }
        }
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::not_found("文件不存在")),
        )),
        Err(e) => {
            error!("Failed to get file: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::internal_error("获取失败")),
            ))
        }
    }
}

pub async fn get_shared_files(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::internal_error("用户ID无效")),
            ));
        }
    };
    let user_department_id = claims.department.map(|d| Uuid::parse_str(&d).ok()).flatten();

    match file_service.get_shared_with_me(user_id, user_department_id).await {
        Ok(files) => Ok(Json(ApiResponse::success(files, "获取成功"))),
        Err(e) => {
            error!("Failed to get shared files: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::internal_error("获取失败")),
            ))
        }
    }
}

pub async fn get_file_permissions(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(file_id): axum::extract::Path<Uuid>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    match file_service.get_file(file_id).await {
        Ok(Some(metadata)) => {
            if !has_file_access(&state.db, &claims, &metadata).await {
                return Err((
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<()>::forbidden("无权访问此文件权限")),
                ));
            }
            
            let permission_service = PermissionService::new(state.db.clone());
            match permission_service.get_file_permissions(file_id).await {
                Ok(permissions) => Ok(Json(ApiResponse::success(permissions, "获取成功"))),
                Err(e) => {
                    error!("Failed to get permissions: {}", e);
                    Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::<()>::internal_error("获取失败")),
                    ))
                }
            }
        }
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::not_found("文件不存在")),
        )),
        Err(e) => {
            error!("Failed to get file: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::internal_error("获取失败")),
            ))
        }
    }
}

pub async fn revoke_permission(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path((file_id, principal_type, principal_id, permission)): axum::extract::Path<(Uuid, String, Uuid, String)>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    match file_service.get_file(file_id).await {
        Ok(Some(metadata)) => {
            if !is_file_owner(&claims, &metadata) && !claims.is_superuser {
                return Err((
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<()>::forbidden("无权撤销此权限")),
                ));
            }
            
            let permission_service = PermissionService::new(state.db.clone());
            match permission_service
                .revoke_permission(file_id, &principal_type, principal_id, &permission)
                .await
            {
                Ok(()) => Ok(Json(ApiResponse::success((), "撤销成功"))),
                Err(e) => {
                    error!("Failed to revoke permission: {}", e);
                    Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::<()>::internal_error("撤销失败")),
                    ))
                }
            }
        }
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::not_found("文件不存在")),
        )),
        Err(e) => {
            error!("Failed to get file: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::internal_error("获取失败")),
            ))
        }
    }
}

pub async fn get_stats(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    match file_service.get_stats(None).await {
        Ok(stats) => Ok(Json(ApiResponse::success(stats, "获取成功"))),
        Err(e) => {
            error!("Failed to get stats: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::internal_error("获取失败")),
            ))
        }
    }
}

async fn has_file_access(db: &PgPool, claims: &Claims, metadata: &FileMetadata) -> bool {
    if claims.is_superuser {
        return true;
    }

    if is_file_owner(claims, metadata) {
        return true;
    }

    if metadata.visibility == "public" {
        return true;
    }

    if metadata.visibility == "department" {
        if let Some(dept_id) = &claims.department {
            if let Some(file_dept_id) = metadata.owner_department_id {
                if dept_id == &file_dept_id.to_string() {
                    return true;
                }
            }
        }
    }

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return false,
    };

    let permission_service = PermissionService::new(db.clone());
    permission_service.check_permission(metadata.id, user_id, None, crate::models::permission::Permission::Read).await.map(|r| r.allowed).unwrap_or(false)
}

fn is_file_owner(claims: &Claims, metadata: &FileMetadata) -> bool {
    match Uuid::parse_str(&claims.sub) {
        Ok(user_id) => metadata.owner_id == user_id,
        Err(_) => false,
    }
}