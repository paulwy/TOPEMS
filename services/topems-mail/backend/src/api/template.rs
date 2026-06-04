use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde_json::Value;
use uuid::Uuid;

use crate::models::{
    CreateTemplateRequest, EmailTemplate, RenderTemplateRequest, TemplateListParams,
    UpdateTemplateRequest, UpdateTemplateStatusRequest,
};
use crate::services::{check_permission, TemplateService, MailPermission};
use topems_shared::{api_error, ApiResponse, PaginatedResponse, auth::Claims};

use super::ApiState;

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route("/api/v1/mail/templates", get(list_templates).post(create_template))
        .route("/api/v1/mail/templates/render", post(render_template))
        .route("/api/v1/mail/templates/{id}", get(get_template).put(update_template).delete(delete_template))
        .route("/api/v1/mail/templates/{id}/status", put(update_template_status));

    Ok(app)
}

async fn list_templates(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TemplateListParams>,
) -> Json<ApiResponse<PaginatedResponse<EmailTemplate>>> {
    match check_permission(&state.db, &claims, &MailPermission::TemplateRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let template_service = TemplateService::new(state.db.clone());
    
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    match template_service
        .list_templates(page, page_size, params.search, params.category, params.status)
        .await
    {
        Ok((templates, total)) => Json(ApiResponse::success(
            PaginatedResponse::new(templates, total, page, page_size),
            "获取模板列表成功",
        )),
        Err(e) => {
            tracing::error!("获取模板列表失败: {}", e);
            Json(api_error(500, "获取模板列表失败"))
        }
    }
}

async fn get_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<EmailTemplate>> {
    match check_permission(&state.db, &claims, &MailPermission::TemplateRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let template_service = TemplateService::new(state.db.clone());
    
    match template_service.get_template(id).await {
        Some(template) => Json(ApiResponse::success(template, "获取模板成功")),
        None => Json(api_error(404, "模板不存在")),
    }
}

async fn create_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTemplateRequest>,
) -> Json<ApiResponse<EmailTemplate>> {
    match check_permission(&state.db, &claims, &MailPermission::TemplateWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let template_service = TemplateService::new(state.db.clone());
    
    match template_service
        .create_template(
            req.code,
            req.name,
            req.description,
            req.subject_template,
            req.body_template,
            req.body_html_template,
            req.category,
            req.tags,
        )
        .await
    {
        Ok(template) => Json(ApiResponse::success(template, "模板创建成功")),
        Err(e) => {
            tracing::error!("创建模板失败: {}", e);
            Json(api_error(500, "创建模板失败"))
        }
    }
}

async fn update_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Json<ApiResponse<EmailTemplate>> {
    match check_permission(&state.db, &claims, &MailPermission::TemplateWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let template_service = TemplateService::new(state.db.clone());
    
    match template_service
        .update_template(
            id,
            req.name,
            req.description,
            req.subject_template,
            req.body_template,
            req.body_html_template,
            req.category,
            req.tags,
            req.status,
        )
        .await
    {
        Ok(template) => Json(ApiResponse::success(template, "模板更新成功")),
        Err(e) => {
            tracing::error!("更新模板失败: {}", e);
            Json(api_error(500, "更新模板失败"))
        }
    }
}

async fn delete_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &MailPermission::TemplateWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let template_service = TemplateService::new(state.db.clone());
    
    match template_service.delete_template(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "模板删除成功")),
        Ok(false) => Json(api_error(404, "模板不存在")),
        Err(e) => {
            tracing::error!("删除模板失败: {}", e);
            Json(api_error(500, "删除模板失败"))
        }
    }
}

async fn render_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<RenderTemplateRequest>,
) -> Json<ApiResponse<Value>> {
    match check_permission(&state.db, &claims, &MailPermission::TemplateRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let template_service = TemplateService::new(state.db.clone());
    
    let template = match template_service.get_template_by_code(&req.template_code).await {
        Some(t) => t,
        None => return Json(api_error(404, "模板不存在")),
    };

    let (subject, body, body_html) = TemplateService::render_template(&template, &req.data);

    let result = serde_json::json!({
        "subject": subject,
        "body": body,
        "body_html": body_html,
    });

    Json(ApiResponse::success(result, "模板渲染成功"))
}

async fn update_template_status(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTemplateStatusRequest>,
) -> Json<ApiResponse<EmailTemplate>> {
    match check_permission(&state.db, &claims, &MailPermission::TemplateWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let template_service = TemplateService::new(state.db.clone());
    
    match template_service
        .update_template_status(id, &req.status)
        .await
    {
        Ok(template) => Json(ApiResponse::success(template, "模板状态更新成功")),
        Err(e) => {
            tracing::error!("更新模板状态失败: {}", e);
            Json(api_error(500, "更新模板状态失败"))
        }
    }
}
