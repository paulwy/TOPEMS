use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use uuid::Uuid;

use crate::{
    api::response::{ApiError, ApiResponse},
    db::repository::{TemplateCategoryRepository, TemplateRepository},
    models::{
        CreateTemplateRequest, ListTemplatesQuery, ListTemplatesResponse, Template,
        TemplateCategoryResponse, TemplateResponse, UpdateTemplateRequest,
    },
    services::template_render_service::TemplateRenderService,
};

#[derive(Clone)]
pub struct TemplateState {
    pub template_repo: TemplateRepository,
    pub category_repo: TemplateCategoryRepository,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RenderTemplateRequest {
    pub variables: HashMap<String, Value>,
}

#[derive(Debug, Serialize)]
pub struct RenderTemplateResponse {
    pub content: String,
    pub missing_variables: Vec<String>,
}

pub async fn create_template(
    State(state): State<TemplateState>,
    Json(req): Json<CreateTemplateRequest>,
) -> Result<Json<ApiResponse<Template>>, ApiError> {
    tracing::debug!("Creating template: {:?}", req);

    let now = Utc::now();
    let id = Uuid::new_v4();

    let template = Template {
        id,
        name: req.name,
        code: req.code,
        template_type: req.template_type,
        category_id: req.category_id,
        module: req.module,
        description: req.description,
        content: req.content,
        variables: req.variables,
        is_active: req.is_active.or(Some(true)),
        is_system: Some(false),
        is_public: req.is_public.or(Some(false)),
        ai_enabled: req.ai_enabled.or(Some(false)),
        version: Some(1),
        sort_order: req.sort_order.or(Some(0)),
        view_count: Some(0),
        use_count: Some(0),
        created_at: now,
        updated_at: now,
        created_by: Some("admin".to_string()),
    };

    let created_template = state
        .template_repo
        .create(&template)
        .await
        .map_err(|e| {
            tracing::error!("Error creating template: {:?}", e);
            ApiError::InternalError
        })?;

    Ok(Json(ApiResponse::success(created_template, "模板创建成功")))
}

pub async fn list_templates(
    State(state): State<TemplateState>,
    Query(query): Query<ListTemplatesQuery>,
) -> Result<Json<ApiResponse<ListTemplatesResponse>>, ApiError> {
    tracing::debug!("Listing templates with query: {:?}", query);

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    let limit = page_size as i64;
    let offset = ((page - 1) * page_size) as i64;

    let (templates, total) = state
        .template_repo
        .list(
            query.search.as_deref(),
            query.category.as_deref(),
            query.module.as_deref(),
            query.template_type.as_deref(),
            query.is_active,
            query.is_public,
            limit,
            offset,
        )
        .await
        .map_err(|e| {
            tracing::error!("Error listing templates: {:?}", e);
            ApiError::InternalError
        })?;

    let mut items = Vec::new();
    for template in templates {
        let enriched = enrich_template(&state, template).await;
        items.push(enriched);
    }

    Ok(Json(ApiResponse::success(
        ListTemplatesResponse {
            items,
            total,
            page,
            page_size,
        },
        "获取模板列表成功",
    )))
}

pub async fn get_template(
    State(state): State<TemplateState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<TemplateResponse>>, ApiError> {
    tracing::debug!("Getting template: {}", id);

    let template = state
        .template_repo
        .find_by_id(id)
        .await
        .map_err(|e| {
            tracing::error!("Error getting template: {:?}", e);
            ApiError::InternalError
        })?
        .ok_or(ApiError::NotFound)?;

    let _ = state.template_repo.increment_view_count(id).await;

    let enriched = enrich_template(&state, template).await;

    Ok(Json(ApiResponse::success(enriched, "获取模板成功")))
}

pub async fn update_template(
    State(state): State<TemplateState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Result<Json<ApiResponse<Template>>, ApiError> {
    tracing::debug!("Updating template: {}", id);

    let existing = state
        .template_repo
        .find_by_id(id)
        .await
        .map_err(|e| {
            tracing::error!("Error getting template: {:?}", e);
            ApiError::InternalError
        })?
        .ok_or(ApiError::NotFound)?;

    let now = Utc::now();
    let current_version = existing.version.unwrap_or(1);

    let template = Template {
        id,
        name: req.name.unwrap_or(existing.name),
        code: req.code.unwrap_or(existing.code),
        template_type: req.template_type.or(existing.template_type),
        category_id: req.category_id.or(existing.category_id),
        module: req.module.or(existing.module),
        description: req.description.or(existing.description),
        content: req.content.unwrap_or(existing.content),
        variables: req.variables.or(existing.variables),
        is_active: req.is_active.or(existing.is_active),
        is_system: existing.is_system,
        is_public: req.is_public.or(existing.is_public),
        ai_enabled: req.ai_enabled.or(existing.ai_enabled),
        version: Some(current_version),
        sort_order: req.sort_order.or(existing.sort_order),
        view_count: existing.view_count,
        use_count: existing.use_count,
        created_at: existing.created_at,
        updated_at: now,
        created_by: existing.created_by,
    };

    let updated = state
        .template_repo
        .update(id, &template)
        .await
        .map_err(|e| {
            tracing::error!("Error updating template: {:?}", e);
            ApiError::InternalError
        })?
        .ok_or(ApiError::NotFound)?;

    Ok(Json(ApiResponse::success(updated, "模板更新成功")))
}

pub async fn delete_template(
    State(state): State<TemplateState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, ApiError> {
    tracing::debug!("Deleting template: {}", id);

    let template = state
        .template_repo
        .find_by_id(id)
        .await
        .map_err(|e| {
            tracing::error!("Error getting template: {:?}", e);
            ApiError::InternalError
        })?;

    if let Some(t) = template {
        if t.is_system.unwrap_or(false) {
            return Err(ApiError::BadRequest("系统模板不能删除".to_string()));
        }
    }

    let deleted = state.template_repo.delete(id).await.map_err(|e| {
        tracing::error!("Error deleting template: {:?}", e);
        ApiError::InternalError
    })?;

    if !deleted {
        return Err(ApiError::NotFound);
    }

    Ok(Json(ApiResponse::ok("模板删除成功")))
}

pub async fn duplicate_template(
    State(state): State<TemplateState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Template>>, ApiError> {
    tracing::debug!("Duplicating template: {}", id);

    let original = state
        .template_repo
        .find_by_id(id)
        .await
        .map_err(|e| {
            tracing::error!("Error getting template: {:?}", e);
            ApiError::InternalError
        })?
        .ok_or(ApiError::NotFound)?;

    let now = Utc::now();
    let new_id = Uuid::new_v4();

    let duplicated = Template {
        id: new_id,
        name: format!("{} (副本)", original.name),
        code: format!("{}_copy", original.code),
        template_type: original.template_type,
        category_id: original.category_id,
        module: original.module,
        description: original.description,
        content: original.content,
        variables: original.variables,
        is_active: Some(true),
        is_system: Some(false),
        is_public: Some(false),
        ai_enabled: original.ai_enabled,
        version: Some(1),
        sort_order: original.sort_order,
        view_count: Some(0),
        use_count: Some(0),
        created_at: now,
        updated_at: now,
        created_by: Some("admin".to_string()),
    };

    let created = state
        .template_repo
        .create(&duplicated)
        .await
        .map_err(|e| {
            tracing::error!("Error duplicating template: {:?}", e);
            ApiError::InternalError
        })?;

    Ok(Json(ApiResponse::success(created, "模板复制成功")))
}

pub async fn toggle_template_status(
    State(state): State<TemplateState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Template>>, ApiError> {
    tracing::debug!("Toggling template status: {}", id);

    let template = state
        .template_repo
        .find_by_id(id)
        .await
        .map_err(|e| {
            tracing::error!("Error getting template: {:?}", e);
            ApiError::InternalError
        })?
        .ok_or(ApiError::NotFound)?;

    let new_status = !template.is_active.unwrap_or(true);
    let now = Utc::now();

    let updated = Template {
        id,
        name: template.name,
        code: template.code,
        template_type: template.template_type,
        category_id: template.category_id,
        module: template.module,
        description: template.description,
        content: template.content,
        variables: template.variables,
        is_active: Some(new_status),
        is_system: template.is_system,
        is_public: template.is_public,
        ai_enabled: template.ai_enabled,
        version: template.version,
        sort_order: template.sort_order,
        view_count: template.view_count,
        use_count: template.use_count,
        created_at: template.created_at,
        updated_at: now,
        created_by: template.created_by,
    };

    let result = state
        .template_repo
        .update(id, &updated)
        .await
        .map_err(|e| {
            tracing::error!("Error updating template status: {:?}", e);
            ApiError::InternalError
        })?
        .ok_or(ApiError::NotFound)?;

    let message = if new_status {
        "模板已启用"
    } else {
        "模板已禁用"
    };

    Ok(Json(ApiResponse::success(result, message)))
}

pub async fn render_template(
    State(state): State<TemplateState>,
    Path(id): Path<Uuid>,
    Json(req): Json<RenderTemplateRequest>,
) -> Result<Json<ApiResponse<RenderTemplateResponse>>, ApiError> {
    tracing::debug!("Rendering template: {}", id);

    let template = state
        .template_repo
        .find_by_id(id)
        .await
        .map_err(|e| {
            tracing::error!("Error getting template: {:?}", e);
            ApiError::InternalError
        })?
        .ok_or(ApiError::NotFound)?;

    let _ = state.template_repo.increment_use_count(id).await;

    let content = TemplateRenderService::render(&template.content, &req.variables);
    let missing_variables = TemplateRenderService::extract_variables(&template.content)
        .into_iter()
        .filter(|v| !req.variables.contains_key(v))
        .collect();

    Ok(Json(ApiResponse::success(
        RenderTemplateResponse {
            content,
            missing_variables,
        },
        "模板渲染成功",
    )))
}

pub async fn list_template_categories(
    State(state): State<TemplateState>,
    Query(query): Query<ListTemplatesQuery>,
) -> Result<Json<ApiResponse<Vec<TemplateCategoryResponse>>>, ApiError> {
    tracing::debug!("Listing template categories");

    let categories = state
        .category_repo
        .list(query.is_active, query.template_type.as_deref())
        .await
        .map_err(|e| {
            tracing::error!("Error listing template categories: {:?}", e);
            ApiError::InternalError
        })?;

    let responses = categories
        .into_iter()
        .map(|cat| TemplateCategoryResponse {
            id: cat.id,
            name: cat.name,
            code: cat.code,
            category_type: cat.category_type,
            icon: cat.icon,
            description: cat.description,
            template_count: 0,
            is_active: cat.is_active.unwrap_or(true),
        })
        .collect();

    Ok(Json(ApiResponse::success(responses, "获取模板分类列表成功")))
}

async fn enrich_template(state: &TemplateState, template: Template) -> TemplateResponse {
    let category_name = if let Some(cat_id) = template.category_id {
        state
            .category_repo
            .find_by_id(cat_id)
            .await
            .ok()
            .flatten()
            .map(|c| c.name)
    } else {
        None
    };

    TemplateResponse {
        id: template.id,
        name: template.name,
        code: template.code,
        template_type: template.template_type.unwrap_or_else(|| "document".to_string()),
        category_id: template.category_id,
        category_name,
        module: template.module,
        description: template.description,
        content: template.content,
        variables: template
            .variables
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default(),
        is_active: template.is_active.unwrap_or(true),
        is_system: template.is_system.unwrap_or(false),
        is_public: template.is_public.unwrap_or(false),
        ai_enabled: template.ai_enabled.unwrap_or(false),
        version: template.version.unwrap_or(1),
        view_count: template.view_count.unwrap_or(0),
        use_count: template.use_count.unwrap_or(0),
        created_at: template.created_at,
        updated_at: template.updated_at,
        created_by: template.created_by,
    }
}