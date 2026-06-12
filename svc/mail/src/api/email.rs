use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde_json::Value;
use uuid::Uuid;

use crate::models::{
    Email, EmailListParams, ResendEmailsRequest, SendEmailRequest, SendEmailWithTemplateRequest,
};
use crate::services::{check_permission, EmailService, MailPermission, TemplateService};
use topems_shared::{api_error, auth::Claims, ApiResponse, PaginatedResponse};

use super::ApiState;

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route("/api/v1/mail/emails", get(list_emails).post(send_email))
        .route(
            "/api/v1/mail/emails/send-with-template",
            post(send_email_with_template),
        )
        .route("/api/v1/mail/emails/resend", post(resend_emails))
        .route(
            "/api/v1/mail/emails/{id}",
            get(get_email).delete(delete_email),
        )
        .route("/api/v1/mail/emails/stats", get(get_email_stats));

    Ok(app)
}

async fn list_emails(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<EmailListParams>,
) -> Json<ApiResponse<PaginatedResponse<Email>>> {
    match check_permission(&state.db, &claims, &MailPermission::EmailRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let email_service = EmailService::new(state.db.clone());

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match email_service
        .list_emails(
            page,
            page_size,
            params.search,
            params.status,
            params.priority,
        )
        .await
    {
        Ok((emails, total)) => Json(ApiResponse::success(
            PaginatedResponse::new(emails, total, page, page_size),
            "获取邮件列表成功",
        )),
        Err(e) => {
            tracing::error!("获取邮件列表失败: {}", e);
            Json(api_error(500, "获取邮件列表失败"))
        }
    }
}

async fn get_email(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Email>> {
    match check_permission(&state.db, &claims, &MailPermission::EmailRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let email_service = EmailService::new(state.db.clone());

    match email_service.get_email(id).await {
        Some(email) => Json(ApiResponse::success(email, "获取邮件成功")),
        None => Json(api_error(404, "邮件不存在")),
    }
}

async fn send_email(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SendEmailRequest>,
) -> Json<ApiResponse<Email>> {
    match check_permission(&state.db, &claims, &MailPermission::EmailWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let email_service = EmailService::new(state.db.clone());

    match email_service.send_email(req).await {
        Ok(email) => Json(ApiResponse::success(email, "邮件发送成功")),
        Err(e) => {
            tracing::error!("发送邮件失败: {}", e);
            Json(api_error(500, &format!("发送邮件失败: {}", e)))
        }
    }
}

async fn send_email_with_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SendEmailWithTemplateRequest>,
) -> Json<ApiResponse<Email>> {
    match check_permission(&state.db, &claims, &MailPermission::EmailWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let email_service = EmailService::new(state.db.clone());
    let template_service = TemplateService::new(state.db.clone());

    let template = match template_service
        .get_template_by_code(&req.template_code)
        .await
    {
        Some(t) => t,
        None => return Json(api_error(404, "模板不存在")),
    };

    let (subject, body, body_html) =
        TemplateService::render_template(&template, &req.template_data);

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

    match email_service.send_email(send_req).await {
        Ok(email) => Json(ApiResponse::success(email, "邮件发送成功")),
        Err(e) => {
            tracing::error!("发送邮件失败: {}", e);
            Json(api_error(500, &format!("发送邮件失败: {}", e)))
        }
    }
}

async fn delete_email(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &MailPermission::EmailWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let email_service = EmailService::new(state.db.clone());

    match email_service.delete_email(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "邮件删除成功")),
        Ok(false) => Json(api_error(404, "邮件不存在")),
        Err(e) => {
            tracing::error!("删除邮件失败: {}", e);
            Json(api_error(500, "删除邮件失败"))
        }
    }
}

async fn resend_emails(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ResendEmailsRequest>,
) -> Json<ApiResponse<Value>> {
    match check_permission(&state.db, &claims, &MailPermission::EmailWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let email_service = EmailService::new(state.db.clone());

    let result = email_service.resend_emails(&req.email_ids).await;

    Json(ApiResponse::success(result, "批量重发完成"))
}

async fn get_email_stats(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Value>> {
    match check_permission(&state.db, &claims, &MailPermission::EmailRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let email_service = EmailService::new(state.db.clone());

    match email_service.get_email_stats().await {
        Ok(stats) => Json(ApiResponse::success(stats, "获取统计成功")),
        Err(e) => {
            tracing::error!("获取邮件统计失败: {}", e);
            Json(api_error(500, "获取邮件统计失败"))
        }
    }
}
