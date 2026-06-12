use anyhow::Result;
use axum::{
    body::Body,
    extract::{Extension, Path, Query, State},
    http::{header::CONTENT_TYPE, StatusCode},
    response::Response,
    routing::get,
    Json, Router,
};
use std::path::PathBuf;
use uuid::Uuid;

use crate::api::ApiState;
use crate::models::{Attachment, AttachmentListItem, AttachmentParams};
use crate::services::{check_permission, MailPermission};
use topems_shared::{api_error, auth::Claims, ApiResponse};

#[allow(dead_code)]
const UPLOAD_DIR: &str = "./uploads/attachments";

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route("/api/v1/mail/attachments", get(list_attachments))
        .route(
            "/api/v1/mail/attachments/{id}",
            get(get_attachment).delete(delete_attachment),
        )
        .route(
            "/api/v1/mail/attachments/{id}/download",
            get(download_attachment),
        )
        .route(
            "/api/v1/mail/attachments/email/{email_id}",
            get(get_email_attachments),
        );

    Ok(app)
}

async fn list_attachments(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AttachmentParams>,
) -> Json<ApiResponse<Vec<AttachmentListItem>>> {
    match check_permission(&state.db, &claims, &MailPermission::AttachmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let attachments_result: Result<Vec<Attachment>, _> = sqlx::query_as(
        r#"
        SELECT id, email_id, filename, original_filename, file_path, file_size,
               content_type, created_by, created_at, updated_at
        FROM mail.attachments
        WHERE ($1::uuid IS NULL OR email_id = $1::uuid)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(params.email_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match attachments_result {
        Ok(attachments) => {
            let items: Vec<AttachmentListItem> =
                attachments.into_iter().map(|a| a.into()).collect();
            Json(ApiResponse::success(items, "获取成功"))
        }
        Err(e) => {
            tracing::error!("Failed to list attachments: {}", e);
            Json(api_error(500, "获取附件列表失败"))
        }
    }
}

async fn get_attachment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Attachment>> {
    match check_permission(&state.db, &claims, &MailPermission::AttachmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let attachment_result: Result<Option<Attachment>, _> = sqlx::query_as(
        r#"
        SELECT id, email_id, filename, original_filename, file_path, file_size,
               content_type, created_by, created_at, updated_at
        FROM mail.attachments
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match attachment_result {
        Ok(Some(att)) => Json(ApiResponse::success(att, "获取成功")),
        Ok(None) => Json(api_error(404, "附件不存在")),
        Err(e) => {
            tracing::error!("Failed to get attachment: {}", e);
            Json(api_error(500, "获取附件失败"))
        }
    }
}

async fn delete_attachment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    match check_permission(&state.db, &claims, &MailPermission::AttachmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // Get the attachment to find file path
    let attachment_result: Result<Option<Attachment>, _> = sqlx::query_as(
        r#"
        SELECT id, email_id, filename, original_filename, file_path, file_size,
               content_type, created_by, created_at, updated_at
        FROM mail.attachments
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let attachment = match attachment_result {
        Ok(Some(att)) => att,
        Ok(None) => return Json(api_error(404, "附件不存在")),
        Err(e) => {
            tracing::error!("Failed to get attachment: {}", e);
            return Json(api_error(500, "获取附件失败"));
        }
    };

    // Delete from database
    let delete_result = sqlx::query("DELETE FROM mail.attachments WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match delete_result {
        Ok(_) => {
            // Delete file from disk
            let file_path = PathBuf::from(&attachment.file_path);
            if file_path.exists() {
                if let Err(e) = std::fs::remove_file(&file_path) {
                    tracing::warn!("Failed to delete file {}: {}", file_path.display(), e);
                }
            }
            Json(ApiResponse::success((), "删除成功"))
        }
        Err(e) => {
            tracing::error!("Failed to delete attachment: {}", e);
            Json(api_error(500, "删除附件失败"))
        }
    }
}

async fn download_attachment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Response<Body> {
    if check_permission::<()>(&state.db, &claims, &MailPermission::AttachmentRead)
        .await
        .is_err()
    {
        return Response::builder()
            .status(StatusCode::FORBIDDEN)
            .body(Body::empty())
            .unwrap();
    }

    let attachment_result: Result<Option<Attachment>, _> = sqlx::query_as(
        r#"
        SELECT id, email_id, filename, original_filename, file_path, file_size,
               content_type, created_by, created_at, updated_at
        FROM mail.attachments
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let attachment = match attachment_result {
        Ok(Some(att)) => att,
        Ok(None) => {
            return Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::empty())
                .unwrap();
        }
        Err(_) => {
            return Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::empty())
                .unwrap();
        }
    };

    let file_path = PathBuf::from(&attachment.file_path);
    if !file_path.exists() {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::empty())
            .unwrap();
    }

    let content = match tokio::fs::read(&file_path).await {
        Ok(c) => c,
        Err(_) => {
            return Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::empty())
                .unwrap();
        }
    };

    Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, attachment.content_type)
        .body(Body::from(content))
        .unwrap()
}

async fn get_email_attachments(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(email_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<Attachment>>> {
    match check_permission(&state.db, &claims, &MailPermission::AttachmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let attachments_result: Result<Vec<Attachment>, _> = sqlx::query_as(
        r#"
        SELECT id, email_id, filename, original_filename, file_path, file_size,
               content_type, created_by, created_at, updated_at
        FROM mail.attachments
        WHERE email_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(email_id)
    .fetch_all(&state.db)
    .await;

    match attachments_result {
        Ok(attachments) => Json(ApiResponse::success(attachments, "获取成功")),
        Err(e) => {
            tracing::error!("Failed to get email attachments: {}", e);
            Json(api_error(500, "获取邮件附件失败"))
        }
    }
}
