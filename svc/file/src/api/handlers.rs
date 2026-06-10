use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{AppendHeaders, IntoResponse, Response},
    Json,
};
use bytes::Bytes;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use std::sync::Arc;
use tracing::{debug, error, info};
use uuid::Uuid;

use crate::api::response::{ApiResponse, PagedResponse};
use crate::backends::local::LocalStorage;
use crate::models::file::{FileMetadata, ListFilesQuery, UploadFileRequest};
use crate::models::permission::{FilePermission, Permission, ShareFileRequest};
use crate::services::file_service::FileService;
use crate::services::permission_service::PermissionService;

/// 应用状态
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub storage: Arc<LocalStorage>,
}

/// 健康检查
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

/// 上传文件
pub async fn upload_file(
    State(state): State<AppState>,
    mut multipart: axum::extract::Multipart,
) -> impl IntoResponse {
    let mut file_data: Option<Vec<u8>> = None;
    let mut filename = String::new();
    let mut content_type = String::from("application/octet-stream");
    let mut category: Option<String> = None;
    let mut visibility: Option<String> = None;
    let mut external_id: Option<Uuid> = None;

    // 解析 multipart 数据
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
                // 使用流式读取，边收边传
                let data = match field.bytes().await {
                    Ok(d) => d.to_vec(),
                    Err(e) => {
                        error!("Error reading file data: {}", e);
                        return Err((
                            StatusCode::BAD_REQUEST,
                            Json(ApiResponse::<()>::bad_request("读取文件数据失败")),
                        ));
                    }
                };
                file_data = Some(data);

                // 猜测 content_type
                if let Some(ext) = std::path::Path::new(&filename).extension() {
                    content_type = mime_guess::from_ext(ext.to_str().unwrap_or(""))
                        .first_or_octet_stream()
                        .to_string();
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

    let data = match file_data {
        Some(d) => d,
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::<()>::bad_request("未提供文件")),
            ));
        }
    };

    // TODO: 从认证信息获取真实的 owner_id
    let owner_id = Uuid::nil();
    let owner_department_id = None;

    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    match file_service.upload_file(
        owner_id,
        owner_department_id,
        &filename,
        data,
        &content_type,
        external_id,
        None,
        category,
        visibility,
    ).await {
        Ok(metadata) => {
            info!("File uploaded successfully: {}", metadata.id);
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

/// 获取文件
pub async fn get_file(
    State(state): State<AppState>,
    Path(file_id): Path<Uuid>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    match file_service.get_file(file_id).await {
        Ok(Some(metadata)) => Ok(Json(ApiResponse::success(metadata, "获取成功"))),
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

/// 下载文件
pub async fn download_file(
    State(state): State<AppState>,
    Path(file_id): Path<Uuid>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

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

/// 删除文件
pub async fn delete_file(
    State(state): State<AppState>,
    Path(file_id): Path<Uuid>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

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

/// 列出文件
pub async fn list_files(
    State(state): State<AppState>,
    Query(query): Query<ListFilesQuery>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    match file_service.list_files(query.clone()).await {
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

/// 分享文件
pub async fn share_file(
    State(state): State<AppState>,
    Path(file_id): Path<Uuid>,
    Json(request): Json<ShareFileRequest>,
) -> impl IntoResponse {
    let permission_service = PermissionService::new(state.db.clone());

    // TODO: 从认证信息获取真实的 granted_by
    let granted_by = Uuid::nil();

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

/// 获取与我共享的文件
pub async fn get_shared_files(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let file_service = FileService::with_local_storage(
        state.db.clone(),
        state.storage.base_path(),
    ).unwrap();

    // TODO: 从认证信息获取真实的 user_id 和 department_id
    let user_id = Uuid::nil();
    let user_department_id = None;

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

/// 获取文件权限列表
pub async fn get_file_permissions(
    State(state): State<AppState>,
    Path(file_id): Path<Uuid>,
) -> impl IntoResponse {
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

/// 撤销分享权限
pub async fn revoke_permission(
    State(state): State<AppState>,
    Path((file_id, principal_type, principal_id, permission)): Path<(Uuid, String, Uuid, String)>,
) -> impl IntoResponse {
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

/// 获取文件统计
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
