use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post},
    Json, Router,
};
use serde_json::Value;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{Email, EmailListParams, SendEmailRequest, SendEmailWithTemplateRequest};
use crate::services::{EmailService, TemplateService};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

pub struct AppState {
    pub email_service: EmailService,
    pub template_service: TemplateService,
}

pub async fn create_routes(db: PgPool) -> Router {
    let email_service = EmailService::new(db.clone());
    let template_service = TemplateService::new(db);
    
    let state = Arc::new(AppState {
        email_service,
        template_service,
    });

    Router::new()
        .route("/api/v1/mail/emails", get(list_emails).post(send_email))
        .route("/api/v1/mail/emails/send-with-template", post(send_email_with_template))
        .route("/api/v1/mail/emails/{id}", get(get_email).delete(delete_email))
        .with_state(state)
}

async fn list_emails(
    State(state): State<Arc<AppState>>,
    Query(params): Query<EmailListParams>,
) -> Json<ApiResponse<PaginatedResponse<Email>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match state.email_service.list_emails(
        page,
        page_size,
        params.search,
        params.status,
        params.priority,
    ).await {
        Ok((emails, total)) => {
            Json(ApiResponse::success(
                PaginatedResponse::new(emails, total, page, page_size),
                "获取邮件列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取邮件列表失败: {}", e);
            Json(api_error(500, "获取邮件列表失败"))
        }
    }
}

async fn get_email(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Email>> {
    match state.email_service.get_email(id).await {
        Some(email) => Json(ApiResponse::success(email, "获取邮件成功")),
        None => Json(api_error(404, "邮件不存在")),
    }
}

async fn send_email(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SendEmailRequest>,
) -> Json<ApiResponse<Email>> {
    match state.email_service.send_email(req).await {
        Ok(email) => Json(ApiResponse::success(email, "邮件发送成功")),
        Err(e) => {
            tracing::error!("发送邮件失败: {}", e);
            Json(api_error(500, &format!("发送邮件失败: {}", e)))
        }
    }
}

async fn send_email_with_template(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SendEmailWithTemplateRequest>,
) -> Json<ApiResponse<Email>> {
    let template = match state.template_service.get_template_by_code(&req.template_code).await {
        Some(t) => t,
        None => return Json(api_error(404, "模板不存在")),
    };

    let (subject, body, body_html) = TemplateService::render_template(&template, &req.template_data);

    let send_req = SendEmailRequest {
        subject,
        to_addresses: req.to_addresses,
        cc_addresses: req.cc_addresses,
        bcc_addresses: req.bcc_addresses,
        body,
        body_html,
        priority: req.priority,
        template_id: Some(template.id),
        template_data: Some(req.template_data),
    };

    match state.email_service.send_email(send_req).await {
        Ok(email) => Json(ApiResponse::success(email, "邮件发送成功")),
        Err(e) => {
            tracing::error!("发送邮件失败: {}", e);
            Json(api_error(500, &format!("发送邮件失败: {}", e)))
        }
    }
}

async fn delete_email(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match state.email_service.delete_email(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "邮件删除成功")),
        Ok(false) => Json(api_error(404, "邮件不存在")),
        Err(e) => {
            tracing::error!("删除邮件失败: {}", e);
            Json(api_error(500, "删除邮件失败"))
        }
    }
}
